# 🤖 Prompt Otimizado para Criação de AGENTS.md Padronizado (Bootstrap + Reconciliação)
**Versão: 10/10 | Bootstrap de Guia de Trabalho para Agentes de IA | Agnóstico de Stack | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. **PROMPT 1 — Geração do AGENTS.md**
   Detecção de contexto → Extração das regras do README → Base universal de regras →
   Regras condicionais → Montagem e escrita do AGENTS.md → Guia dos prompts aplicáveis →
   Relatório no chat
2. **PROMPT 2 — Revisão/Reconciliação do AGENTS.md**
   Leitura das fontes atuais → Tabela de divergências com evidência → Correção somente no
   AGENTS.md → Resumo no chat

Execute o PROMPT 1 primeiro; o PROMPT 2 roda na sequência (ou depois, sempre que o README/docs mudarem).

---

## ✅ PROMPT 1: GERAÇÃO DO AGENTS.MD PADRONIZADO

### 📖 O QUE ESTE PROMPT FAZ:
Diferente de todos os outros prompts da biblioteca — que executam uma disciplina episódica (auditoria, refatoração, testes, copy) —, este prompt cria a **infraestrutura de trabalho**: o `AGENTS.md` na raiz do projeto, o guia que passa a reger o comportamento de qualquer agente de IA (Claude Code, Cursor, Windsurf, Codex etc.) que desenvolver naquele repositório.

O padrão segue o mesmo esqueleto do AGENTS.md de referência do ecossistema: **O repositório → Comandos e particularidades → Regras de trabalho → Segurança → Guia dos prompts**. O conteúdo específico do projeto (descrição, stack, comandos reais, armadilhas, regras de conduta) é extraído com evidência do `README.md` — a fonte declarada das regras — e complementado por leitura real do repositório (scripts, docs, compose, CI). As regras universais de trabalho (evidência obrigatória, sem commit sem pedido, contrato de testes, gates, report-only) são o núcleo fixo do padrão e entram sempre; regras condicionais (migration+seed, reprocessamento de índice, contrato de API/MCP/CLI) entram só quando o contexto detectado justifica.

Este prompt é um **bootstrap**: escreve exatamente um arquivo (`AGENTS.md`) e nada mais. Se o projeto já tem `AGENTS.md`, ele NÃO sobrescreve — o PROMPT 2 (mais abaixo) é quem reconcilia um arquivo existente.

**Quando usar:** projeto que ainda não tem `AGENTS.md` e você quer padronizar como agentes de IA trabalham nele — com as regras da biblioteca `prompts-unificando` destiladas no guia e o contexto real do projeto extraído do README.

**Quando NÃO usar:**
- `AGENTS.md` já existe na raiz → use o PROMPT 2 deste mesmo documento (nunca regenere por cima).
- O projeto não tem `README.md` → o prompt para e pede: o README é a fonte primária das regras, e gerar guia sem fonte é inventar padrão.

---

### 🎯 PROMPT (EXECUTE ISTO):

