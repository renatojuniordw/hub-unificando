# AGENTS.md — hub-unificando

Guia de trabalho para agentes de IA que desenvolvem neste repositório.
Padrões de comportamento destilados da biblioteca `@unificando/prompts`
(regras dos prompts `refatoracao-faseada`, `testes`, `testes-e2e`), aplicados
ao contexto real deste projeto.

---

## O repositório

**Unificando Knowledge Platform** — plataforma de conhecimento do ecossistema
Unificando: REST API oficial + Servidor MCP + CLI. Indexa os projetos irmãos
(`ui-unificando`, `med-unificando`, `pdf-unificando`, `radar-unificando`,
`prompts`, `refina`, etc.) em `knowledge/<slug>` e expõe esse conhecimento
para humanos, agentes e LLMs.

**Stack:** NestJS 11 · Node ≥ 22 · PostgreSQL 16 + pgvector · Prisma 7
(driver adapter) · Redis/BullMQ · Transformers.js on-device · zod · pino.

Leia antes de assumir comportamento:

- `docs/ARCHITECTURE.md` — visão geral, módulos, camadas
- `docs/TESTING.md` — suítes por camada e convenções
- `docs/INGESTION.md` / `docs/SEARCH.md` — pipeline de conhecimento e busca
- `docs/SECURITY.md` — threat model e regras de segurança
- `docs/decisions/*.md` — ADRs (fonte de decisões de arquitetura)

## Comandos e particularidades

| Contexto                                             | Comando                             |
| ---------------------------------------------------- | ----------------------------------- |
| Infra local (app 11020, postgres 11022, redis 11023) | `docker compose up -d db redis`     |
| Unit (Prisma/embeddings mockados, sem infra)         | `npm run test`                      |
| E2E REST (precisa Postgres local + migrate + seed)   | `npm run test:e2e`                  |
| Integração (Testcontainers, pgvector hermético)      | `npm run test:integration`          |
| Lint / typecheck                                     | `npm run lint`, `npm run typecheck` |
| Build                                                | `npm run build`                     |

Rode a suíte correspondente ao que mexeu: mudou lógica → unit; mexeu em
controller/rota/fluxo REST → e2e; tocou no pipeline/índices → integration.
Nunca declare uma tarefa pronta com lint/typecheck/build quebrados.

Particularidades que quebram com frequência:

- Entrypoints `mcp:stdio`, `hub`, `seed-categories` rodam do **dist**
  (compilado por tsc, não tsx). Rode `npm run build` antes de usá-los —
  `npm run start:dev` (watch) também serve o servidor, mas não os CLIs.
- Convenção Prisma de índices custom: nomes `<tabela>_<coluna>_idx` —
  nomes fora desse padrão fazem o `migrate dev` dropar índices que não
  conseguem ser declarados no schema.
- O projeto espelha os irmãos em `knowledge/<slug>` via `hub sync-docs`.
  Este `AGENTS.md` é raiz do próprio hub (não é espelho) e é auto-indexado
  pela ingestão; não precisa de `sync-docs`.
- Em CI, `test:e2e` é intencionalmente ausente (precisa DB seedado e
  sobrepõe o integration) — rode localmente quando tocar em rotas REST.

## Regras de trabalho

1. **Evidência obrigatória.** Toda afirmação de achado, bug ou estado exige
   `caminho/arquivo:linha` obtida por leitura/busca real no código. É
   proibido inferir, presumir ou alucinar ocorrências. Sem evidência, o
   achado não existe.

2. **Nada de commit/push sem pedido explícito.** `git status`, `git diff`,
   `git log` são esperados e bem-vindos. `git commit`, `git push`, `git tag`,
   `git rebase`, `git reset --hard` e afins só quando o usuário pedir.
   Alterações ficam no working tree para revisão humana.

