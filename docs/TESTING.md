# Testing

Three layers cover the Hub: fast **unit** tests with mocked Prisma/embeddings,
**e2e** REST tests against a real local Postgres, and a hermetic
**integration** suite that boots a real PostgreSQL 16 + pgvector container via
Testcontainers. Everything runs from `package.json` scripts.

## Layers

| Layer | Tooling | DB | Embeddings | Command |
|---|---|---|---|---|
| Unit | jest (ts-jest) | none (mocked) | mocked | `npm run test` |
| e2e | jest + supertest | **local Postgres** (`.env`, `docker compose up -d db`) | deterministic fake | `npm run test:e2e` |
| Integration | jest + Testcontainers | disposable `pgvector/pgvector:pg16` container | deterministic fake | `npm run test:integration` |

Both non-unit suites need `NODE_OPTIONS=--experimental-vm-modules` (ESM
transforms) — already wired into their npm scripts.

## Unit tests

`src/**/*.spec.ts`, collected by the default jest config. They compile a Nest
testing module (or call pure functions) with **PrismaService and
EmbeddingProvider overridden** by mocks:

- `src/modules/classification/classifier.service.spec.ts` — the reference
  suite: four classification paths (strong rules, accent-normalized
  "segurança", semantic rescue when rules are inconclusive, `general`
  fallback) plus pure `rulePass` and `cosineSimilarity` cases. It overrides
  `PrismaService.category.findMany` and `$queryRawUnsafe` with jest mocks and
  swaps the embedding provider for a fake returning fixed vectors.
- `src/modules/ingestion/scan/knowledge-path.spec.ts` — curated knowledge
  scope: README/CLAUDE/AGENTS at the root, `docs/` at any depth, root
  `prompts/`, extension filtering, Windows separators (ADR 0009).
- `src/modules/ingestion/scan/project-source.spec.ts` — three-layer source
  resolution (absolute → knowledge lib → scan root) with real tmpdir
  folders.
- `src/modules/ingestion/knowledge/prompt-extractor.service.spec.ts` — TS
  prompt extraction via AST: escaped backticks, `securityRules({...})`
  resolved (output pinned to the sibling helper), multiple consts per file,
  `@deprecated` notes, unknown interpolation fails loudly (ADR 0010).
- `src/modules/ingestion/knowledge/knowledge-lib.service.spec.ts` — lib
  mirror against mocked Prisma + tmpdir: scanned ∪ generated live set,
  pruning of stale files, dry-run, skip-without-pruning on missing source or
  failed extraction.
- `src/modules/ingestion/orchestrator/ingestion-orchestrator.service.spec.ts`
  — the write pipeline (previously 0% covered): happy path persists a draft,
  embeds its chunks and upserts embeddings (module `vector.sql` mocked);
  `sourceType: manual` projects are skipped; scope-by-slug filtering; dedupe
  by `sourceSha` (skip) vs `force` (re-ingest); `dryRun` neither classifies
  nor persists; `reset` purges documents/decisions before scanning; stale
  pruning; and scan failure is recorded without persisting. Fixtures live in
  a real `os.tmpdir()` folder.

Run: `npm run test` (watch: `npm run test:watch`, coverage: `npm run test:cov`).

## e2e (REST, needs local DB)

`test/app.e2e-spec.ts` boots the full `AppModule` as an `INestApplication`
with global prefix `/api/v1` and the same pipes/filter/interceptor as
production, then talks to it with **supertest**.

Prerequisites/behavior:

- Needs the local Postgres up with schema + seeds:
  `docker compose up -d db`, then `npm run prisma:migrate` and
  `npm run prisma:seed` against `DATABASE_URL` from `.env`.
- `process.env.REDIS_ENABLED = 'false'` is set at the top of the file, so the
  BullMQ queue stays inert and nothing needs Redis.
- `EmbeddingProvider` is overridden with a **deterministic fake**
  (`fakeEmbedding(768)`) — hash-seeded vectors, `isReady()`, no model load.
- Asserts the documented envelope: health `ok`, `GET /projects` pagination,
  project detail counts, `404 → { success:false, error.code:NOT_FOUND }`,
  taxonomy ≥ 16, hybrid search returns scored hits, summary/compare respond,
  `GET /projects/:slug/documents/by-path` (200 por path real + 404 para path
  inexistente), and `POST /ingest/jobs` without a token is `401`.

Run: `npm run test:e2e`.

## Integration (Testcontainers, hermetic)

`test/ingestion.integration-spec.ts` is the end-to-end proof of the **real
pipeline against real pgvector**:

1. Starts `pgvector/pgvector:pg16` (Testcontainers, mapped port), waits for
   readiness with a raw `pg` `Pool` (`SELECT 1`).
2. Runs `npx prisma migrate deploy` against the container URL (HNSW/GIN/trgm
   indexes included).
3. Creates a **fixture project folder** in `os.tmpdir()` with a README and a
   long `docs/database.md`, and upserts a minimal taxonomy (`database`,
   `general`) plus a `test-project` row pointing at the temp folder.
4. Compiles the Nest module with `REDIS_ENABLED=false` and the
   `EmbeddingProvider` overridden by a **normalizing** deterministic fake
   (honors the `query:`/`passage:` prefixes, L2-normalizes — realistic enough
   for HNSW cosine).
5. Asserts: ingestion of 2 docs with `embeddedChunks === chunks`; hybrid
   search finds the `test-project` chunk for "prisma migrations e índices";
   and **idempotency** — re-ingesting without `force` skips both docs
   (`stats.skipped === 2`).

The suite is slow by nature (`testTimeout: 300000` in
`test/jest-integration.json`) — it downloads the pgvector image on first run.

Run: `npm run test:integration`.

## CI coverage

CI is defined in `.github/workflows/ci.yml` (runs on `main` pushes and every
PR, canceling superseded runs). It is organized as five parallel jobs:

| Job | Runs |
|---|---|
| `quality` | `npm ci` + `prisma generate` → `npm run lint` → `npm run typecheck` → `npm run build` |
| `unit` | `npm run test -- --ci` (jest, mocked infra) |
| `integration` | `npm run test:integration -- --ci` (Testcontainers pgvector, hermetic) |
| `ingest-smoke` | Postgres `pgvector/pgvector:pg16` + Redis as GitHub `services`; `prisma migrate deploy` + `prisma/seed.ts`; builds, clones `ui-unificando` into `/tmp/ecosystem`, then `node dist/scripts/smoke-ingest.js ui-unificando` with the **real** `multilingual-e5-base` model, and finally `node dist/src/cli.js status` |
| `audit` | `npm audit --audit-level=high` (supply-chain gate) |

Notes:

- Every job uses Node 22 (`setup-node`) and `npm ci` with the cache keyed on
  the lockfile; `postinstall` already runs `prisma generate`.
- `ingest-smoke` exercises the real embedding model and the real filesystem
  pipeline end-to-end on a clean checkout — the closest CI analogue to a
  production first boot (minus the Docker entrypoint).
- `test:e2e` is intentionally **not** in CI today: it needs a pre-seeded
  local-style database and overlaps with `integration`; run it on developer
  machines (see above). Add a job that provisions + seeds Postgres before
  `npm run test:e2e` if e2e parity should block merges.

## Coverage targets

- Keep `src/modules/classification/*` and `src/modules/ingestion/chunking/*`
  at high unit coverage — they encode the tunable business rules.
- Integration must keep asserting the three invariants that unit tests
  cannot: real index usage (search returns ranked hits), transactional
  replace, and `sourceSha` idempotency.
- There is no hard coverage percentage gate in CI today; treat
  `npm run test:cov` output as the tracking signal.
