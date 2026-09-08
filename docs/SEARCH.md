# Hybrid Search

`SearchService` (`src/modules/search/search.service.ts`) answers free-text
queries by running **three independent top-k retrievals** against the chunk
store and fusing them with **weighted Reciprocal Rank Fusion (RRF)**. The SQL
for each source lives in `src/infra/vector/vector.sql.ts` — the only file that
touches the `Unsupported` vector/tsvector/trigram columns (ADR 0004). The same
fusion family ships in `med-unificando`; the Hub reuses it with the weights
below.

## The three sources

All three join `chunks` to `documents` and return the same `ChunkHitRow`
shape (`chunkId`, `documentId`, `projectSlug`, `path`, `title`, `heading`,
`anchor`, `content`, `tokenCount`, `categories`, `docType`, `score`), so every
result is a document-positioned **chunk**.

### 1. Vector (semantic) — cosine over HNSW

`vectorSearch(prisma, embedding, filters)`

- The query is embedded with the **`query: `** prefix (`QUERY_PREFIX`) and
  L2-normalized (ADR 0002).
- SQL: `score = 1 - (c.embedding <=> $1::vector)`, ordered by the cosine
  distance ascending.
- Backed by the HNSW index `chunks_embedding_hnsw_idx`
  (`vector_cosine_ops`, migration `20260905130559_init`).

### 2. Keyword (lexical) — Portuguese `tsvector`

`keywordSearch(prisma, q, filters)`

- Scored with `ts_rank_cd(to_tsvector('portuguese', c.content),
  plainto_tsquery('portuguese', $1))`, matched with `@@` on the same
  expression, served by the GIN index `chunks_content_tsv_idx`.
- Catches exact/stemmed Portuguese terms that pure semantics miss.

### 3. Fuzzy — `pg_trgm` similarity

`trigramSearch(prisma, q, filters)`

- Scores with `similarity(c.content, $1)`, keeping rows where
  `similarity > 0`; served by `chunks_content_trgm_idx` (`gin_trgm_ops`).
- Good for typos, inflected variants and partial matches.

## Fusion: weighted RRF

`SearchService.search()` runs the three queries concurrently with
`topK = FUSION_TOP_K = 60` results each, then:

```
contribution(strategy, rank) = weight[strategy] / (k + rank + 1)   rank is 0-based
RRF(chunk) = Σ contributions over the three ranked lists
```

Constants (`src/modules/search/search.service.ts`): `RRF_K = 60`,
`FUSION_TOP_K = 60`. The REST endpoint paginates with `page`/`pageSize`
(`pageSize` defaults to 20, max 100).

| Strategy | vector | keyword | trigram | Tuned for |
|---|---|---|---|---|
| `balanced` | 0.40 | 0.35 | 0.25 | default; mixed semantic/lexical |
| `recall` | 0.35 | 0.40 | 0.25 | more lexical recall |
| `precision` | 0.45 | 0.40 | 0.15 | sharper top results |

Per-hit `vectorScore` / `keywordScore` / `trigramScore` preserve what each
source contributed; `score` is the fused RRF total (a sort key, not a
probability or a cosine).

## Filters

The shared `filterSql` builder adds to all three queries: `projectSlug`
(`=`), `categories` (array overlap `d.categories && $n::text[]`), `docType`
(`=`), `contentKind` (`=`, e.g. `blog-post`); draft documents
(`isDraft=true`) are always excluded; `minScore` exists at the SQL layer but
is not exposed on the REST DTO.

## Redis cache

Cache in `SearchService` (`src/infra/redis/redis.service.ts` provides the
client). Key:

```
search:v1:<q lowercase>|<project?>|<category?>|<docType?>|<limit>|<skip>|<strategy>
```

- TTL: `SEARCH_CACHE_TTL_SECONDS` (default 60 s). Cache is best-effort
  (failures swallowed) and inactive when `REDIS_ENABLED=false`.

## REST endpoint

`GET /api/v1/search` (params in `src/modules/search/search.dto.ts`):

| Param | Type | Notes |
|---|---|---|
| `q` | string | required, non-empty, max 500 |
| `project` | string | optional (project slug; spec §10 uses `project`) |
| `category` | string | optional (single slug) |
| `docType` | string | optional |
| `contentKind` | string | optional (`blog-post`, `PROMPT`, …) |
| `page` | int | 1-based, default 1 |
| `pageSize` | int | 1-100, default 20 |
| `strategy` | enum | `balanced` \| `recall` \| `precision` |

```bash
curl "http://localhost:11020/api/v1/search?q=busca%20hibrida%20pgvector&project=med-unificando&pageSize=3"
```

```json
{ "success": true, "data": {
    "query": "busca hibrida pgvector", "strategy": "balanced", "total": 40,
    "hits": [{
      "chunkId": "cm5...", "documentId": "cm5...",
      "projectSlug": "med-unificando", "path": "docs/DATABASE.md",
      "title": "Banco de Dados > Tecnologia",
      "heading": "Banco de Dados > Tecnologia",
      "anchor": "docs/DATABASE.md#banco-de-dados-tecnologia",
      "content": "PostgreSQL 16 via Prisma 7 ...", "tokenCount": 55,
      "categories": ["database", "architecture"], "docType": "markdown",
      "score": 0.0084, "vectorScore": 0.42,
      "keywordScore": 0.012, "trigramScore": null
    }]
} }
```

`total` counts fused hits before slicing to `pageSize` (offset `page`);
scores are small fractions (`weight/(60+rank+1)` sums).

## CLI

`hub search` renders one line per hit plus a totals footer (`src/cli.ts`,
default 10 hits via `--top`/`--limit`):

```bash
npm run hub -- search "chrome extension vaga ATS" --top 5
npm run hub -- search "mcp streamable http" --project med-unificando --strategy precision
```

```
[radar-unificando] ... — docs/... (score 0.0071)
{"total": 32, "hits": 5}
```

## Worked examples

- Exact-domain terms ("prisma migration", "pgvector hnsw"): keyword leads;
  fused score stays meaningful even when cosine is flat.
- Concept query ("como expor o conhecimento para agentes"): vector leads to
  MCP/ingestion docs; trigram breaks phrasing ties.
- Typos ("hybrid searh"): trigram rescues `similarity > 0` rows; RRF
  redistributes the top list; `strategy=recall` boosts lexical ranks further.

## Tuning notes

- RRF uses each source's *ordering*, not score magnitudes, so cosine,
  ts_rank_cd and similarity need no cross-calibration.
- `topK=60` bounds the fusion window (three indexed scans); larger = more
  recall at small per-query cost, smaller = sharper precision.
- Weights were ported from med-unificando; re-tune when Hub evaluation data
  exists (ADR 0003).
