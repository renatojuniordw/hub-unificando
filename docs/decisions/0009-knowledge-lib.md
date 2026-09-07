# 0009 — Committed knowledge lib (`knowledge/`) replaces the knowledge bundle

Date: 2026-09-07 · Status: accepted

## Context

The Hub ingests the ecosystem's documentation. Until now the ingestion read
the sibling repositories directly: `Project.folderPath` resolved against
`HUB_SCAN_ROOT` (the parent folder of the sibling checkouts). That forces the
VPS to either host every sibling repository or receive a transport artifact —
the "knowledge bundle", a `.tar.gz` of the indexable files generated on the
dev machine, uploaded into a volume and re-ingested by a `sync` cron service.

The bundle made the Hub transportable but not autonomous: it depended on a
manual artifact, was versioned outside git, and the tar/unpack/sync machinery
(plus the `tar` dependency) existed only to carry a copy of files that could
just live in the Hub's own repository.

At the same time an agreed change to the ingestion scope was still pending:
index only **real documentation** (`docs/`/`documentation` at any depth,
`README.md`/`CLAUDE.md`/`AGENTS.md` at the project root, and root `prompts/`,
always `.md/.mdx/.txt`) instead of every loose `.md` file — shrinking the
index from ~480 to ~80 curated documents (docs/CHANGES-knowledge-scope.md).

## Decision

1. **Committed knowledge lib** — a `knowledge/<slug>/` folder in the Hub repo
   mirrors, per project, every file that passes the curated ingestion scope.
   The folder name is the **repository name** (`Project.slug`), not the local
   `folderPath` — several folder names diverge from their repos
   (`radar/radar-*` workspaces, `SITE_HIGH_CONVERSION_ARQUITETURA`,
   `unificando-promptgen`).
2. **Three-layer source resolution** (`src/modules/ingestion/scan/
   project-source.ts`) for ingestion: absolute `folderPath` (test fixtures) →
   knowledge lib `KNOWLEDGE_LIB_ROOT/<slug>` when present → `HUB_SCAN_ROOT/
   <folderPath>` as a dev fallback. The lib is the preferred source, so dev
   and VPS read the same files.
3. **`hub sync-docs`** mirrors the lib from the live siblings under
   `HUB_SCAN_ROOT` (dev command), copying the scanned files into
   `knowledge/<slug>/` and pruning lib files that left the scope. A project
   whose source folder is missing is skipped with a warning — it never prunes.
   The resulting `knowledge/` diff is committed to git.
4. **Curated scope implemented now** — `isKnowledgePath` in
   `src/modules/ingestion/scan/knowledge-path.ts` replaces the generic
   `INDEXABLE_EXTENSIONS` rule; the index converges on the next `hub ingest`
   (`pruneStaleDocuments` already purges orphaned rows).
5. **Knowledge bundle removed** — `export-knowledge`/`sync` CLI tools, the
   `KnowledgeBundleService`, the `sync` service + `bundle-data` volume in
   `docker-compose.prod.yml` and the `tar` dependency are gone.
6. **Production ships the lib inside the image** — the Dockerfile copies
   `knowledge/` to `/app/knowledge` (`KNOWLEDGE_LIB_ROOT=/app/knowledge`) and
   the entrypoint runs `hub ingest` from it on first boot (idempotent; a
   failure logs a warning and does not stop the app). Updating the index =
   committing a `knowledge/` change and rebuilding.

## Alternatives considered

- **Keep the knowledge bundle** as the transport (tar.gz + `sync` cron): still
  depends on a manually produced artifact; the lib makes it unnecessary.
- **Mount a volume / fetch repos on the VPS** (`sourceType: "git"`): each repo
  clone adds moving parts (auth, scheduling, network) and the Hub would index
  codebases it doesn't own; cloning from GitHub adds API/rate-limit coupling.
- **Index scope unchanged**: the lib would carry ~117 files of uneven value;
  the curated scope (already decided) keeps the lib and the index focused.

## Consequences

- Deploy = `git clone`/pull + `docker compose up -d --build`; the Hub runs
  anywhere with no siblings and no uploads.
- Dev workflow gains a step: run `hub sync-docs` when siblings change and
  commit the `knowledge/` diff (the diff *is* the documentation delta).
- `hub scan` still reads the siblings under `HUB_SCAN_ROOT` for registry
  metadata (description/stack/repoUrl); the lib is only an ingestion source.
- `document.path` values are unchanged (relative to the project root), so
  dedupe and pruning semantics are preserved.