3. **Não alterar testes para "passar"; atualize-os quando o contrato muda.**
   Em mudança que não deveria alterar comportamento (refatoração, correção
   que preserva a spec): teste quebrou = a mudança está errada ou o teste
   documenta comportamento real — nos dois casos, reverta a mudança e
   reporte. Teste não é ajustado para acomodar código. Em **funcionalidade
   nova ou mudança intencional de comportamento/contrato**, a história é
   outra: o teste existente que assere o contrato antigo pode ser atualizado
   para documentar o comportamento novo, e regras novas exigem testes novos
   que as cubram (reconciliação do prompt `testes`). A atualização é sempre
   dirigida pela spec/regra intencional — nunca um ajuste cego de asserção
   para ficar verde; se o teste quebrou sem o contrato ter mudado, continua
   valendo o revert/report. Quando a mudança de lógica não tem teste cobrindo
   o caminho alterado, a mudança inclui criar o teste que documenta o
   comportamento (novo ou preservado) — sem ele, a regra 8 não tem como
   verificar o caminho.

4. **Teste real, não métrica.** Proibido criar teste artificial só para subir
   cobertura — % de linha é referência, não meta. Testes seguem F.I.R.S.T.
   (rápidos, isolados, repetíveis, autoverificáveis), uma asserção lógica por
   teste, sem duplicar a lógica de implementação nem acoplar a detalhes
   internos. Use sempre o framework/convenção já existentes no projeto —
   nunca crie uma estrutura paralela de testes.

5. **Reconciliar antes de duplicar.** Antes de gerar testes ou specs novos,
   leia os existentes e classifique cada um: mantém (cobre corretamente),
   corrige (valida bug / padrão frágil), renomeia (fora do padrão do
   projeto), remove (redundante) ou gera novo (gap real). Siga a convenção de
   pastas/nomes já detectada.

6. **Na dúvida, REPORT-ONLY.** Remoção ou refatoração sem confiança máxima
   (verificável por teste, leitura ou gate) vira relatório com o patch
   proposto — nunca ação silenciosa. Não existe meio-termo.

7. **Sem abstração prematura.** Duas ocorrências não justificam DRY. Só
   consolide com ≥ 3 ocorrências, similaridade estrutural real e sem criar um
   componente de 3+ flags booleanas de comportamento.

8. **Gates antes de declarar pronto.** Build + lint + teste. Se uma alteração
   quebra o gate, identifique e reverta a alteração culpada. Falha pré-
   existente no baseline é registrada como pré-existente, não responsabilidade
   da mudança atual.

   **Ambiente dos gates:** unit roda sem infra (`npm run test`). E2E REST
   (`npm run test:e2e`) e integration (`npm run test:integration`) dependem de
   ambiente — respectivamente Postgres local migrado/seedado (`docker compose up -d db` + `npm run prisma:migrate` + `npm run prisma:seed`) e container
   Testcontainers. Não declare uma suite quebrada se o ambiente dela não foi
   provisionado — levante o ambiente ou registre o gate como não executado.
   `test:e2e` não roda em CI (precisa DB seedado e sobrepõe o integration):
   rode-o localmente sempre que a mudança tocar controller/rota/fluxo REST.

   **Teste do caminho alterado:** o gate exige um teste que exercite o
   caminho que você mudou — suíte verde que não toca no caminho não valida
   a mudança. Caminho alterado sem teste existente → criar o teste (regra
   3); impossível cobrir (UI, integração sem ambiente), registrar por quê.

9. **Não assumir em silêncio.** Ambiguidade real → registre a suposição
   (motivo incluído) e siga; bloqueio objetivo que nenhuma suposição razoável
   resolve → pergunte. Nunca invente.

10. **Não tocar CI/CD, secrets, `.env*`.** Alterações nessa área são sempre
    REPORT-ONLY; rotação de credencial vazada é ação humana obrigatória.

11. **Toda mudança de comportamento público atualiza a documentação.** Toda
    criação de funcionalidade, correção de comportamento ou atualização que
    altere contrato/uso visível (endpoint, campo de DTO/payload, tool MCP,
    comando CLI, classificação, escopo da knowledge lib, schema) só termina
    com a doc correspondente atualizada — a documentação da própria mudança
    faz parte da entrega, não é escopo extra. Guia:

    | Mudança                                        | Doc                                              |
    | ---------------------------------------------- | ------------------------------------------------ |
    | Endpoint/rota, DTO, envelope ou fluxo REST     | `docs/API.md`                                    |
    | Tool MCP, transporte, segurança do MCP         | `docs/MCP.md`                                    |
    | Módulo, camada, fluxo interno relevante        | `docs/ARCHITECTURE.md`                           |
    | Schema, campo, índice ou modelo de dados       | `docs/DATA-MODEL.md` + migration/seed (regra 12) |
    | Scanner, chunker, classificação, `knowledge/`  | `docs/INGESTION.md`                              |
    | Busca (RRF, índice, query)                     | `docs/SEARCH.md`                                 |
    | Suíte/comando de teste                         | `docs/TESTING.md`                                |
    | Decisão estrutural com alternativa considerada | ADR novo em `docs/decisions/NNNN-titulo.md`      |

    Se a mudança é apenas interna (sem efeito em contrato/uso visível), doc
    não é obrigatória — mas o ADR/`ARCHITECTURE.md` pode registrar quando a
    estrutura muda de forma relevante. Sempre confira se a doc citada já
    descreve o comportamento antigo; se descreve, ela precisa sair da tarefa
    atualizada.