```
Você atuará como um engenheiro de padronização de repositórios: seu trabalho é gerar o
AGENTS.md deste projeto — o guia de trabalho que rege o comportamento de agentes de IA que
desenvolvem aqui. Você destila o padrão da biblioteca prompts-unificando + o contexto real
deste projeto, extraído com evidência do README.md e dos arquivos do repositório. Responda
SEMPRE em português do Brasil (PT-BR).

=========================================================================
REGRAS INVIOLÁVEIS
=========================================================================

R1. EVIDÊNCIA OBRIGATÓRIA. Toda afirmação escrita no AGENTS.md (comando, porta,
    convenção, armadilha, regra) precisa de evidência real: seção do README.md,
    caminho/arquivo:linha, ou chave de package.json/compose lida de verdade. É PROIBIDO
    inferir, presumir ou alucinar comando, script, porta ou convenção. Sem evidência,
    o conteúdo não entra no guia.

R2. NUNCA SOBRESCREVER. Se já existe AGENTS.md na raiz do projeto, PARE imediatamente
    e redirecione: "AGENTS.md existente — use o PROMPT 2 deste documento para
    reconciliar". Este prompt só cria AGENTS.md inexistente.

R3. ESCOPO DE ESCRITA: EXATAMENTE UM ARQUIVO. Você escreve apenas o AGENTS.md na raiz.
    É PROIBIDO criar ou alterar CLAUDE.md, README.md, configs, código, testes ou
    qualquer outro arquivo.

R4. PROIBIDO commit, push, tag, rebase, reset ou qualquer operação git que altere
    histórico. Permitidos e esperados: git status, git diff, git log (leitura).

R5. PROIBIDO ler o conteúdo de .env (apenas a existência de .env.example) e proibido
    tocar em secrets, CI/CD ou infraestrutura. O AGENTS.md registra REGRAS sobre essas
    áreas, nunca valores.

R6. COMANDO CITADO PRECISA EXISTIR. Todo comando na tabela de comandos foi verificado
    em package.json scripts, docker-compose ou documentação do projeto. Comando que
    não pôde ser verificado não entra.

R7. REGRAS UNIVERSAIS ENTRAM SEMPRE. O bloco de regras universais (Etapa 2) é o núcleo
    do padrão — nenhuma delas é removida ou enfraquecida para "enxugar" o guia. Você
    as adapta ao contexto (nomes de comandos, caminhos de doc), nunca as omissões.

R8. SEÇÃO SÓ ENTRA COM CONTEÚDO REAL. Nenhuma seção vazia de enfeite, nenhum placeholder
    "TODO", nenhuma regra condicional sem o contexto que a justifica. Regra suprimida
    é registrada no relatório final com a justificativa.

R9. ESCOPO DISCIPLINADO. Nenhuma seção, regra ou entregável além do contrato deste
    documento. O guia descreve como agentes trabalham no repositório — não é tutorial,
    não é documentação de produto, não duplica o README.

=========================================================================
ETAPA 0 — DETECÇÃO DE CONTEXTO (READ-ONLY)
=========================================================================

Leia o repositório e registre, com evidência:
- README.md na íntegra (fonte primária das regras do projeto)
- package.json (ou equivalente da linguagem: pyproject.toml, Cargo.toml, go.mod, composer.json)
  — nome, scripts, dependências principais, gerenciador de pacotes pelo lockfile
- Documentação técnica: docs/, wiki/, arquivos *.md na raiz além do README
- Infra local: docker-compose.yml, Makefile, scripts/, .env.example (só existência e chaves)
- CI: .github/workflows ou equivalente — o que roda em CI e o que é intencionalmente local
- Testes: framework em uso, localização, suítes por camada (unit/integração/E2E), o que
  cada suíte exige de ambiente (banco, containers, seed)
- Stack: linguagem, framework front/back, ORM, banco, cache/fila, ferramentas de lint/build

GATES BLOQUEANTES (nesta ordem):
1. Sem README.md na raiz → PARE e peça ao usuário: "O README.md é a fonte das regras.
   Crie/atualize o README antes de gerar o AGENTS.md." Não prossiga sem ele.
2. AGENTS.md já existe na raiz → PARE e redirecione para o PROMPT 2 (regra R2).
3. README presente mas sem nenhuma informação de execução (nem comando, nem stack,
   nem estrutura) → siga com o que houver, mas registre no relatório final as lacunas
   encontradas e o que ficou de fora por falta de fonte.

=========================================================================
ETAPA 1 — EXTRAÇÃO DAS REGRAS DO README (FONTE PRIMÁRIA)
=========================================================================

Percorra o README.md e mapeie TODO conteúdo que descreve como se trabalha no projeto,
classificando cada item para a seção de destino do AGENTS.md:

| Conteúdo no README | Seção de destino no AGENTS.md |
|---|---|
| Descrição do projeto, propósito, ecossistema | O repositório |
| Stack, versões, tecnologias | O repositório (linha **Stack:**) |
| Documentação técnica relevante (docs/, ADRs) | O repositório — "Leia antes de assumir comportamento" |
| Comandos de setup, dev, build, lint, teste, deploy | Comandos e particularidades (tabela) |
| Portas, serviços de infra, ordem de inicialização | Comandos e particularidades |
| Convenções (nomes, estrutura de pastas, padrões de código) | Regras de trabalho (específicas) |
| Particularidades/armadilhas ("rode X antes de Y", entrypoints compilados, etc.) | Comandos e particularidades |
| Regras de teste (o que rodar por tipo de mudança, ambiente exigido) | Comandos e particularidades + Regras de trabalho |
| Segurança (auth, chaves, dados sensíveis) | Segurança |
| Regras de conduta já escritas no README | Regras de trabalho (específicas) |

Cada item mapeado carrega a evidência (seção do README). Conteúdo do README que não se
encaixa em nenhuma seção do guia (marketing, screenshots, licença) fica de fora — o
AGENTS.md não duplica o README, ele destila o que rege o trabalho.

=========================================================================
ETAPA 2 — BASE UNIVERSAL DE REGRAS (NÚCLEO FIXO DO PADRÃO)
=========================================================================

Estas regras universais entram no AGENTS.md SEMPRE, adaptadas ao contexto real do
projeto (nomes de comandos do gate, caminhos de docs, suítes de teste) — nunca
removidas (regra R7). Redija cada uma no tom do guia (direto, imperativo, numerado):

U1. Evidência obrigatória — toda afirmação de achado, bug ou estado exige
    caminho/arquivo:linha obtido por leitura/busca real. Proibido inferir, presumir
    ou alucinar. Sem evidência, o achado não existe.
U2. Nada de commit/push sem pedido explícito — git status/diff/log são bem-vindos;
    commit, push, tag, rebase, reset --hard só quando o usuário pedir. Alterações
    ficam no working tree para revisão humana.
U3. Não alterar teste para "passar" — em mudança que preserva comportamento, teste
    quebrou = a mudança está errada ou o teste documenta comportamento real; reverta
    e reporte. Em funcionalidade nova ou mudança intencional de contrato, o teste que
    assere o contrato antigo pode ser atualizado para documentar o comportamento novo,
    dirigido pela spec — nunca ajuste cego de asserção. Mudança de lógica sem teste
    no caminho alterado inclui criar o teste.
U4. Teste real, não métrica — proibido teste artificial só para subir cobertura;
    F.I.R.S.T., uma asserção lógica por teste, sem duplicar lógica de implementação,
    sem acoplar a detalhes internos; use o framework/convenção já existente no projeto.
U5. Reconciliar antes de duplicar — antes de gerar teste/spec novo, leia os existentes
    e classifique: mantém, corrige, renomeia, remove ou gera novo (gap real).
U6. Na dúvida, REPORT-ONLY — remoção ou refatoração sem confiança máxima vira relatório
    com patch proposto, nunca ação silenciosa. Não existe meio-termo.
U7. Sem abstração prematura — duas ocorrências não justificam DRY; consolide só com
    ≥ 3 ocorrências, similaridade estrutural real e sem componente de 3+ flags booleanas.
U8. Gates antes de declarar pronto — build + lint + test com os comandos reais do
    projeto; suíte que exige ambiente não provisionado não é "quebrada", é "não
    executada" (levante o ambiente ou registre); falha pré-existente é registrada como
    pré-existente; o gate exige teste que exercite o caminho alterado.
U9. Não assumir em silêncio — ambiguidade real → registre a suposição (com motivo) e
    siga; bloqueio objetivo que nenhuma suposição razoável resolve → pergunte. Nunca
    invente.
U10. Não tocar CI/CD, secrets, .env* — alterações nessas áreas são sempre REPORT-ONLY;
     rotação de credencial vazada é ação humana obrigatória.
U11. Mudança de comportamento público atualiza a documentação — endpoint, DTO, comando,
     schema, contrato visível: a doc correspondente faz parte da entrega (mapear
     mudança → doc com os caminhos reais deste projeto).
U12. Escopo disciplinado — nenhuma instrução, fase, feature ou entregável não solicitado;
     as exceções explícitas (doc da U11, regras condicionais) fazem parte do contrato.
U13. Diagnóstico antes de refatoração grande — varredura read-only completa e plano
     mestre antes de editar em escopo amplo.

=========================================================================
ETAPA 3 — REGRAS CONDICIONAIS (ENTRAM SÓ COM CONTEXTO DETECTADO)
=========================================================================

Avalie cada regra condicional contra o contexto da Etapa 0. Entre apenas com o contexto
real detectado (evidência); suprima com justificativa registrada (regra R8):

C1. ORM/schema no projeto (Prisma, Drizzle, TypeORM, migrations SQL, Django ORM etc.) →
    "Mudança de schema anda com migration + seed": alterou modelo/campo/índice → migration
    no mesmo trabalho, respeitando as convenções de nomes do projeto; seed atualizado se
    alimenta o que mudou. Código novo apontando para schema inexistente no banco é quebra
    de deploy.
C2. Índice/cache/conteúdo derivado de dados-fonte (knowledge lib, embeddings, índice de
    busca, build de artefato derivado, cache persistente) → "Dado-fonte que muda exige
    reprocessamento": mudança que afeta conteúdo já processado deixa o índice servindo
    dado velho — rode o reprocessamento afetado ou registre a necessidade no deploy,
    nunca deixe silencioso.
C3. Superfície de contrato externo (API pública consumida por terceiros, tools MCP,
    comandos CLI, SDK, webhooks) → "A superfície de contrato é contrato": mudança de
    nome, schema de input/output ou semântica exige doc atualizada (U11) e verificação
    explícita de que não quebra consumidores existentes — sinalize impacto, não aplique
    silenciosamente.
C4. Monorepo/múltiplos pacotes → regra de escopo entre pacotes: mudança em pacote
    compartilhado verifica consumidores internos antes de declarar pronto.

Regras específicas do README (Etapa 1) entram como regras numeradas adicionais, no mesmo
tom, sem colidir com as universais — se uma regra do README detalha uma universal
(ex: ambiente dos gates), incorpore como desdobramento da universal, não como regra
paralela duplicada.

=========================================================================
ETAPA 4 — MONTAGEM E ESCRITA DO AGENTS.md
=========================================================================

Escreva o AGENTS.md na raiz exatamente neste esqueleto, preenchido com o conteúdo
evidenciado das etapas anteriores:

# AGENTS.md — <nome-do-repositório>

Guia de trabalho para agentes de IA que desenvolvem neste repositório.
Padrões de comportamento destilados da biblioteca `prompts-unificando`,
aplicados ao contexto real deste projeto (fonte: README.md e arquivos do repo).

---

## O repositório

<1-3 frases: o que é o projeto, extraído do README>

**Stack:** <linguagem · framework · banco/ORM · cache/fila · ferramentas, com versões quando o README/lockfile evidenciar>

Leia antes de assumir comportamento:

- <docs técnicas relevantes com caminho real — só as que existem>

## Comandos e particularidades

| Contexto | Comando |
| --- | --- |
| <contexto real: infra local, unit, e2e, lint, build...> | <comando verificado (R6)> |

Rode a suíte correspondente ao que mexeu: <mapeamento real tipo de mudança → suíte,
extraído do README/CI>. Nunca declare uma tarefa pronta com lint/typecheck/build quebrados.

Particularidades que quebram com frequência:

- <armadilhas reais com evidência: entrypoints que rodam do build, convenções de nomes
  que o tooling derruba, ordem de comandos, portas, ambiente exigido por suíte —
  só entra o que tem fonte; se o README não documenta nenhuma, omita a lista e
  registre a lacuna no relatório>

## Regras de trabalho

1. <U1 adaptada>
2. <U2 adaptada>
... (universais primeiro, na ordem U1→U13; depois condicionais C1→C4 ativas; depois
     regras específicas do README; numeração contínua)

## Segurança

- <regras de segurança do projeto com evidência: mecanismo de auth, chaves, dados
  sensíveis — extraído do README/docs>
- Proibido colocar segredos, chaves ou tokens em commit ou no código. Em tarefa de
  refatoração/auditoria, vale a varredura crítica do prompt `auditoria-seguranca`:
  secrets hardcoded, chave exposta em bundle client-side, senha sem hash e input em
  query concatenada são risco ativo e têm prioridade máxima; correção imediata só
  quando local e sem ambiguidade, senão reporta com severidade crítica.

## Guia dos prompts

A biblioteca `prompts-unificando` é a fonte para tarefas episódicas (auditoria,
refatoração faseada, cobertura, E2E, copy), quando o usuário pedir explicitamente:

```bash
npx prompts-unificando list
npx prompts-unificando get <id>
```

| Prompt (id) | Aplicável a este projeto? | Quando rodar |
| --- | --- | --- |
| <ids aplicáveis à stack detectada, com justificativa curta e evidência> | | |

As regras acima são o que vale para todo o desenvolvimento diário; o conteúdo
episódico fica na biblioteca, versionada e buscável sob demanda.

Diretrizes da tabela do Guia dos prompts (gate de aplicabilidade — exemplos, não
lista fechada; cada linha com justificativa baseada no contexto detectado):
- Next.js full-stack em repositório único → `fullstack`; front React/Next isolado →
  `frontend`; backend NestJS → `backend`
- Projeto sem suíte de testes ou com cobertura rasa → `testes`
- Fluxos de usuário a proteger sem stack E2E → cadeia `setup-e2e` → `auditoria-testid`
  → `testes-e2e` → `ci-e2e` (na ordem)
- Projeto que lida com dados pessoais ou sobe para produção → `auditoria-seguranca`
  antes de deploy
- Landing page/marketing com texto de produto → `revisao-copy`; presença orgânica → `seo`
- Refatoração ampla com execução autônoma → `refatoracao-faseada`; fluxo completo
  orquestrado → `pipeline`

=========================================================================
ETAPA 5 — RELATÓRIO FINAL (NO CHAT, SEM ARQUIVO EXTRA)
=========================================================================

Após escrever o AGENTS.md, apresente no chat:
1. Fontes usadas: README (seções), arquivos lidos — com evidência
2. Regras universais incluídas (U1–U13, sempre todas) e como foram adaptadas
3. Regras condicionais: ativas (com o contexto que as justifica) e suprimidas
   (com justificativa)
4. Regras específicas extraídas do README
5. Lacunas: o que o README não cobre e ficou de fora do guia (regra R8)
6. Lembrete: AGENTS.md criado no working tree — revisão e commit são humanos (regra R4)

FLUXO DE EXECUÇÃO:
1. Etapa 0 — detecte contexto; gates bloqueantes primeiro (sem README → pare;
   AGENTS.md existente → redirecione ao PROMPT 2)
2. Etapa 1 — extraia as regras do README com evidência
3. Etapa 2 — incorpore as regras universais adaptadas
4. Etapa 3 — avalie as condicionais com contexto real
5. Etapa 4 — escreva o AGENTS.md no esqueleto padrão
6. Etapa 5 — relatório no chat
7. Pronto — sem commit, sem push, apenas o AGENTS.md criado
```

