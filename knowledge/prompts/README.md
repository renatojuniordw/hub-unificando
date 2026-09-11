# Prompts Unificando

[![npm version](https://img.shields.io/npm/v/@unificando/prompts.svg)](https://www.npmjs.com/package/@unificando/prompts)
[![npm downloads](https://img.shields.io/npm/dm/@unificando/prompts.svg)](https://www.npmjs.com/package/@unificando/prompts)
[![license](https://img.shields.io/npm/l/@unificando/prompts.svg)](./LICENSE)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-%40unificando%2Fprompts-2b3137?logo=github)](https://github.com/Unificando/prompts/pkgs/npm/prompts)

Biblioteca de prompts padronizados para auditoria, refatoração, testes, segurança/LGPD e revisão de copy. Agnóstica de stack e de LLM — funciona com Claude, ChatGPT, Gemini ou qualquer outro modelo, em qualquer IDE.

## Instalação

Nenhuma instalação é necessária — use via `npx` (requer Node.js 18+):

```bash
npx @unificando/prompts list
npx @unificando/prompts get <id>
npx @unificando/prompts get <id> --copy
```

`list` mostra os prompts disponíveis. `get <id>` imprime o conteúdo no terminal; `--copy` envia direto para a área de transferência, pronto para colar em qualquer chat de IA.

Instalação global opcional expõe o comando `unificando-prompts`:

```bash
npm install -g @unificando/prompts
unificando-prompts list
```

### Instalar pelo GitHub Packages

O pacote também é publicado no [GitHub Packages da organização](https://github.com/Unificando/prompts/pkgs/npm/prompts), com o mesmo nome `@unificando/prompts`, conteúdo e versão. Para puxá-lo de lá em vez do npmjs.com, autentique o registry do GitHub num `.npmrc` (na home ou no projeto):

```
@unificando:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=SEU_GITHUB_TOKEN
```

O token precisa do escopo `read:packages`. Para uso rápido sem autenticar, prefira o `npx @unificando/prompts` do npmjs.com acima.

## Prompts disponíveis

| ID | Escopo | Edita código |
| --- | --- | --- |
| `frontend` | React/Next.js — código morto, duplicação, performance, tratamento de erros, acessibilidade e SEO | Sim |
| `fullstack` | Next.js full-stack — integração front-back, validação e segurança end-to-end, performance | Sim |
| `backend` | NestJS — arquitetura, banco de dados, segurança OWASP, escalabilidade, documentação de API | Sim |
| `testes` | Cobertura de testes real, qualquer stack — mapeamento de regras de negócio, reconciliação de testes existentes; modo arquivo único para testar só um componente/arquivo | Sim (gera testes) |
| `setup-e2e` | Bootstrap de stack E2E (Playwright) — instalação, configuração, estrutura de pastas (e2e/, e2e/pages/, e2e/fixtures/) e smoke test inicial | Sim |
| `auditoria-testid` | Auditoria/aplicação de `data-testid` — convenção única e seletor estável em todo o app | Sim (aditivo) |
| `testes-e2e` | Geração/expansão disciplinada da suíte E2E — elegibilidade, jornadas (happy path + falha obrigatória), reconciliação e anti-flakiness; modo arquivo único para cobrir só os fluxos de um componente | Sim (gera specs) |
| `ci-e2e` | Pipeline CI para a suíte E2E existente — estratégia de execução, cache, artefatos de falha | Não — patch proposto |
| `auditoria-engenharia` | Diagnóstico de qualidade de código (SOLID, código morto, dependências não usadas) | Não — somente leitura |
| `auditoria-seguranca` | Segurança (OWASP), conformidade LGPD, checklist de deploy e módulos de ataque (secrets, autenticação, banco de dados, input, bomba de custo) | Não — somente leitura |
| `revisao-copy` | Ortografia, gramática e UX copy voltados ao usuário final | Só texto, nunca lógica |
| `refatoracao-faseada` | Pipeline autônomo de 10 fases (agnóstico de stack) — detecção automática, gates de build/lint/test e patch reversível por fase | Sim (sob contrato: sem commit/push) |
| `seo` | SEO técnico e de conteúdo — crawlability, indexação, Core Web Vitals (sinais estruturais), marcação estruturada, thin content, linkagem interna | Não — somente leitura |
| `agents` | Criação do AGENTS.md padronizado — guia de trabalho para agentes de IA a partir do README, com comandos reais, regras universais da biblioteca e guia dos prompts aplicáveis (PROMPT 2 revisa/reconcilia o existente) | Sim (só AGENTS.md) |
| `pipeline` | Orquestrador do fluxo completo — plano personalizado por projeto, gates de triagem/revisão e retomada entre sessões (executa os outros prompts fase a fase) | Sim — via prompts filhos |

## Como escolher

- **Não sabe onde estão os problemas?** Comece por `auditoria-engenharia`.
- **Vai para produção ou lida com dados pessoais?** Rode `auditoria-seguranca` antes do deploy — e, para a varredura ofensiva completa, execute o PROMPT 2 do mesmo prompt na sequência (secrets, autenticação, banco de dados, input, custo).
- **Projeto React/Next.js sem backend próprio?** Use `frontend`.
- **Next.js com API Routes no mesmo repositório?** Use `fullstack` (e `frontend` se quiser focar só na camada visual).
- **Backend NestJS em repositório separado?** Use `backend`.
- **Já refatorou e quer cobertura de testes real?** Use `testes` — rode por último, depois da arquitetura estabilizar.
- **Quer testar só um arquivo/componente?** Cite o caminho ou nome no pedido ao usar `testes` (ou `testes-e2e`) — o modo arquivo único restringe o pipeline ao alvo e atualiza os artefatos (`business-rules.md`, relatórios) só na seção dele.
- **Quer uma cadeia completa de testes E2E?** Rode em ordem: `setup-e2e` (bootstrap, só projeto sem stack E2E) → `auditoria-testid` (seletor estável) → `testes-e2e` (specs consistentes) → `ci-e2e` (pipeline no CI).
- **Gerou ou revisou copy com IA?** Use `revisao-copy` a qualquer momento.
- **Quer que o agente execute a refatoração sozinho, com gates e rollback por fase, em vez de só sugerir?** Use `refatoracao-faseada` — cobre código morto, duplicação, arquitetura, integração, segurança, performance, erros, a11y/SEO e testes em um único pipeline autônomo.
- **Quer um raio-x de SEO técnico e de conteúdo antes de lançar ou depois de uma migração?** Use `seo` — read-only, com plano de ação priorizado.
- **Quer padronizar como agentes de IA trabalham no seu projeto?** Use `agents` — gera o AGENTS.md na raiz a partir do README, com comandos reais, regras de trabalho destiladas da biblioteca e o guia dos prompts aplicáveis à stack. Já tem AGENTS.md? Rode o PROMPT 2 do mesmo prompt para reconciliar com as fontes atuais.
- **Quer rodar o fluxo completo de ponta a ponta, sem lembrar a ordem?** Rode `pipeline` em uma IDE agêntica — ele monta o plano só com o que se aplica ao projeto, controla os gates de revisão e retoma de onde parou entre sessões.

## Fluxo recomendado

```
1. Diagnóstico (opcional, sem risco)
   auditoria-engenharia + auditoria-seguranca

2. Refatoração (conforme a stack)
   frontend e/ou fullstack e/ou backend

3. Testes
   testes — depois que a arquitetura estiver estável

4. E2E (opcional, depois da suíte unit/integration estável)
   setup-e2e → auditoria-testid → testes-e2e → ci-e2e

5. Copy
   revisao-copy — a qualquer momento após gerar conteúdo com IA
```

Rodar o diagnóstico primeiro evita refatorar às cegas: os dois prompts de auditoria não alteram nada, apenas mapeiam os problemas reais antes de você decidir onde investir esforço. Para automatizar essa sequência com plano personalizado, gates de revisão e retomada entre sessões, use o `pipeline`.

## Como usar um prompt

1. `npx @unificando/prompts get <id> --copy`
2. Cole no chat da sua LLM de preferência
3. Aguarde a análise — o resultado é um relatório estruturado com achados, soluções e prioridade
4. Aplique as mudanças e, se o documento tiver múltiplos prompts, execute o próximo na sequência indicada dentro do próprio arquivo

## Licença

MIT
