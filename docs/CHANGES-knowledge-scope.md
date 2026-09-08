# Mudança: escopo de conhecimento = docs + README/CLAUDE/AGENTS + prompts

> **IMPLEMENTADO (ver ADR 0009-knowledge-lib.md, `knowledge-path.ts` e
> `docs/INGESTION.md`).** Este documento é o registro histórico da decisão de
> escopo; a implementação substituiu o `export-knowledge`/`sync` por
> `hub sync-docs` + knowledge lib commitada.

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

Resultado esperado: **~90 arquivos** curados no total (inclui os 10 prompts
extraídos do radar — ADR 0010):
ui 9 · med 13 · pdf 14 · radar-app 27 (17 docs + 10 prompts extraídos) ·
radar-ext 6 · prompts-unificando 14 · promptcraft 7.

Isso também deixa a knowledge lib (deploy VPS) com ~90 arquivos.

## Mudanças implementadas

### 1. Regra de conhecimento curado (núcleo)

Novo módulo puro **`src/modules/ingestion/scan/knowledge-path.ts`**:

```ts
export const KNOWLEDGE_ROOT_NAMES = new Set(['README.md', 'CLAUDE.md', 'AGENTS.md']);
export function isKnowledgePath(relativePath: string): boolean
//   segs = relativePath.normalize('/').split('/')
//   raiz: segs.length === 1 && KNOWLEDGE_ROOT_NAMES.has(segs[0])
//   docs: segs.includes('docs') || segs.includes('documentation')
//   prompts na raiz: segs[0] === 'prompts'
//   + extensão obrigatória .md/.mdx/.txt (decidida dentro da função)
```

**`src/modules/ingestion/scan/scanner.service.ts`**: para cada arquivo
candidato (após as exclusions atuais: blocklist, dot-dirs, dotfiles, repos
aninhados), decidir com `isKnowledgePath(relativePath)`. Substituiu o
`isIndexable`/`INDEXABLE_EXTENSIONS` genérico ("qualquer lugar"). O `public/`
continua navegável quando tem subpasta de docs, mas o arquivo só entra se
`isKnowledgePath` (ex.: `public/llms.txt` sai; `public/docs/x.md` entra).

Limpeza: `INDEXABLE_EXTENSIONS`/`INDEXABLE_NAMES` removidos de
`src/shared/constants.ts` (sem outros usos). Docblock do scanner atualizado.

### 2. Knowledge lib commitada (substituiu o knowledge bundle)

O escopo curado alimenta uma **lib commitada** (`knowledge/<slug>`) espelhada
dos irmãos via `hub sync-docs`; a ingestão lê da lib primeiro e só cai para
`HUB_SCAN_ROOT` como fallback (dev). O fluxo antigo de
`export-knowledge`/`sync` (tar.gz + serviço `sync` no compose prod) foi
removido. Detalhes no ADR 0009 e em `docs/INGESTION.md`.

### 3. Dry-run reporta o que seria purgado

*(Não implementado nesta rodada — a convergência acontece no `hub ingest`
real via `pruneStaleDocuments`, que já existia.)*

### 4. Testes

- **`src/modules/ingestion/scan/knowledge-path.spec.ts`** (novo): raiz
  README/CLAUDE/AGENTS ✓ · `notes.md` na raiz ✗ · `docs/a.md`,
  `docs/sub/x.md` ✓ · `x/docs/y.md` ✓ · `prompts/base.md` ✓ ·
  `src/docs.ts` (extensão errada) ✗ · `public/llms.txt` ✗ ·
  `public/docs/index.md` ✓.
- **`scanner.service.spec.ts`**: fixture atualizada (`notes.md` na raiz NÃO
  entra; `docs/notes.md` entra; `webp.bin` fora).

## Verificação

1. `npm run test`, `npm run build`, `npm run lint` — verdes.
2. `npm run hub -- sync-docs --dry-run` → 7 projetos, ~90 arquivos.
3. `npm run hub -- sync-docs` → gera `knowledge/<slug>/` (~90 arquivos,
   incluindo os prompts extraídos do radar).
4. `npm run hub -- ingest` → converge (purga órfãos do escopo antigo);
   `hub status` ≈ 90 docs / ~540 chunks.
5. Simulação VPS só com a lib:
   `HUB_SCAN_ROOT=/tmp/empty KNOWLEDGE_LIB_ROOT=<repo>/knowledge node
   dist/src/cli.js ingest`.
