# Architecture

The Hub is a single NestJS 11 application exposing three protocols over one
HTTP server (port `11020`): a REST API (prefix `/api/v1`), an MCP server at
`/mcp` (Streamable HTTP) and a CLI/stdin variant. It runs an ingestion worker
(BullMQ) in-process for asynchronous admin jobs.

```
            ┌──────────────────────────── hub-unificando (NestJS) ────────────────────────────┐
  HTTP ───► │  /api/v1/*   REST controllers (envelope {success,data,meta})                     │
            │  /mcp        MCP Streamable HTTP (middleware puro, fora do prefixo)              │
            │  /api/docs   Swagger UI                                                          │
  CLI ────► │  src/cli.ts  commander sobre Nest application context                            │
  stdio ──► │  src/mcp-stdio.ts (mesmo registry de tools)                                      │
            └───────┬───────────────────────┬──────────────────────────┬──────────────────────┘
                    │                       │                          │
            Domain modules            Infra (adapters)             External
  projects/documents/categories    PrismaService(adapter-pg)   PostgreSQL16+pgvector
  decisions (read)                 vector.sql (raw SQL)        Redis (BullMQ+cache)
  classification/classifier        EmbeddingProvider           Transformers.js model
  ingestion/* (write)              RedisService                (multilingual-e5-base, 768d)
  search/search                    queryRows (typed raw)
  context/{assembler,compare,summary}
  mcp/* (server + 12 tools)
```

## Layering rules

- **Modules** (`src/modules/*`) hold domain logic; **controllers** only
  translate HTTP → service calls; **services** never import controllers.
- **Infra** (`src/infra/*`) adapts external systems; `vector.sql.ts` is the
  only place allowed to touch `Unsupported` vector/tsvector columns (raw SQL,
  always parameterized through the typed `queryRows` helper).
- **Presentation** (REST/MCP/CLI) shares the same services — no duplicated
  business logic. Each MCP tool is a thin wrapper over a service method.

## Key flows

1. **Ingestion** — `IngestionOrchestrator` (scan → parse → chunk → classify →
   embed → persist). Triggered by CLI (foreground) or BullMQ worker (API
   `POST /ingest/jobs`). Dedupe by `sha256`; re-index deletes + recreates the
   document inside a transaction. Details: [INGESTION.md](INGESTION.md).
2. **Search** — `SearchService` runs three top-k queries (HNSW cosine,
   Portuguese tsvector, pg_trgm) and fuses them with weighted RRF.
   Details: [SEARCH.md](SEARCH.md).
3. **Classification** — `ClassifierService`: keyword rules first, semantic
   pass against category prototype embeddings when inconclusive, `general`
   fallback. Details: [CLASSIFICATION.md](CLASSIFICATION.md).
4. **MCP** — `McpHttpService` (HTTP endpoint) and `src/mcp-stdio.ts` share
   `createToolDefinitions(deps)`. HTTP sessions (1 `McpServer` per session,
   TTL + sweep). Details: [MCP.md](MCP.md).

## Shared conventions

- **Envelope** — REST success `{ success: true, data, meta? }`; REST error
  `{ success: false, error: { code, message } }` (never leaks internals).
- **Config** — one zod-validated `Env` object (`src/shared/config/env.ts`,
  token `ENV`), fail-fast on boot. `.env.example` documents every variable.
- **Errors** — domain throws `NotFoundException` etc.; the global filter maps
  to stable codes (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`,
  `RATE_LIMITED`, ...).
- **Logging** — pino (nestjs-pino), request ids, Authorization redacted.
- **Naming** — files/folders in English (kebab-case) except MCP tool names
  which follow the ecosystem convention in PT-BR (snake_case).

## Module dependency graph (read top-down)

```
AppModule
├─ HealthModule
├─ ProjectsModule ──────────────► DocumentsModule / DecisionsModule
├─ CategoriesModule
├─ ClassificationModule ────────► EmbeddingModule (infra)
├─ IngestionModule ─────────────► ClassificationModule, EmbeddingModule
├─ SearchModule ────────────────► EmbeddingModule
├─ ContextModule ───────────────► Documents/Decisions/Search
└─ McpModule ───────────────────► Projects/Documents/Categories/Decisions/
                                  Search/Context/Ingestion
```

Global modules: `EnvModule`, `PrismaModule`, `RedisModule`.

## Sibling projects

| slug | folder | notes |
|---|---|---|
| ui-unificando | `ui-unificando` | site institucional (SPA Vite) |
| med-unificando | `med-unificando` | Next + pgvector + MCP (referência do ecossistema) |
| pdf-unificando | `pdf-unificando` | ferramentas de PDF |
| radar-unificando | `radar/radar-unificando` | app de vagas (workspace `radar`) |
| radar-unificando-extension | `radar/radar-unificando-extension` | extensão Chrome (workspace `radar`) |
| prompts-unificando | `SITE_HIGH_CONVERSION_ARQUITETURA` | biblioteca de prompts |
| promptcraft-unificando | `unificando-promptgen` | CLI gerador de prompts |

`HUB_SCAN_ROOT` aponta para a pasta-pai com esses projetos e o
`RegistryScanService` também descobre novos projetos (metadata apenas). A
**ingestão** resolve a fonte em três camadas (`project-source.ts`): absolute
`folderPath` (fixtures) → knowledge lib commitada `knowledge/<slug>`
(`KNOWLEDGE_LIB_ROOT`, default `knowledge` relativo à raiz do repo) →
`HUB_SCAN_ROOT/<folderPath>` como fallback dev. A lib é o espelho commitado
por slug dos arquivos de conhecimento de cada projeto — ver ADR 0009.
