# REST API

Base URL: `http://localhost:11020` · Prefixo: `/api/v1` · Swagger UI:
`/api/docs` (OpenAPI JSON em `/api/docs-json`).

## Envelope

Toda resposta usa o envelope:

```json
// sucesso
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 7, "totalPages": 1, "hasNext": false } }

// erro
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Project \"x\" not found" } }
```

Códigos de erro estáveis: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`,
`UNAUTHORIZED`, `RATE_LIMITED`, `INGESTION_NOT_ENABLED`, `MCP_ERROR`,
`INTERNAL_ERROR`. O servidor nunca devolve detalhes internos de erros 500.

## Rate limits (por IP, janela de 60s)

- Leitura: `THROTTLE_READ` (default 120/min).
- Escrita (`POST /ingest/jobs`): `THROTTLE_WRITE` (default 30/min).
- MCP: `MCP_RATE_LIMIT` (default 120/min) — scope próprio.

## Endpoints

### Health

`GET /health` (fora do prefixo)

```json
{ "success": true, "data": { "status": "ok", "service": "hub-unificando", "version": "0.1.0", "checks": { "db": true, "redis": true }, "data": { "embeddedChunks": 2133 }, "timestamp": "..." } }
```

### Registry

| Endpoint | Descrição |
|---|---|
| `GET /projects?search=&page=&pageSize=` | lista projetos com counts (docs/chunks/decisões) |
| `GET /projects/:slug` | detalhe + lista de documentos |
| `GET /projects/:slug/documents?category=&docType=&q=&page=&pageSize=` | documentos do projeto |
| `GET /projects/:slug/decisions?status=` | ADRs do projeto |

```bash
curl "http://localhost:11020/api/v1/projects?search=med&pageSize=5"
# data[].slug, name, description, repoUrl, stack[], tags[], counts.{documents,chunks,decisions}
```

### Documentos

| Endpoint | Descrição |
|---|---|
| `GET /documents/:id` | documento + summary + categorias + contagem de chunks |
| `GET /documents/:id/chunks?page=&pageSize=` | trechos paginados (sem embedding) |

### Taxonomia

| Endpoint | Descrição |
|---|---|
| `GET /categories` | 16 categorias com `documentCount` |
| `GET /categories/:slug` | categoria individual (keywords, metadata) |

### Decisões

| Endpoint | Descrição |
|---|---|
| `GET /decisions/:id` | ADR individual |

### Busca híbrida

`GET /search?q=&projectSlug=&category=&docType=&limit=&strategy=`

```bash
curl "http://localhost:11020/api/v1/search?q=busca%20hibrida%20pgvector&limit=3"
```

```json
{
  "success": true,
  "data": {
    "query": "busca hibrida pgvector",
    "strategy": "balanced",
    "total": 40,
    "hits": [{
      "chunkId": "...", "documentId": "...", "projectSlug": "med-unificando",
      "path": "docs/DATABASE.md", "title": "Banco de Dados > Tecnologia",
      "heading": "Banco de Dados > Tecnologia", "anchor": "docs/DATABASE.md#banco-de-dados-tecnologia",
      "content": "PostgreSQL 16 via Prisma 7 ...", "tokenCount": 55,
      "categories": ["database", "architecture"], "docType": "markdown",
      "score": 0.0084, "vectorScore": 0.42, "keywordScore": 0.012, "trigramScore": null
    }]
  }
}
```

Parâmetros: `strategy` = `balanced` | `recall` | `precision`; `limit` ≤ 50;
filtros `projectSlug`/`category`/`docType`. Detalhes da fusão em
[SEARCH.md](SEARCH.md).

### Contexto para LLM

`GET /context/export?projectSlug=&topic=&categories[]=&maxTokens=`

```bash
curl "http://localhost:11020/api/v1/context/export?projectSlug=med-unificando&topic=mcp&maxTokens=4000"
```

```json
{ "success": true, "data": {
    "meta": { "projectSlug": "med-unificando", "topic": "mcp", "generatedAt": "...", "tokenBudget": 4000, "totalTokens": 3667 },
    "sections": [
      { "id": "registry", "title": "Visão Geral do Projeto", "content": "...", "tokens": 310 },
      { "id": "documents", "title": "Documentação Relevante", "content": "...", "tokens": 2900 },
      { "id": "decisions", "title": "Decisões (ADRs)", "content": "...", "tokens": 150 },
      { "id": "search", "title": "Resultados de Busca do Tópico", "content": "...", "tokens": 307 }
    ]
} }
```

### Summary / Compare

| Endpoint | Descrição |
|---|---|
| `GET /summary?projectSlug=` | resumo factual (contagens, categorias dominantes, docs recentes) |
| `GET /compare?a=<pathA>&b=<pathB>&projectSlug=` | similaridade entre dois documentos indexados |

```bash
curl "http://localhost:11020/api/v1/summary?projectSlug=radar-unificando"
curl "http://localhost:11020/api/v1/compare?a=docs/DATABASE.md&b=docs/DATABASE.md&projectSlug=med-unificando"
# { "similarity": { "headingOverlap": 1, "contentOverlap": 1, "combined": 1 }, "duplicated": true, ... }
```

### Ingestão (admin)

`Authorization: Bearer <ADMIN_API_KEY>` obrigatório (503 se a chave não
estiver configurada).

| Endpoint | Descrição |
|---|---|
| `POST /ingest/jobs` | enfileira job assíncrono (BullMQ) |
| `GET /ingest/jobs/:id` | status + stats do job |

```bash
curl -X POST http://localhost:11020/api/v1/ingest/jobs \
  -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"projectSlug":"ui-unificando"}'
# { "success": true, "data": { "jobId": "...", "queueId": "...", "status": "queued" } }
```

Corpo aceito: `{ "projectSlug"?: string, "force"?: boolean }`. `force=true`
reindexa mesmo sem mudança de conteúdo; `projectSlug` ausente = todos os
projetos habilitados.

## Validação

`ValidationPipe` global com `whitelist` + `forbidNonWhitelisted`: campos
desconhecidos ou inválidos retornam `400 VALIDATION_ERROR`. Parâmetros de
página são limitados (`pageSize` ≤ 100).
