---
title: "Engenharia de prompt no terminal: de ideia crua a prompt de engenheiro com um pipe"
description: "Para quem vive no terminal, copiar/colar system prompt em chat é perder tempo. Conheça um CLI via npx que monta o prompt de Engenheiro de Prompt no stdout, pronto para pipe em Claude Code e Gemini CLI — com contexto de projeto e persistência em .md."
date: "2026-09-02"
tags:
  - IA
  - Prompt Engineering
  - CLI
  - Node.js
readingTime: "4 min"
---

## O problema não é o prompt, é o fluxo

No post [Por que seu prompt não funciona](/blog/por-que-seu-prompt-nao-funciona), o método é conversacional: você cola um system prompt no chat, manda o rascunho, a IA faz perguntas, vocês refinam junto. Funciona para qualquer pessoa, em qualquer ferramenta.

Mas se você vive no terminal, esse fluxo tem um custo que ninguém fala: **trocar de janela**. Copiar o prompt-base, colar no chat, copiar o rascunho, colar de novo, esperar, copiar o resultado, voltar. Repetir a cada prompt novo.

Desenvolvedor resolve repetição com composição. E composição no terminal tem um nome: **pipe**.

## O padrão UNIX aplicado a prompt

Em vez de um chat que guarda estado, o contrato é simples: **texto entra, texto sai, no stdout**. Um CLI recebe sua ideia crua, monta o prompt de Engenheiro de Prompt em cima dela e imprime o resultado — pronto para ser pipado para qualquer CLI de LLM.

```bash
npx promptcraft-unificando "quero um prompt pra gerar resumo de reunião" | claude
```

O mesmo vale para o Gemini CLI:

```bash
npx promptcraft-unificando "gera os testes unitários dessa função de pagamento" | gemini
```

Sem instalação, sem configuração, sem sair do terminal. O pacote só imprime texto no stdout — quem interpreta esse texto é o LLM de destino.

## Contexto do projeto quando você precisa

Prompt solto funciona para ideias gerais. Mas quando o prompt depende do código que está na sua frente, o CLI aceita um modo de projeto:

```bash
npx promptcraft-unificando --project "refatora esse componente seguindo o padrão do repositório"
```

Com `--project`, o template ativa um bloco `<arquitetura>` que instrui o LLM de destino a explorar a arquitetura do projeto atual antes de gerar o prompt. O contexto certo chega junto com a instrução, sem você precisar colar árvore de diretórios na mão.

## Persistindo o resultado

Nem sempre você quer executar na hora. O modo `--save` inverte o fluxo: em vez de gerar, ele lê o stdin e salva o resultado como `.md` no diretório atual.

```bash
npx promptcraft-unificando --save --title "resumo-de-reuniao"
# cola o texto que o LLM de destino gerou, Ctrl+D pra confirmar
```

Com `--title` você controla o nome do arquivo. O resultado vira um artefato versionável no repositório — prompt tratado como código, não como conversa perdida.

## Compatibilidade com CLIs de LLM

O pacote só imprime texto no stdout. Como esse texto chega até o LLM depende de cada CLI aceitar entrada via pipe:

| CLI | Comando | Aceita pipe? | Status |
|-----|---------|--------------|--------|
| Claude Code | `claude` | Sim | Validado |
| Gemini CLI | `gemini` | Sim | Validado |
| Outras CLIs | — | — | Fallback: copiar e colar |

Para qualquer CLI ou chat web, o fallback universal continua funcionando — o comando imprime o prompt pronto, e você cola onde quiser.

## Por que isso importa

- **Reprodutível** — o mesmo comando gera o mesmo prompt-base toda vez, sem drift de "eu mudei uma frase sem querer"
- **Versionável** — com `--save`, o prompt vira arquivo no repositório, revisável em PR
- **Componível** — stdout como contrato significa que dá para encadear com qualquer ferramenta do terminal
- **Rápido** — zero troca de contexto, zero copiar/colar

É o mesmo princípio de qualquer ferramenta UNIX: uma ferramenta que faz uma coisa bem, e se conecta com as outras pelo texto.

## Na prática

```bash
# prompt solto
npx promptcraft-unificando "sua ideia crua" | claude

# com contexto de arquitetura
npx promptcraft-unificando --project "sua ideia" | gemini

# salvando como artefato
npx promptcraft-unificando --save --title "meu-prompt"
```

Publicado no npm, sem dependências, licença MIT. O código está no [GitHub](https://github.com/renatojuniordw/promptcraft-unificando), o pacote no [npm](https://www.npmjs.com/package/promptcraft-unificando), e o case completo com a arquitetura está no [portfólio](/projetos/promptcraft-unificando).

Se o seu fluxo é conversacional e você prefere o chat, o método do post anterior continua valendo — a diferença é que agora você tem a opção de não sair do terminal.