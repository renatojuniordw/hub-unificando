---
title: "De comentário a DM: automatizando o Instagram com n8n e a Graph API"
description: "Como um fluxo n8n detecta comentários públicos no Instagram, responde automaticamente e ainda dispara uma DM de follow-up usando a Graph API — arquitetura real de um agente de atendimento em produção."
date: "2026-07-16"
tags:
  - n8n
  - Instagram Graph API
  - Automação
  - IA
readingTime: "6 min"
---

## O problema

Alguém comenta "quanto custa?" em um post do Instagram. Se você só responde o comentário, a conversa de vendas fica pública e não vai a lugar nenhum. Se você manda uma DM manualmente, não escala — e alguém precisa ficar de olho nos comentários o dia inteiro.

O que eu queria: **responder o comentário publicamente** (mantém o engajamento visível para o algoritmo) **e, ao mesmo tempo, abrir uma DM automática** com a pessoa, puxando a conversa de vendas para o privado. Tudo isso sem um humano precisar tocar em nada até o lead responder.

É esse fluxo — construído em n8n, rodando em produção — que vou destrinchar aqui.

## Visão geral do fluxo

```
Meta Webhook (DM ou Comentário)
        │
        ▼
Detectar tipo de evento (código JS)
        │
   ┌────┴────┐
   │         │
  DM      Comentário
   │         │
   │         ▼
   │   Buscar permalink do post (Graph API)
   │         │
   │         ▼
   │   Buscar resposta configurada (Google Sheets)
   │         │
   │         ▼
   │   Filtrar: é comentário de terceiro? (não é eco do próprio bot)
   │         │
   │    ┌────┴────┐
   │    ▼         ▼
   │  Responder   Enviar DM de
   │  comentário  follow-up
   │  (Graph API) (Graph API)
   │
   ▼
Roteador de DM (buffer + preço + LLM)
```

Um único webhook recebe **tudo** que a Meta manda para a página — DMs e comentários chegam no mesmo payload, e o primeiro trabalho do fluxo é descobrir qual é qual.

## Passo 1: diferenciar DM de comentário

O webhook do Instagram (via Meta for Developers) manda eventos de `messaging` (DMs) e de `changes` com `field: "comments"` no mesmo formato de payload. Um nó de código separa os dois logo na entrada:

```javascript
const payload = $json?.body ?? $json;

const isComment =
  payload?.object === 'instagram' &&
  Array.isArray(payload?.entry) &&
  payload.entry.some(
    (e) =>
      Array.isArray(e?.changes) &&
      e.changes.some((c) => c?.field === 'comments')
  );

const isDirectMessage =
  payload?.object === 'instagram' &&
  Array.isArray(payload?.entry) &&
  payload.entry.some((e) => Array.isArray(e?.messaging));

let eventType = 'unknown';
if (isComment) eventType = 'comment';
if (isDirectMessage) eventType = 'dm';

return [{ json: { eventType, platform: 'instagram', pageId: payload.entry[0]?.id ?? null } }];
```

A partir daqui, um `IF` simples decide a rota: `eventType !== 'comment'` segue para o roteador de DM (que trata buffer de mensagens, preços e o agente LLM — assunto para outro post); `eventType === 'comment'` segue para o fluxo que vamos detalhar.

> **Antes de tudo isso**, o endpoint também precisa responder ao handshake de verificação da Meta: um `GET` com `hub.challenge` na query string, que o webhook devolve como texto puro. Sem isso, a Meta nunca ativa as notificações.

## Passo 2: evitar loop infinito

Quando você responde um comentário via API, a própria resposta **também chega como um novo evento de comentário** no seu webhook. Sem tratar isso, o bot responderia à própria resposta — para sempre.

A correção é comparar o `sender_id` do comentário com o ID da própria página:

```javascript
// FILTER | External Instagram Comments Only
sender_id !== myId  AND  field === "comments"
```

Só passam adiante comentários de gente de fora. E, por segurança extra, o fluxo também trava logo na entrada: só processa eventos cujo `pageId` bate com o ID da própria página do Instagram — descarta qualquer payload de outra conta que eventualmente bata no mesmo endpoint.

## Passo 3: descobrir em qual post o comentário caiu

O payload do comentário traz o `media.id`, mas não a URL do post. Para saber *qual* resposta usar, o fluxo busca o permalink direto na Graph API:

```
GET https://graph.instagram.com/v24.0/{media-id}?fields=permalink
```

## Passo 4: a planilha como "CMS" das respostas

Em vez de hardcodar as respostas no fluxo (e precisar mexer no n8n toda vez que um post novo sai), a configuração vive em uma planilha do Google Sheets com uma linha por post: `post_url`, `comment_reply` (a resposta pública) e `dm_text` (o texto da DM de follow-up).

O fluxo casa o permalink do comentário com a URL da planilha extraindo o código do post (o trecho entre `/p/.../`):

```javascript
// FILTER | Match Instagram Post by Permalink
permalink.match(/\/p\/([^\/]+)/)[1] === post_url.match(/\/p\/([^\/]+)/)[1]
```

Isso significa que quem cuida do conteúdo consegue trocar a resposta de um post **sem tocar no workflow** — só edita a planilha.

## Passo 5: responder o comentário publicamente

Com o texto certo em mãos, o fluxo chama o endpoint de replies do comentário:

```
POST https://graph.instagram.com/v24.0/{comment-id}/replies
Body: message = <comment_reply da planilha>
```

Isso aparece como uma resposta pública normal, visível para qualquer um que veja o post.

## Passo 6: a parte interessante — DM automática a partir do comentário

Aqui está o truque que faz o fluxo valer a pena: a Graph API permite abrir uma conversa por DM **referenciando o `comment_id`**, mesmo que a pessoa nunca tenha mandado mensagem para a página antes:

```
POST https://graph.instagram.com/v24.0/me/messages
{
  "recipient": { "comment_id": "<id-do-comentário>" },
  "message": { "text": "<dm_text da planilha>" }
}
```

Isso é o que a Meta chama de **private replies** / mensagem iniciada por comentário — funciona dentro de uma janela de alguns dias após o comentário, e é justamente essa permissão que transforma um comentário público num lead na caixa de entrada, sem a pessoa precisar tomar nenhuma ação.

## Cuidados na hora de implementar

- **Janela de tempo**: a Graph API só permite abrir a DM por `comment_id` dentro de um prazo limitado após o comentário (poucos dias). Passado esse prazo, a chamada falha — trate o erro em vez de deixar o fluxo quebrar silenciosamente.
- **Loop de auto-resposta**: sem o filtro de `sender_id`, seu próprio bot vai conversar com ele mesmo. Teste isso especificamente antes de ativar em produção.
- **Escopo de permissão**: o app precisa das permissões `instagram_manage_comments` e `instagram_manage_messages` aprovadas no App Review da Meta — isso não é imediato, planeje o tempo de aprovação.
- **Rate limits**: a Graph API tem limites por app/página; em campanhas com pico de comentários, vale enfileirar em vez de disparar tudo em paralelo.
- **Multi-tenant**: se você reusa esse fluxo para mais de uma página/cliente, o filtro de `pageId` na entrada e a segregação da planilha por conta são obrigatórios — sem isso, uma página processa eventos da outra.

## Resultado

Um comentário de "quanto custa?" vira, em segundos e sem intervenção humana: uma resposta pública (mantendo o engajamento do post) **e** uma DM privada abrindo a conversa comercial — que cai direto no roteador de atendimento (buffer + FAQ + agente de preços) que trato em outro momento.
