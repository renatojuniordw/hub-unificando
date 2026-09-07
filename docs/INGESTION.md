# Ingestion Pipeline

The Hub turns the ecosystem's markdown/txt knowledge files into searchable,
classifiable, embeddable chunks. The pipeline runs in two places: **foreground**
through the CLI (`hub ingest`) and **asynchronously** through a BullMQ worker
when a job is enqueued via `POST /api/v1/ingest/jobs`.

Pipeline code lives under `src/modules/ingestion/` (scan/ → parsing/ →
chunking/ → repository/ → orchestrator/ → queue/ → registry/, each described
with its real file below).

## Stages

For each enabled project (or the requested `projectSlug`):

1. **Resolve folder** — three-layer source resolution (see "Source
   resolution" below).
2. **Scan** — collect indexable files under the project folder.
3. **Parse** — split files into sections (heading-aware markdown, or a single
   plain-text section).
4. **Chunk** — assemble sections into 800-1500 char chunks.
5. **Dedupe** — skip files whose stored `sourceSha` matches and `force` is
   unset.
6. **Classify** — hybrid classifier over `title + first 3000 chars`.
7. **Embed** — on-device embeddings for chunk contents (batched).
8. **Persist** — delete + recreate document/chunks in a transaction, then
   write embeddings via raw SQL.

## Source resolution

`src/modules/ingestion/scan/project-source.ts`. `resolveProjectRoot` picks a
project's content folder in this order:

1. **Absolute `folderPath`** (test fixtures) always wins.
2. **Knowledge lib** — `KNOWLEDGE_LIB_ROOT/<slug>` (default
   `knowledge/<slug>` relative to the repo root) when the folder exists. The
   lib is the committed documentation mirror and the source of truth on the
   VPS, making the Hub independent of the sibling repositories.
3. **Scan root fallback** — `HUB_SCAN_ROOT/<folderPath>` (dev, before a
   project has been mirrored).

`resolveKnowledgeLibRoot` turns a relative `KNOWLEDGE_LIB_ROOT` into an
absolute path against the working directory. `hub scan` still reads the real
siblings under `HUB_SCAN_ROOT` for registry metadata only.

## Knowledge lib

`src/modules/ingestion/knowledge/knowledge-lib.service.ts`. The committed
`knowledge/<slug>/` mirror (one folder per project slug — the repository
name, not the local folder) holds every indexable file of the ecosystem, so
`hub ingest` never needs the sibling repositories at runtime.

- **`hub sync-docs`** (dev) re-mirrors the lib from the live siblings under
  `HUB_SCAN_ROOT`: it scans each project (curated scope only), copies the
  files into `knowledge/<slug>/` and **prunes** lib files that left the scope
  (a missing source folder skips the project with a warning — it never
  prunes). `--dry-run` only reports. After a sync, commit `knowledge/`; the
  diff is the documentation delta.
- **Production** ships the lib inside the Docker image
  (`KNOWLEDGE_LIB_ROOT=/app/knowledge`); the entrypoint runs `hub ingest`
  against it on first boot (see `docs/DEPLOYMENT.md`).

## Scanner rules

`src/modules/ingestion/scan/scanner.service.ts`; curated-scope rule in
`src/modules/ingestion/scan/knowledge-path.ts`; exclusions in
`src/shared/constants.ts`.

- **Excluded dirs** — `SCAN_EXCLUDED_DIRS` is checked on **every path
  segment**: `hub-unificando`, `node_modules`, `.git`, `.next`, `dist`,
  `coverage`, `.refactor`, `.verboo`, `.claude`, `playwright-report`,
  `test-results`, `.turbo`, `.cache`.
- **Any dot-directory** (`.agents`, `.github`, `.vscode`, …) is skipped, and
  dotfiles are never indexed.
- **`public`** is only walked when it hosts documentation (a
  `docs`/`documentation` subfolder); static asset dirs are skipped.
- **Nested git checkouts** (a subfolder with its own `.git`, e.g. a cloned
  vendor repo inside a project) are skipped — they are separate codebases.
- **Curated scope** (`isKnowledgePath` in `knowledge-path.ts`) — a file is
  indexed only when it is real documentation: `README.md`/`CLAUDE.md`/
  `AGENTS.md` at the project root, any file under a `docs`/`documentation`
  folder at any depth, or `prompts/` at the root — always with a
  `.md`/`.mdx`/`.txt` extension. Loose `.md` files elsewhere (`notes.md`,
  `public/llms.txt`, `src/docs.ts`, …) are skipped. A re-run converges the
  index: `pruneStaleDocuments` deletes documents whose files left the scope.
- Unreadable dirs/files are logged and skipped; relative paths are normalized
  to POSIX separators.

## Parsers

`src/modules/ingestion/parsing/sections.ts`:

- `parseMarkdownSections` splits markdown on `#`-`######` headings; each
  section carries the **heading lineage** from the document root down
  (e.g. `["Arquitetura", "Módulos"]`), resetting per level. Code fences and
  lists are preserved verbatim.
- `parsePlainText` turns a `.txt` file into one unheaded section.
- `detectLanguage` returns `pt-BR` | `en` | `unknown` from the first 2000
  chars (stored on `documents.lang`).

## Chunking

`src/modules/ingestion/chunking/chunk.service.ts`. Bounds:

| Constant | Value | Meaning |
|---|---|---|
| `CHUNK_TARGET_MIN_CHARS` | 800 | soft minimum (heading-boundary chunks may be shorter by design) |
| `CHUNK_TARGET_MAX_CHARS` | 1500 | hard cap before flush/split |
| `CHUNK_OVERLAP_CHARS` | 150 | chars carried between split parts |

Sections accumulate in a buffer under the buffer's heading; a section that
would overflow `maxChars` flushes it first. A **top-level heading change also
flushes** — two H1 documents never share a chunk (sub-headings under the same
H1 still merge). A single section larger than `maxChars` is split by
`splitLongSection` on blank-line paragraph boundaries, carrying the last 150
chars of each part into the next. Each chunk stores its heading lineage
joined with `" > "` and a slugified `anchor`
(`docs/DATABASE.md#banco-de-dados-tecnologia`), built in the orchestrator.

## Dedupe and re-index

`src/modules/ingestion/repository/ingestion-write.repository.ts`:

- `sourceSha = sha256(file.content)` per file; `contentHash = sha256(chunk)`
  per chunk.
- When the existing document's `sourceSha` equals the new one and `force` is
  unset, the file is **skipped** (`stats.skipped`) — re-runs are incremental.
- `replaceDocument` runs a transaction that **deletes any previous version of
  `(projectSlug, path)`** (cascade removes old chunks) and bulk-inserts the
  new document + chunks. Re-index is always delete + recreate; there is no
  per-field update path.
- Embeddings are written in a **second phase** (`upsertChunkEmbeddings`,
  `src/infra/vector/vector.sql.ts`, parameterized `UPDATE ... FROM
  UNNEST($1::text[], $2::text[])`) — outside the document transaction so rows
  never block on embedding work.

## Classification and metadata

In `ingestFile` (`ingestion-orchestrator.service.ts`):

- Classifier input: `title + chunk contents`, sliced to the first **3000
  characters**. `--dry-run` skips classification and stamps `general`.
- `summary` = first 400 chars of chunk 0; `lang` from `detectLanguage`;
  `charCount` = file length; `tokenEstimate` = `ceil(chars / 4)`
  (`TOKEN_CHARS_DIVISOR`).
- `docType` = `markdown` (`.md`/`.mdx`) or `txt`.
- `contentKind` by name: `README*` → `README`; `CLAUDE.md`/`AGENTS.md` →
  `AGENT-GUIDE`; `prompts/*.md` → `PROMPT`; else `MARKDOWN`/`TEXT`.
- `metadata.headings` = first 10 chunk headings.
- **Path specialization (§8.2.5)** overrides the classifier primary label:
  `prompts/*.md` → `prompt` + `metadata.promptId`; `CLAUDE.md`/`AGENTS.md` →
  `workflow`; `*mcp*.md`/`mcp/` → `mcp`; `design-system*` → `design-system`;
  `README.md` → `general`/`api` heuristic. Rules live in
  `src/modules/classification/path-specialization.ts`.
- **ADRs** — files under a `decisions/` folder are additionally mirrored into
  the `decisions` table (`Decision` row with parsed title/status/summary), so
  `GET /projects/:slug/decisions` and the context `decisoes_previas` section
  are populated.

## Embedding batches

The orchestrator embeds the replaced chunk contents through
`EmbeddingProvider.embed(texts, { prefix: 'passage' })`. The Transformers.js
provider (`src/infra/embedding/transformers.provider.ts`) slices into
`EMBEDDING_BATCH_SIZE` batches (default 50), applies the e5 `passage: `
prefix, L2-normalizes and lazy-loads the model on first use — typical docs
cost one batch.

## Job lifecycle (`ingestion_jobs` + BullMQ)

`src/modules/ingestion/queue/ingestion.queue.ts` mirrors each queued job into
the `ingestion_jobs` table (model `IngestionJob`):

| Phase | Row | BullMQ |
|---|---|---|
| Enqueue | `createJob('ingest', scope)` → `status=queued` | `queue.add('ingest', ...)`, `jobId = row.id`, `removeOnComplete: true` |
| Start | `markJobStarted` → `running`, `startedAt` | worker `process` callback |
| Done | `finishJob` → `done` (or `partial` when `stats.errors > 0`), `stats`, `finishedAt` | |
| Fail | `finishJob` → `failed` (+`error`) | `worker.on('failed')` logs |

- Queue/worker name: `INGESTION_QUEUE = 'ingestion'`; worker concurrency 1.
- BullMQ needs a dedicated ioredis connection with
  `maxRetriesPerRequest: null`. The worker runs the same
  `IngestionOrchestrator` the CLI uses.
- With `REDIS_ENABLED=false` the queue is inert and
  `POST /api/v1/ingest/jobs` answers `400` ("queue is disabled").
- After a project run, `setProjectIngestedAt` stamps `lastIngestedAt` — only
  when not dry-run and with zero errors.

## API

Admin endpoints (`src/modules/ingestion/ingestion.controller.ts`, `AdminGuard`,
write throttle 30/min):

- `POST /api/v1/ingest/jobs` — body `{ projectSlug?, force? }`;
  `projectSlug` absent = all enabled projects. Returns
  `{ jobId, queueId, status: "queued" }`.
- `GET /api/v1/ingest/jobs/:id` — job status + stats.

## CLI

Built on a Nest application context (`src/cli.ts`):

```bash
npm run hub -- sync-docs                   # dev: mirror siblings into knowledge/<slug> (commit after)
npm run hub -- sync-docs --dry-run         # report-only mirror diff
npm run hub -- sync-docs --project med-unificando   # mirror a single project
npm run hub -- ingest                      # all enabled projects (foreground)
npm run hub -- ingest med-unificando       # one project
npm run hub -- ingest radar-unificando --force     # ignore sha256 dedupe
npm run hub -- ingest --dry-run            # scan + parse only, no writes/embeddings
npm run hub -- scan                        # refresh registry from HUB_SCAN_ROOT
npm run hub -- status                      # counts: projects/documents/chunks/embedded
npm run hub -- list-projects               # registry overview (slug, name, counts)
npm run hub -- classify --project radar-unificando   # reclassify docs, no re-embedding
npm run hub -- reindex-embeddings --project med-unificando  # recompute chunk vectors
npm run hub -- health                      # db/redis readiness
```

The Hub is autonomous: `ingest` reads from the committed knowledge lib
(`knowledge/<slug>`), so a fresh clone + `hub ingest` is enough to rebuild the
index anywhere — no sibling repositories required. In dev, keep the lib fresh
with `hub sync-docs` before ingesting.

`scripts/smoke-ingest.ts` ingests a project and exits non-zero when any file
errors — used as a CI/local smoke check (`.github/workflows/ci.yml`
`ingest-smoke` job).

## Incremental behavior and re-running

- **Re-run** is cheap: unchanged files are skipped via `sourceSha`; changed
  files are re-indexed (delete + recreate + re-embed).
- **Full rebuild** of a project: `hub ingest <slug> --force`.
- **After taxonomy changes** (keywords/new categories): re-run
  `hub seed-categories --force`, then `hub classify --project <slug>` (or
  re-ingest with `--force`) to reclassify without re-embedding.
- **After a model/dims change**: `hub reindex-embeddings` recomputes chunk
  vectors in place (schema column stays `vector(768)` — see ADR 0002).
- A failed file never aborts the run: it lands in `errors`/`errorsByPath`, and
  `lastIngestedAt` is not updated for that project.
