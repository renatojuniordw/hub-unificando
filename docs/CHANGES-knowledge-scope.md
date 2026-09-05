# Mudança: escopo de conhecimento = docs + README/CLAUDE/AGENTS + prompts

> Plano de mudança (para aplicar posteriormente). Não foi implementado.

## Contexto / problema

O scanner do Hub hoje indexa **qualquer `.md/.mdx/.txt`** do repositório do
projeto. Isso infla o índice com dezenas de arquivos que não são
"conhecimento" (relatórios soltos na raiz, planos, `public/llms.txt`, etc.).
Estado atual: o banco tem **496 documentos** enquanto o disco só contém ~117
arquivos elegíveis (os projetos irmãos foram refatorados; o ingest **não**
remove órfãos — na verdade `pruneStaleDocuments` já existe no orquestrador e
roda a cada ingest, então o índice converge assim que a regra mudar e o
`hub ingest` rodar).

Decisão (usuário): indexar apenas **documentação de verdade**:
- pasta `docs/` (e `documentation/`) em qualquer profundidade do projeto;
- `README.md`, `CLAUDE.md`, `AGENTS.md` **na raiz** do projeto;
- `prompts/` — bibliotecas de prompts (`prompts-unificando`,
  `promptcraft-unificando`) — o conteúdo delas é a pasta `prompts/`.

Resultado esperado: **~80 arquivos** curados por projeto:
ui 9 · med 13 · pdf 14 · radar-app 17 · radar-ext 6 · prompts-unificando 14 ·
promptcraft 7.

Isso também deixa o "knowledge bundle" (deploy VPS) com ~80 arquivos.

## Mudanças propostas

### 1. Regra de conhecimento curado (núcleo)

Novo módulo puro **`src/modules/ingestion/scan/knowledge-path.ts`**:

```ts
export const KNOWLEDGE_ROOT_NAMES = new Set(['README.md', 'CLAUDE.md', 'AGENTS.md']);
export function isKnowledgePath(relativePath: string): boolean
//   segs = relativePath.normalize('/').split('/')
//   raiz: segs.length === 1 && KNOWLEDGE_ROOT_NAMES.has(segs[0])
//   docs: segs.includes('docs') || segs.includes('documentation')
//   prompts na raiz: segs[0] === 'prompts'
```

**`src/modules/ingestion/scan/scanner.service.ts`**: para cada arquivo
candidato (após as exclusions atuais: blocklist, dot-dirs, dotfiles, repos
aninhados), decidir com `isKnowledgePath(relativePath)` **+ extensão**
`.md/.mdx/.txt`. Substitui o `isIndexable`/`INDEXABLE_EXTENSIONS` genérico
("qualquer lugar"). O `public/` continua navegável quando tem subpasta de
docs, mas o arquivo só entra se `isKnowledgePath` (ex.: `public/llms.txt`
sai; `public/docs/x.md` entra).

Limpeza: remover `INDEXABLE_EXTENSIONS`/`INDEXABLE_NAMES` de
`src/shared/constants.ts` se não houver mais usos (grep antes). Ajustar o
docblock do scanner.

### 2. Dry-run reporta o que seria purgado

- `IngestStats` (`src/modules/ingestion/ingestion.types.ts`): adicionar
  `staleDocuments?: number`.
- Em dry-run, `ingestProject` computa os paths no DB que não estão nos paths
  vivos do scan e os **loga** (nada é deletado em dry-run).

Fluxo de aplicação: `hub ingest --dry-run` (mostra `staleDocuments` + lista)
→ revisar → `hub ingest` (o `pruneStaleDocuments` já existente purga os
órfãos e mirrors de decisão) → `hub status`.

### 3. Testes

- **`src/modules/ingestion/scan/knowledge-path.spec.ts`** (novo): raiz
  README/CLAUDE/AGENTS ✓ · `notes.md` na raiz ✗ · `docs/a.md`,
  `docs/sub/x.md` ✓ · `x/docs/y.md` ✓ · `prompts/base.md` ✓ ·
  `src/docs.ts` (extensão errada) ✗ · `public/llms.txt` ✗ ·
  `public/docs/index.md` ✓.
- **`scanner.service.spec.ts`**: atualizar a fixture (ex.: `notes.md` na raiz
  esperando NÃO entrar; manter docs/ e README entrando).

### 4. Docs

- `docs/INGESTION.md`: regra de escopo (docs/documentation + README/CLAUDE/
  AGENTS na raiz + prompts/) e convergência do índice (purga a cada ingest).
- `README.md`: contagem aproximada (~80 docs; bundle com esses arquivos).

## Arquivos críticos

- `src/modules/ingestion/scan/scanner.service.ts`
- `src/modules/ingestion/scan/knowledge-path.ts` (novo)
- `src/modules/ingestion/scan/knowledge-path.spec.ts` (novo)
- `src/modules/ingestion/scan/scanner.service.spec.ts`
- `src/modules/ingestion/orchestrator/ingestion-orchestrator.service.ts`
  (dry-run reporta stale; `pruneStaleDocuments` já existe em
  ingestion-orchestrator.service.ts:131)
- `src/modules/ingestion/ingestion.types.ts`
- `src/shared/constants.ts`
- `docs/INGESTION.md`, `README.md`

## Verificação

1. `npm run test` (knowledge-path + scanner + demais suites).
2. `npm run build` e `npm run lint`.
3. `npm run hub -- ingest --dry-run` → mostra `staleDocuments` (~416) e a
   lista do que sairia (ex.: `radar-unificando/testid-plan.md`,
   `ui-unificando/unificando-cro-redesign.md`, `public/llms.txt`).
4. `npm run hub -- ingest` → purga; `hub status` ≈ 80 docs / ~400 chunks;
   busca continua retornando (ex.: "busca hibrida pgvector" → med
   `docs/DATABASE.md`).
5. `npm run hub -- export-knowledge --out /tmp/kb.tar.gz` → bundle ~80
   arquivos; teste do sync simulando VPS
   (`HUB_SCAN_ROOT=/tmp/vps-test KNOWLEDGE_BUNDLE_PATH=/tmp/kb.tar.gz node
   dist/src/cli.js sync`) → extrai e ingere (skipped) sem efeito no banco.
6. `npm run test:e2e` (docs/DATABASE.md de med/radar continuam indexados).