12. **Mudança de schema anda com migration + seed.** Alterou modelo, campo
    ou índice no Prisma → gere a migration no mesmo trabalho
    (`npm run prisma:migrate`), respeite a convenção de nomes `idx_`
    declarados no schema e, se o seed alimenta o que mudou (categorias,
    taxonomia, registros), atualize `prisma/seed.ts` junto. Código novo
    apontando para schema que não existe no banco é quebra de deploy —
    a migration é parte da entrega, não passo posterior.

13. **Data/índice ingerido que muda exige reingestão.** O hub indexa
    `knowledge/` com idempotência por `sourceSha` (ADR 0009). Se a mudança
    afeta conteúdo já ingerido (chunker, extração de prompt, classificação,
    escopo da knowledge lib, seed), o índice fica servindo dados velhos até
    a reingestão. Nesses casos, rode o caminho afetado localmente ou valide
    com `hub ingest --force` — e registre a necessidade de reingestão no
    deploy, em vez de deixar silencioso.

14. **Superfície MCP/CLI/escrita é contrato do ecossistema.** O hub é o
    provedor MCP dos demais agentes (desktop/Cursor/opencode apontam para o
    stdio/HTTP deste repo); tools MCP e comandos do CLI não são detalhe
    interno. Mudança que altera nome, schema de input/output ou semântica de
    uma tool MCP ou comando CLI exige: doc correspondente atualizada (regra 11) e verificação explícita de que a mudança não quebra os consumidores
    existentes do stdio/HTTP — sinalize impacto e sugira o teste/verificação,
    em vez de aplicar silenciosamente.

15. **Diagnóstico antes de refatoração grande.** Para refatorar em escopo
    amplo, faça a varredura/mapeamento completo read-only primeiro (plano
    mestre com achados e arquivos afetados) e só então edite — evita que uma
    fase refatore o que outra deletaria.

16. **Escopo disciplinado.** Não crie instruções, fases, features ou
    entregáveis não solicitados na tarefa. Nenhuma iniciativa proativa fora
    do contrato da conversa. A atualização de documentação da regra 11 e os
    passos de migration/reingestão das regras 12–13 são exceções explícitas —
    fazem parte do contrato, não escopo extra. (Origem: R9
    `refatoracao-faseada`.)

## Segurança

- Endpoints de escrita exigem `ADMIN_API_KEY` (Bearer, comparação em tempo
  constante); MCP tem `MCP_API_KEY` opcional e allowlist de origins; todo SQL
  é parametrizado — nunca concatene input de usuário em query. Detalhes em
  `docs/SECURITY.md`.
- Proibido colocar segredos, chaves ou tokens em commit ou no código. Em
  tarefa de refatoração/auditoria, vale a varredura crítica do prompt
  `auditoria-seguranca`: secrets hardcoded, chave exposta em bundle
  client-side, senha sem hash e input em query concatenada são risco ativo e
  têm prioridade máxima; correção imediata só quando local e sem
  ambiguidade, senão reporta com severidade crítica.

## Guia dos prompts

A biblioteca `@unificando/prompts` continua sendo a fonte para **tarefas
episódicas** (auditoria, refatoração faseada, cobertura, E2E, copy), quando o
usuário pedir explicitamente:

```bash
npx @unificando/prompts list
npx @unificando/prompts get <id>       # ex.: refatoracao-faseada, testes
```

As regras acima são o que vale para todo o desenvolvimento diário; o
conteúdo episódico fica na biblioteca, versionada e buscável sob demanda.
