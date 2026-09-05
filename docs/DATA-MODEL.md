# Data Model

Schema: `prisma/schema.prisma`. Migration:
`prisma/migrations/20260905130559_init/migration.sql` (PostgreSQL 16 +
`pgvector`). Client: `src/generated/prisma/` (Prisma 7 `prisma-client`
generator). All tables use `@@map` names:

| Prisma model | Table | Purpose |
|---|---|---|
| `Project` | `projects` | ecosystem project registry |
| `Document` | `documents` | an indexed file (title/summary/categories/pointer) |
| `Chunk` | `chunks` | a searchable piece of a document + `embedding` |
| `Category` | `categories` | taxonomy row (keywords + `prototype`) |
| `Decision` | `decisions` | ADR/decision records |
| `IngestionJob` | `ingestion_jobs` | job bookkeeping (BullMQ mirror) |

Two columns are `Unsupported("vector(768)")` and **invisible to the Prisma
ORM** — only ever touched through raw SQL in `src/infra/vector/vector.sql.ts`
(see "Raw-SQL boundary" below).

## Project

| Field | Type | Notes |
|---|---|---|
| `slug` | String @id | PK; registry id + scan folder name |
| `name` / `description` | String | display + one-liner |
| `repoUrl` | String? | git remote when declared |
| `folderPath` | String | absolute, or **relative to `HUB_SCAN_ROOT`** (resolved at ingest) |
| `stack` | Json? | `[{ name, version, role }]` from `package.json` |
| `tags` | String[] | free-form |
| `sourceType` | String | default `"local"` (`local` \| `git`) |
| `enabled` | Boolean | default true; disabled projects are never ingested |
| `lastIngestedAt` | DateTime? | stamped after a clean orchestrator run |
| `metadata` | Json? | curated extras (`workspace`, `promptCount`, ...) |
| `createdAt` / `updatedAt` | DateTime | |

Relations: `documents`, `decisions` (cascade). Index: PK `slug`.

## Document

One row per indexed file; the text lives in `Chunk`s, this row carries
classification.

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `projectSlug` | String | FK → `projects.slug`, cascade delete |
| `path` | String | relative to project folder (e.g. `docs/DATABASE.md`) |
| `title` | String | first chunk heading, else file basename |
| `summary` | String? | first 400 chars of chunk 0 |
| `lang` | String? | `pt-BR` \| `en` \| `unknown` |
| `category` | String | primary category slug |
| `categories` | String[] | multi-label (up to 3) |
| `docType` | String | default `"markdown"` (`markdown` \| `txt`) |
| `contentKind` | String? | `README`, `AGENT-GUIDE`, `MARKDOWN`, `TEXT` |
| `sourceSha` | String | sha256 of file — **dedupe key** |
| `charCount` / `tokenEstimate` | Int / Int? | `ceil(chars / 4)` estimate |
| `metadata` | Json? | e.g. first 10 chunk headings |
| `ingestedAt` / `updatedAt` | DateTime | |

Indexes/constraints:

- `@@unique([projectSlug, path])` → `documents_projectSlug_path_key`
- `@@index([projectSlug, category])` → `documents_projectSlug_category_idx`
- **GIN** on `categories` → `documents_categories_gin_idx` (array `&&` overlap)

Relation: `chunks` (cascade).

## Chunk

A heading-aware piece of a document.

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `documentId` | String | FK → `documents.id`, cascade |
| `index` | Int | order within the document |
| `heading` | String? | lineage `"A > B"` (`null` for txt) |
| `content` | String | chunk text |
| `contentHash` | String | sha256 of content |
| `tokenCount` | Int | `ceil(chars / 4)` |
| `anchor` | String? | `path#slugified-heading` deep link |
| `metadata` | Json? | reserved |
| `embedding` | Unsupported("vector(768)")? | **raw SQL only** |

Search-critical indexes:

- `chunks_embedding_hnsw_idx` — **HNSW** `(embedding vector_cosine_ops)`
- `chunks_content_tsv_idx` — **GIN** `(to_tsvector('portuguese', content))`
- `chunks_content_trgm_idx` — **GIN** `(content gin_trgm_ops)`
- B-tree: `chunks_documentId_idx`, `chunks_contentHash_idx`

## Category

| Field | Type | Notes |
|---|---|---|
| `slug` | String @id | PK (16 seeded via `prisma/seed.ts`) |
| `name` / `description` | String | e.g. "Banco de Dados" |
| `keywords` | String[] | rule-pass keywords |
| `prototype` | Unsupported("vector(768)")? | **raw SQL only**; anchor-text embedding written by `hub seed-categories` |
| `parentSlug` | String? | hierarchy marker (no Prisma self-relation) |
| `metadata` | Json? | may carry `{ anchor }` for prototype seeding |
| `createdAt` | DateTime | |

Index: `@@index([parentSlug])`.

## Decision

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | |
| `projectSlug` | String | FK → `projects.slug`, cascade |
| `title` / `date` | String / DateTime | date defaults to now |
| `status` | String | default `"accepted"` (`accepted` \| `superseded` \| `proposed`) |
| `summary` | String | abstract used by context packages |
| `content` | String | full ADR markdown when a file exists |
| `sourcePath` | String? | e.g. `docs/decisions/0001.md` |
| `metadata` / `createdAt` / `updatedAt` | | |

Index: `@@index([projectSlug, status])`.

## IngestionJob

Bookkeeping mirror of BullMQ jobs (`src/modules/ingestion/queue/`).

| Field | Type | Notes |
|---|---|---|
| `id` | String @id @default(cuid()) | reused as the BullMQ `jobId` |
| `kind` | String | job kind; v1 always creates `'ingest'` (`createJob('ingest', ...)`) |
| `status` | String | `queued` → `running` → `done` \| `failed` \| `partial` |
| `scope` | Json? | `{ projectSlug?, path?, strategy? }` |
| `stats` | Json? | `{ projects, documents, chunks, errors, ... }` |
| `error` / `startedAt` / `finishedAt` | | failure detail + lifecycle timestamps |

Index: `@@index([status, createdAt])`.

## Raw-SQL vector boundary

`vector(768)` is a pgvector type Prisma cannot type; both `chunks.embedding`
and `categories.prototype` are `Unsupported`, so the ORM never generates CRUD
for them. All vector/tsvector/trigram access is confined to:

- `src/infra/vector/vector.sql.ts` — `vectorSearch`, `keywordSearch`,
  `trigramSearch`, `upsertChunkEmbeddings`, `upsertCategoryPrototypes`,
  `clearDocumentEmbeddings`, `countEmbeddedChunks`.
- `src/infra/prisma/raw.ts` — `queryRows<T>(prisma, sql, ...params)`, the typed
  wrapper over `$queryRawUnsafe` that keeps the codebase `any`-free.

Every statement binds values as parameters (never concatenated); Postgres
arrays bind as `text[]` and pgvector values are passed as literal strings
(`'[0.006,0.043,...]'` cast `::vector`). Rationale: ADR 0004.

## Dimension lock-in

The embedding dimension is fixed at **768** by the `vector(768)` columns and
the default `EMBEDDING_DIMS=768` / `Xenova/multilingual-e5-base` pair.
Changing models to 384d/1024d requires a **migration** (column type + index
rebuild) and full re-embed (ADR 0002).
