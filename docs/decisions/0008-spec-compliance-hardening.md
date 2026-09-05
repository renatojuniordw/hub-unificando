# 0008 — Post-delivery spec compliance hardening

Date: 2026-09-05 · Status: accepted

## Context

A post-delivery audit compared the implementation against the original spec
(`../hub-unificando-prompt.md`) and found a set of gaps. This ADR records the
fixes applied and the few intentional interpretations.

## Decisions

1. **Chunker never mixes two H1 documents** — `ChunkService` now flushes the
   buffer whenever a section's top-level heading differs from the buffer's,
   so two H1 documents never share a chunk (sub-headings under the same H1
   still merge). Matches spec §7.4 and its mandatory test.
2. **Scanner exclusions hardened** — dot-directories are always skipped,
   `public` is only walked when it hosts docs (`docs`/`documentation`
   subfolder), and nested git checkouts (a `.git` inside a subfolder, e.g. a
   vendor clone inside `radar-unificando`) are skipped. Orphaned rows for
   files that disappear from a scan are purged after each project ingest.
   Spec §7.2.
3. **Path specialization (§8.2.5)** — deterministic per-path overrides in
   `src/modules/classification/path-specialization.ts` run after the hybrid
   classifier: `prompts/*.md → prompt` (with `metadata.promptId`),
   `CLAUDE.md`/`AGENTS.md → workflow`, `*mcp*.md|mcp/ → mcp`,
   `design-system* → design-system`, `README.md → general|api` heuristic.
4. **ADRs become Decision rows** — files under a `decisions/` folder are
   mirrored into the `decisions` table (title from the first H1, status
   parsed from `Status:`/`status:` markers, summary from the first
   paragraphs). `/decisions` endpoints and the `decisoes_previas` context
   section now have data whenever projects carry ADRs.
5. **LLM context catalog (§12)** — `ContextAssemblerService` was rebuilt to
   the spec catalog (`visao_geral`, `arquitetura`, `design_system` with
   fallback to the `ui-unificando` brand DS, `componentes_reutilizaveis`,
   `exemplos`, `decisoes_previas`, `convencoes`, `fontes`). Every included
   chunk carries an inline `_Fonte:_` and the `fontes` section lists
   `project/path#anchor (≈ N tokens)`.
6. **API contract names per §10/§12** — `/search` uses `project`, `page`,
   `pageSize` (max 100); `/compare` uses `pathA`/`pathB` (or `idA`/`idB`);
   `/summary` supports `target=project|document`; `/context/export` uses
   `project` plus an optional CSV `sections`. Docs updated to match.
7. **Stable custom index names** — all hand-written search indexes use the
   `idx_` prefix (including the full-text expression index) so `prisma
   migrate` never drifts them.
8. **Embedding dims are fixed at the column level** — the `chunks.embedding`
   column is `vector(768)` (multilingual-e5-base). `EMBEDDING_DIMS` must stay
   in sync with the column; changing model/dims requires a migration plus
   `hub reindex-embeddings` (ADR 0002). No code path silently writes
   mismatched dimensions.

## Status

Applied in the working tree (post-`2b8ef1d`) with unit/integration/e2e green.
