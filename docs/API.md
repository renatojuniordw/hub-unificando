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
- Escrita (`POST /ingest/jobs`): `THROTTLE_WRITE` (default 30/min) — aplicado via
  `@Throttle` no controller.
- MCP: `MCP_RATE_LIMIT` (default 120/min) — scope próprio.

> O IP usado nos rate limits é o socket (`req.ip`). Apenas com `TRUST_PROXY=true`
> (atrás de proxy reverso) o `x-forwarded-for` é considerado — usando a última
> entrada, adicionada pelo proxy confiável (ver SECURITY.md).

## Endpoints

### Health

`GET /health` (fora do prefixo)

```json
{ "success": true, "data": { "status": "ok", "service": "hub-unificando", "version": "0.1.0", "checks": { "db": true, "redis": true }, "data": { "embeddedChunks": 2133 }, "timestamp": "..." } }
```

`status` é `ok` quando `db` e `redis` respondem e a contagem de embeddings pôde
ser lida; qualquer falha (inclusive na contagem) degrada para `degraded` com
`embeddedChunks: null` — o probe nunca devolve 500.

### Registry

| Endpoint | Descrição |
|---|---|
| `GET /projects?search=&surface=&featured=&page=&pageSize=` | lista projetos com counts (docs/chunks/decisões); `surface` = `unificando`\|`portfolio`\|`internal`, `featured=true` para destaques (docs/CONTENT.md) |
| `GET /projects/:slug` | detalhe + lista de documentos |
| `GET /projects/:slug/documents?category=&docType=&q=&page=&pageSize=` | documentos do projeto |
| `GET /projects/:slug/decisions?status=` | ADRs do projeto |

### Posts (blog)

| Endpoint | Descrição |
|---|---|
| `GET /posts?tag=&project=&page=&pageSize=` | blog posts publicados (`contentKind=blog-post`), mais recentes primeiro |
| `GET /posts/:slug` | post completo (markdown + metadados + tags + publishedAt); slug = basename sem `.md` |

```bash
curl "http://localhost:11020/api/v1/posts?tag=IA&pageSize=5"
# data[].slug, title, summary, date, tags[], projectSlug
curl "http://localhost:11020/api/v1/posts/mcp-gupy-vagas-personalizadas-com-ia"
# data.{slug,title,summary,date,tags,content,readingTime,category}
```

```bash
curl "http://localhost:11020/api/v1/projects?search=med&pageSize=5"
# data[].slug, name, description, repoUrl, stack[], tags[], counts.{documents,chunks,decisions}
```

### Documentos

| Endpoint | Descrição |
|---|---|
| `GET /documents/:id` | documento + summary + categorias + contagem de chunks |
| `GET /documents/:id/chunks?page=&pageSize=` | trechos paginados (sem embedding) |
| `GET /projects/:slug/documents/by-path?path=` | documento por path relativo (404 `NOT_FOUND` se não existir) — ver curl abaixo |

```bash
curl "http://localhost:11020/api/v1/projects/med-unificando/documents/by-path?path=docs%2FDATABASE.md"
# → { "success": true, "data": { "id": "...", "path": "docs/DATABASE.md", ... } }
curl "http://localhost:11020/api/v1/projects/med-unificando/documents/by-path?path=docs%2Fnao-existe.md"
# → 404 { "success": false, "error": { "code": "NOT_FOUND", "message": "Document \"docs/nao-existe.md\" not found in project \"med-unificando\"" } }
```

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

`GET /search?q=&project=&category=&docType=&contentKind=&page=&pageSize=&strategy=`

```bash
curl "http://localhost:11020/api/v1/search?q=busca%20hibrida%20pgvector&project=med-unificando&pageSize=3"
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

Parâmetros: `strategy` = `balanced` | `recall` | `precision`; paginação
`page`/`pageSize` (`pageSize` ≤ 100); filtros `project`/`category`/`docType`;
`minScore` (float) corta resultados por score de fusão (RRF) **antes** da
paginação — `total` reflete o pool qualificado, não a página retornada.
Detalhes da fusão em [SEARCH.md](SEARCH.md).

### Contexto para LLM

`GET /context/export?project=&topic=&maxTokens=&sections=`

```bash
curl "http://localhost:11020/api/v1/context/export?project=med-unificando&topic=mcp&maxTokens=4000"
```

```json
{ "success": true, "data": {
    "meta": { "projectSlug": "med-unificando", "topic": "mcp", "generatedAt": "...", "tokenBudget": 4000, "totalTokens": 3667 },
    "sections": [
      { "id": "visao_geral", "title": "Visão Geral", "content": "...", "tokens": 310 },
      { "id": "arquitetura", "title": "Arquitetura", "content": "#### Camadas ...\n_Fonte: docs/ARCHITECTURE.md#camadas_", "tokens": 900 },
      { "id": "design_system", "title": "Design System", "content": "...", "tokens": 700 },
      { "id": "componentes_reutilizaveis", "title": "Componentes reutilizáveis", "content": "...", "tokens": 500 },
      { "id": "exemplos", "title": "Exemplos", "content": "...", "tokens": 400 },
      { "id": "decisoes_previas", "title": "Decisões prévias", "content": "...", "tokens": 150 },
      { "id": "convencoes", "title": "Convenções", "content": "...", "tokens": 400 },
      { "id": "fontes", "title": "Fontes", "content": "- med-unificando/docs/MCP.md#mcp (≈ 55 tokens)", "tokens": 150 }
    ]
} }
```

Seções opcionais via `sections=arquitetura,design_system,fontes` (CSV). O
pacote segue o catálogo da spec §12 e sempre lista as fontes incluídas.

### Summary / Compare

| Endpoint | Descrição |
|---|---|
| `GET /summary?target=project&project=` | resumo contextual de um projeto |
| `GET /summary?target=document&project=&path=` (ou `id=`) | resumo de um documento |
| `GET /compare?pathA=&pathB=&project=` (ou `idA=&idB=`) | similaridade entre dois documentos indexados |

```bash
curl "http://localhost:11020/api/v1/summary?target=project&project=radar-unificando"
curl "http://localhost:11020/api/v1/summary?target=document&project=med-unificando&path=docs/DATABASE.md"
curl "http://localhost:11020/api/v1/compare?pathA=docs/DATABASE.md&pathB=docs/DATABASE.md&project=med-unificando"
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