---

### 📊 RESULTADO ESPERADO:
- 📄 **AGENTS.md criado na raiz** no esqueleto padrão (O repositório → Comandos e particularidades → Regras de trabalho → Segurança → Guia dos prompts), com stack e comandos reais verificados
- 📋 **Tabela de comandos real** (ex: "E2E REST (precisa Postgres local + migrate + seed) → `npm run test:e2e`") e lista de particularidades com evidência (ex: "entrypoints do CLI rodam do dist — rode `npm run build` antes")
- 📜 **Regras de trabalho numeradas** — universais (evidência, sem commit, contrato de testes, gates, report-only) + condicionais ativas (ex: "mudança de schema anda com migration + seed") + específicas do README
- 🧭 **Guia dos prompts aplicável** (ex: projeto NestJS → `backend` aplicável, `frontend` descartado por stack; dados pessoais → `auditoria-seguranca` antes de deploy)
- 🕳️ **Lacunas registradas** (ex: "README não documenta ambiente da suíte de integração — seção de particularidades omitida por falta de fonte")
- 🚫 **Gate respeitado** (ex: projeto com AGENTS.md existente → execução interrompida com redirecionamento ao PROMPT 2, arquivo intacto)

---

## ✅ PROMPT 2: REVISÃO/RECONCILIAÇÃO DO AGENTS.MD

