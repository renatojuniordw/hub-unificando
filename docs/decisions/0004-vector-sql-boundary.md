# ADR 0004: Raw-SQL boundary for vector columns

Date: 2026-09-05

Status: accepted

## Context

pgvector's `vector(768)` and the tsvector/trigram expressions are not
representable as typed Prisma fields. Prisma 7 (ADR 0001) types such columns
only as `Unsupported("vector(768)")`, meaning the generated client knows the
column exists but offers **no CRUD** for it. Without a rule, each developer
would invent their own escape hatch — ad-hoc `$queryRawUnsafe` scattered
across modules, untyped results, and eventually string-concatenated SQL.

The corpus queries (search ranking, embedding persistence, prototype
lookups) are the highest-leverage SQL in the system and must stay
**parameterized and typed**.

## Decision

Establish a **single raw-SQL boundary**:

1. **Declare** `chunks.embedding` and `categories.prototype` as
   `Unsupported("vector(768)")?` in `prisma/schema.prisma` (and the tsvector/
   trigram access as SQL-only expressions). Nothing else about them exists in
   the schema.

2. **Concentrate all vector/tsvector/trigram SQL in one file** —
   `src/infra/vector/vector.sql.ts` — exposing small, named functions:
   `vectorSearch`, `keywordSearch`, `trigramSearch`, `upsertChunkEmbeddings`,
   `upsertCategoryPrototypes`, `clearDocumentEmbeddings`,
   `countEmbeddedChunks`. Domain code (search, ingestion orchestrator,
   classifier, seeder, health/summary counters) calls these functions and
   never writes raw SQL itself.

3. **Route every raw result through a typed wrapper** —
   `queryRows<T>(prisma, sql, ...params)` in `src/infra/prisma/raw.ts`. The
   generated client types `$queryRawUnsafe` as `Promise<any>`; the wrapper
   narrows to `T` in exactly one place, keeping the rest of the codebase
   `any`-free under strict TS + the ESLint rules.

4. **All values are bound parameters.** User input, filter values and
   top-k/limit numbers are validated upstream (DTOs/zod) and passed as `$n`
   parameters; never concatenated into SQL text. Numeric arrays embed as
   Postgres `text[]` (UNNEST batch upserts) and pgvector literals are
   constructed from numbers (`[0.006,...]`) and cast with `::vector` — the
   only interpolation is of floats produced by `toFixed(6)`, never of strings.

5. **Rule of thumb**: if a query touches `embedding`, `prototype`, a
   `to_tsvector`/`@@`/`similarity` expression, or reads vector-shaped rows, it
   lives in `vector.sql.ts`. Everything else uses the Prisma client.

## Alternatives considered

- **Full ORM with `String` (JSON) encoding of vectors.** Would let the client
  CRUD the column, but the HNSW index and `<=>` operator require the real
  vector type; JSON round-trips would defeat the index. Rejected.
- **`queryRaw`/`$queryRawUnsafe` ad-hoc per module.** Faster to write, but
  duplicates SQL strings, spreads `any`, and multiplies the surface where an
  unparameterized query could slip in. Rejected — the boundary exists to make
  SQLi *structurally* hard (see `docs/SECURITY.md`).
- **Extend Prisma with a custom preview type.** Not available/stable for the
  pgvector type in the pinned Prisma 7 line; revisit if Prisma ships native
  `vector` support (would only replace file 3, not the boundary).

## Consequences

Positive:

- The only file that can touch `Unsupported` columns is one small,
  reviewable, parameterized module — grep `vector.sql` to audit every vector
  statement.
- Strict-TS stays intact (`noImplicitAny`, lint) thanks to `queryRows<T>`.
- Tests can mock the boundary cleanly (unit) or exercise it against real
  pgvector (integration Testcontainers, `docs/TESTING.md`).

Negative / costs:

- Any future SQL needs a named function instead of inline raw calls —
  a deliberate tax that keeps the invariant verifiable.
- `queryRows` relies on a documented double-cast to satisfy
  `no-unnecessary-type-assertion`; callers must provide correct `T` (row
  shape drift would surface only at runtime, which is why search rows are
  integration-tested against real pgvector).
