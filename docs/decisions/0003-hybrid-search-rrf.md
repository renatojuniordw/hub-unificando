# ADR 0003: Hybrid search fused with weighted RRF

Date: 2026-09-05

Status: accepted

## Context

A knowledge platform query like "como montar um workspace chrome extension"
is never answered well by one retrieval strategy alone:

- **Pure vector search** (pgvector cosine over HNSW) handles paraphrase and
  semantics but misses exact identifiers (`prisma migrate deploy`,
  `pg_trgm`, `CLAUDE.md`) and can bury rare-but-exact matches.
- **Pure keyword** (`tsvector`) is precise for terms but blind to synonyms,
  typos and inflection drift.
- **Pure fuzzy** (`pg_trgm`) rescues typos but has no notion of meaning.

The previous med-unificando implementation already demonstrated that a
**weighted Reciprocal Rank Fusion** of vector + keyword + fuzzy produced the
best practical ranking for Portuguese domain docs; the Hub corpus is the same
family of content.

## Decision

`SearchService` (`src/modules/search/search.service.ts`) runs three indexed
retrievals concurrently, each capped at `FUSION_TOP_K = 60`, and fuses them by
RRF:

```
RRF(chunk) = Σ  weight[strategy][source] / (RRF_K + rank + 1)   # rank is 0-based
```

Constants and weight table (documented in `docs/SEARCH.md`):

- `RRF_K = 60`, `FUSION_TOP_K = 60`.
- `balanced`  → vector **0.40** · keyword **0.35** · trigram **0.25** (default)
- `recall`    → vector 0.35 · keyword 0.40 · trigram 0.25
- `precision` → vector 0.45 · keyword 0.40 · trigram 0.15

The three SQL sources live only in `src/infra/vector/vector.sql.ts`:

1. `vectorSearch` — cosine `1 - (embedding <=> $1::vector)` over the HNSW
   `chunks_embedding_hnsw_idx` (query prefixed with `query: `, ADR 0002).
2. `keywordSearch` — `ts_rank_cd` over `to_tsvector('portuguese', content)`
   with `plainto_tsquery`, served by the GIN expression index.
3. `trigramSearch` — `similarity(content, $1)` via the GIN `gin_trgm_ops`
   index.

Raw scores are never compared across sources — RRF only uses each source's
*ordering*, so cosine magnitudes, ts_rank_cd ranges and trigram similarities
need no cross-calibration. Per-source scores are surfaced on each hit for
debugging.

## Alternatives considered

- **Pure pgvector semantic search.** Simplest, but regresses on identifier
  queries and Portuguese lexical recall; also leaves the expensive keyword/
  trigram GIN indexes unused. Rejected.
- **Weighted linear score fusion** (e.g. `0.4·cos + 0.35·rank + 0.25·sim`).
  Requires score normalization/calibration that drifts as the corpus grows;
  RRF is scale-free and was already proven in med-unificando. Rejected.
- **Fixed-weights-only (no strategy profiles).** Agents and CLI need a
  "recall-heavy" knob for fuzzy/repo-wide questions and a "precision" profile
  for short factual lookups; three static presets cost nothing. Accepted as
  the `strategy` query parameter.
- **Hybrid ranking in one SQL query.** Complex planner/parametrization
  problems, no per-source observability, harder to cache. Rejected.

## Consequences

Positive:

- Robust to the three failure modes above, with a single tunable lever
  (`k`, `topK`, per-profile weights) and per-hit provenance
  (`vectorScore`/`keywordScore`/`trigramScore`).
- Reuses indexed sources already required by the schema, so no new storage.
- Response cached in Redis (`search:v1:...`, TTL `SEARCH_CACHE_TTL_SECONDS`),
  absorbing repeat queries.

Negative / costs:

- Three queries per search instead of one — bounded by `topK = 60` and served
  by indexes; mitigated by the Redis cache.
- RRF exposes an ordinal score (small fractions), not a probability users can
  interpret as "relevance %"; callers must treat `score` as a sort key only.
- The 0.40/0.35/0.25 profile is inherited from med-unificando tuning, not yet
  re-tuned on Hub evaluation data — tracked as backlog in `docs/SEARCH.md`.