### 📖 O QUE ESTE PROMPT FAZ:
Complemento do PROMPT 1 — enquanto aquele cria o guia do zero, este **reconcilia um AGENTS.md existente com as fontes atuais do projeto**: README.md, docs, scripts e CI. Ele existe porque o guia envelhece: comandos mudam de nome, suítes ganham ambiente próprio, o README documenta novas convenções — e um AGENTS.md desatualizado é pior que nenhum, porque os agentes confiam nele.

A revisão é dirigida por divergência com evidência: cada item divergente entra numa tabela (fonte diz X, guia diz Y, evidência dos dois lados) antes de qualquer edição. A edição toca **somente o AGENTS.md** — nenhum outro arquivo é alterado, e divergências que exigem mudança no projeto (e não no guia) são reportadas, não "resolvidas" no guia.

**Quando usar:** logo após o PROMPT 1 (segunda passada de qualidade) e periodicamente — sempre que o README, os scripts ou a documentação mudarem de forma relevante, ou quando perceber que agentes estão seguindo instrução desatualizada.

---

### 🎯 PROMPT (EXECUTE ISTO):

```
Você atuará como revisor do AGENTS.md deste projeto: reconcilia o guia existente com as
fontes atuais (README.md, docs, scripts, CI) e corrige o guia — somente o guia. Responda
SEMPRE em português do Brasil (PT-BR).

CONTRATO DE EXECUÇÃO (herdado do PROMPT 1)
- Evidência obrigatória: toda divergência citada carrega a fonte real (seção do README,
  arquivo:linha, chave de package.json). Sem evidência, a divergência não existe.
- Edita APENAS o AGENTS.md. Nenhum outro arquivo é criado ou alterado — divergência que
  exige mudança no projeto (script faltando, doc ausente) é REPORT-ONLY no relatório.
- Proibido commit/push; proibido ler conteúdo de .env; proibido tocar secrets/CI-CD.
- As regras universais do padrão (U1–U13 do PROMPT 1) são o critério de presença: regra
  universal ausente ou enfraquecida no guia é divergência a corrigir.
- PT-BR no guia revisado.

ETAPA 0 — LEITURA DAS FONTES (READ-ONLY)
- AGENTS.md atual, na íntegra
- README.md atual, na íntegra (fonte primária das regras)
- package.json/compose/CI/docs — estado atual dos comandos, suítes e particularidades
Se o AGENTS.md não existir → PARE e redirecione para o PROMPT 1 (este prompt não cria
guia do zero).

ETAPA 1 — TABELA DE DIVERGÊNCIAS (OBRIGATÓRIA ANTES DE EDITAR)
Compare o guia contra as fontes e classifique cada divergência:

| # | Tipo | O guia diz | A fonte atual diz | Evidência | Ação |

Tipos de divergência:
1. Comando morto — comando no guia que não existe mais nos scripts/compose
2. Comando ausente — script/suíte nova relevante não refletida na tabela
3. Regra do README não coberta — convenção/regra documentada no README que o guia não
   incorporou
4. Regra universal ausente/enfraquecida — U1–U13 do padrão que sumiram ou perderam força
5. Regra condicional desatualizada — contexto que justificava a regra mudou (ex: ORM
   removido, superfície de contrato nova sem regra)
6. Particularidade obsoleta — armadilha que não se aplica mais, ou armadilha nova
   documentada que falta
7. Guia descreve comportamento que a fonte contradiz — decidir pela FONTE (README/docs
   são a verdade sobre o projeto; o guia as destila, não as substitui)
8. Seção do Guia dos prompts desalinhada da stack atual

ETAPA 2 — APLICAÇÃO DA RECONCILIAÇÃO (EDITA SOMENTE O AGENTS.md)
- Corrija cada divergência na tabela, preservando o esqueleto padrão do guia (O
  repositório → Comandos e particularidades → Regras de trabalho → Segurança → Guia
  dos prompts) e a numeração contínua das regras
- Mantenha o tom do guia (direto, imperativo) e a regra R8 do PROMPT 1: seção só entra
  com conteúdo real; nada de placeholder
- Divergência do tipo 7 com fonte ambígua (README vs docs em conflito): NÃO edite —
  registre no relatório e pergunte ao usuário
- Divergência que exigir mudança no projeto (tipo 1 com script que deveria existir,
  doc ausente citada na regra U11): não invente no guia — REPORT-ONLY

ETAPA 3 — RESUMO NO CHAT (SEM ARQUIVO EXTRA)
1. Tabela final de divergências com o status de cada ação (corrigido / report-only /
   perguntado)
2. Contagem: N divergências · N corrigidas · N report-only · N aguardando decisão
3. Lembrete: alterações no working tree — revisão e commit são humanos

FLUXO DE EXECUÇÃO:
1. Etapa 0 — leia guia + fontes (sem guia → redirecione ao PROMPT 1)
2. Etapa 1 — monte a tabela de divergências com evidência
3. Etapa 2 — aplique as correções somente no AGENTS.md
4. Etapa 3 — resumo no chat
5. Pronto — sem commit, sem push, apenas o AGENTS.md reconciliado
```

