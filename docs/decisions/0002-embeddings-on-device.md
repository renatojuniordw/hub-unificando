# ADR 0002: On-device embeddings with Transformers.js (multilingual-e5-base)

Date: 2026-09-05

Status: accepted

## Context

Every chunk and every category prototype needs a text embedding, and queries
must be embedded with the same model. The options were: call a hosted
embedding API (OpenAI `text-embedding-3-*`, Cohere, etc.), run a local model
server, or embed **on-device inside the Hub process**. Constraints:

- The corpus is Portuguese/English ecosystem documentation (internal quality,
  not a public dataset) and must be indexable **offline** (Docker first boot
  in restricted networks).
- `med-unificando` already embeds with the **e5 family**; embeddings must be
  mutually intelligible so tooling can move between projects.
- No per-call cost and no data egress for document content.

## Decision

Use `@huggingface/transformers` **v4** (`^4.2.0`) with the ONNX model
**`Xenova/multilingual-e5-base`** (768 dimensions), quantized **`dtype: 'q8'`**,
running **in-process** behind the `EmbeddingProvider` abstraction
(`src/infra/embedding/`).

Concrete contract (implemented in `src/infra/embedding/transformers.provider.ts`):

- Feature-extraction pipeline built lazily on first use and cached for the
  lifetime of the process (a shared `loading` promise makes concurrent callers
  wait for one load).
- Text is prefixed per e5 training: `passage: ` for indexed content,
  `query: ` for searches (`PASSAGE_PREFIX`/`QUERY_PREFIX` in
  `src/shared/constants.ts`) — the same convention med-unificando uses, so
  cosine similarity stays comparable.
- `pooling: 'mean'`, `normalize: true` (L2-normalized vectors — required for
  the HNSW `vector_cosine_ops` index semantics).
- Batching in `EMBEDDING_BATCH_SIZE` slices (default 50); model + cache dir
  configured via `EMBEDDING_MODEL`/`EMBEDDING_DIMS`/`EMBEDDING_CACHE_DIR`
  (default `/tmp/.transformers-cache`).

Dimension is locked at **768** by the schema columns
`Unsupported("vector(768)")` and `EMBEDDING_DIMS=768`.

## Alternatives considered

- **Hosted embeddings (OpenAI/Cohere API).** Best raw quality, zero ops, but:
  per-token cost across re-ingests, document content leaves the machine,
  requires network at runtime, and adds a secret + external dependency. The
  Hub's whole value proposition includes indexing private-ish repos offline.
  Rejected.
- **`Xenova/multilingual-e5-small` (384d) / `large` (1024d).** Smaller is
  cheaper/faster but weaker on Portuguese nuance and diverges from
  med-unificando's 768d vectors; larger costs RAM/CPU with little gain at this
  corpus size. `base` 768d keeps drop-in compatibility. Rejected for now;
  switching dims would require a data migration (column type + index rebuild)
  regardless.
- **Remote model server (Ollama/TEI).** Adds an infra component and an HTTP
  hop for marginal throughput; fine later if CPU saturation appears. Rejected
  for v1.

## Consequences

Positive:

- Privacy: document content never leaves the process (only ONNX weights are
  downloaded once and cached in `EMBEDDING_CACHE_DIR`).
- Cost-free re-indexing and per-query embeddings; fully offline operation
  after the model cache is warm.
- Cross-project compatibility with med-unificando (same model family,
  prefixes, L2 normalization).

Negative / costs:

- **CPU**: feature extraction runs on the main Node process (single-threaded)
  — ingestion throughput and search latency are bounded by CPU. Mitigations:
  batch size 50, lazy load, and `MAX_CONCURRENT_JOBS`/worker concurrency of 1
  per container.
- **Cold start**: first embed waits for model load + (on first ever run) the
  ONNX download; `seed-categories`/ingest logs time-to-ready so operators see
  it. Backlog item: warm the model at boot.
- **q8 quantization** trades a little accuracy for memory/speed; accepted for
  v1 (the corpus is documentation, not a precision benchmark).
- Changing the model/dimension later requires a migration (see ADR 0001's
  lock-in note and `docs/DATA-MODEL.md`).
