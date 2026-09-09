# ADR 0001: NestJS + Prisma 7 + pgvector + Redis stack

Date: 2026-09-05

Status: accepted

## Context

`hub-unificando` must serve three protocols (REST API, MCP Streamable HTTP,
CLI/stdio), run an ingestion pipeline that persists into PostgreSQL with
vector search, and reuse the architecture decisions already proven by
`med-unificando`. The ecosystem is Node/TypeScript-only, so the runtime is
fixed (Node >= 22); what needed a decision was the framework, the ORM/data
layer and the auxiliary stores.

## Decision

Build on:

- **NestJS 11** (`@nestjs/common`, `@nestjs/core` `^11.0.1`) over the default
  **platform-express** adapter. Global prefix `/api/v1`, Swagger
  (`@nestjs/swagger` `^11.4.7`), validation pipes, DI, guards, throttling
  (`@nestjs/throttler` `^6.5.0`) and pino logging (`nestjs-pino`).
- **Node >= 22** (`.nvmrc`, `engines`, Docker `node:22-bookworm-slim`).
- **Prisma 7** in the **driver-adapter** shape: `@prisma/client` `^7.10.0` +
  `@prisma/adapter-pg` `^7.10.0`, generator `prisma-client` emitting into
  `src/generated/prisma/`. The `vector` extension is enabled through
  `previewFeatures = ["postgresqlExtensions"]`, and vector/tsvector/trigram
  columns are declared `Unsupported` and accessed only via raw SQL helpers
  (see ADR 0004).
- **PostgreSQL 16 + pgvector** (`pgvector/pgvector:pg16`) as the single source
  of truth — no secondary document store.
- **Redis** (`redis:7-alpine`, ioredis) for two orthogonal needs: the
  **BullMQ** ingestion queue (`bullmq` `^6.3.4` used directly — the Nest
  wrapper `@nestjs/bullmq` was removed in 2026-09 as dead: 0 imports, the
  queue is composed manually in `src/modules/ingestion/queue/`, the same
  pattern as ADR 0005) and an optional short-TTL search cache.

## Alternatives considered

- **Fastify (or no framework) instead of platform-express.** NestJS's Fastify
  adapter is supported, but Express is NestJS's default, has the largest
  ecosystem, and the MCP transport is mounted as a plain Express middleware in
  `src/modules/mcp/mcp-http.service.ts`; Fastify's gain here is marginal and
  adds API-surface divergence. Rejected.
- **TypeORM instead of Prisma 7.** TypeORM is mature, but its migrations and
  typed query surface are weaker for the strict schema + raw-SQL boundary this
  project needs; Prisma's single-source `schema.prisma` with generated types
  is the same pattern med-unificando ships. Rejected.
- **Raw `pg`/`pg.Pool` for everything.** Kept only where Prisma cannot go
  (the `Unsupported` vector columns, via `queryRows`); using raw SQL for the
  whole domain would forfeit the relational CRUD, generated client types,
  transactions and seed ergonomics. Rejected as the primary layer.
- **No Redis** (in-process queue). Lost durability/observability of async
  ingestion jobs and the search cache; kept optional via
  `REDIS_ENABLED=false` so tests and minimal installs can run without it.

## Consequences

Positive:

- One language, one DI container, one process for REST + MCP + worker; the
  same `IngestionOrchestrator` runs in the CLI, the HTTP job and BullMQ.
- Prisma 7's driver adapter (instead of the Rust query engine binary) keeps
  deployment simple on `node:22-bookworm-slim`.
- Ecosystem consistency: engineers already know the med-unificando stack.

Negative / costs:

- Vector columns require discipline — an ORM-shaped temptation to touch
  `chunks.embedding` would silently type-error at generation time (they are
  `Unsupported`), which is exactly the intended guardrail (ADR 0004).
- Prisma 7 needs a `prisma generate` step on install/CI (already a
  `postinstall` script) and the adapter pattern is newer than classic
  Prisma — team must not mix the two.
- Node >= 22 is a hard floor (no LTS-lag support for older Node).

The stack is locked for v1; introduce a second ORM or HTTP framework only
behind an explicit deprecation ADR.