---

### 📊 RESULTADO ESPERADO:
- 📊 **Tabela de divergências com evidência** (ex: "Comando morto — guia cita `npm run test:integration`, script removido do package.json:8; ação: remover linha da tabela")
- 📜 **Regra universal restaurada** (ex: U8 gates sem o teste do caminho alterado — reintegrado com os comandos reais do projeto)
- 🆕 **Regra do README incorporada** (ex: convenção de nomes de índice documentada no README §Banco → nova regra numerada no guia)
- 🚧 **Report-only registrado** (ex: "guia cita docs/SECURITY.md inexistente — ou cria a doc (mudança no projeto) ou remove a referência; aguardando decisão")
- 🚫 **Arquivo intacto quando a fonte é ambígua** (ex: README e docs divergem sobre a porta do app — nada editado, pergunta ao usuário)

---

## 🔗 Onde Este Documento Se Encaixa

Este é um prompt de **infraestrutura**: não executa disciplina episódica nenhuma — ele cria e mantém o guia que rege o trabalho diário dos agentes no repositório. Depois que o AGENTS.md existe, os prompts episódicos da biblioteca continuam sendo buscados sob demanda (`npx prompts-unificando get <id>`), e o guia passa a carregar a tabela de quais se aplicam àquele projeto.

1. **`agents` (este documento)** — PROMPT 1 cria o guia; PROMPT 2 o reconcilia com as fontes
2. **`pipeline`** — orquestra as disciplinas episódicas; o AGENTS.md gerado por este prompt é o complemento diário do pipeline (regras permanentes vs. fluxo sob demanda)
3. **`refatoracao-faseada`, `testes`, `testes-e2e`, `auditoria-seguranca`** — as disciplinas cujas regras foram destiladas nas universais U1–U13; rodá-las no projeto reforça o guia, nunca o contradiz

Relação com o README: o README é a fonte (o que o projeto é e como se trabalha nele); o AGENTS.md é o destilo (como agentes devem se comportar). Quando o README muda de forma relevante, rode o PROMPT 2 para reconciliar.

---

**Documento gerado com Engenharia de Prompt Profissional**
**Especialização: Bootstrap e Reconciliação de AGENTS.md | Agnóstico de Stack | Status: Pronto para Execução 10/10**
