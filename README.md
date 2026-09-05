# hub-unificando

**Unificando Knowledge Platform** — plataforma de conhecimento do ecossistema
Unificando (registro de projetos, documentação indexada, decisões de
arquitetura e busca semântica) com **REST API oficial + Servidor MCP + CLI**.

Ela indexa os projetos irmãos (`ui-unificando`, `med-unificando`,
`pdf-unificando`, `radar-unificando`, `radar-unificando-extension`,
`prompts-unificando`, `promptcraft-unificando`) e expõe esse conhecimento de
forma pronta para humanos, agentes e LLMs.

## O que ela faz

| Área | Como |
|---|---|
| Registry de projetos | 7 projetos do ecossistema com stack real, tags e contagens (`GET /api/v1/projects`) |
| Ingestão | Scanner → parsers markdown/txt → chunking (800–1500 chars) → classificação → embeddings on-device → pgvector |
| Busca híbrida | Vetorial (HNSW cosine) + keyword (tsvector `portuguese`) + fuzzy (pg_trgm), fundidos por **RRF ponderado** (0.40/0.35/0.25, k=60) |
| Classificação | 16 categorias; regras determinísticas (keywords) → semântica (protótipos) → fallback `general` |
| Contexto p/ LLM | Pacotes otimizados por orçamento de tokens (`GET /api/v1/context/export`) |
| MCP | Servidor **Streamable HTTP** em `/mcp` + modo **stdio** com 12 tools declarativas |
| CLI | `hub ingest`, `hub search`, `hub context`, `hub compare`, `hub summary`, `hub classify`, `hub seed-categories`, `hub scan`, `hub status` |
| Admin | Ingestão assíncrona via BullMQ/Redis (`POST /api/v1/ingest/jobs`) |

## Stack

NestJS 11 · Node ≥ 22 · PostgreSQL 16 + **pgvector** · Prisma 7 (driver
adapter) · Redis (BullMQ + cache) · Transformers.js (`multilingual-e5-base`,
768d, on-device) · zod · pino.

## Quick start (dev)

```bash
# 1. infra local (portas: app 11020, postgres 11022, redis 11023)
docker compose up -d db redis

# 2. instalar e configurar
npm install
cp .env.example .env          # gere um ADMIN_API_KEY (openssl rand -base64 32)
npm run prisma:migrate        # cria o schema + índices (HNSW/GIN/trgm)
npm run prisma:seed           # 16 categorias + registry com os 7 projetos
npm run hub -- seed-categories  # embeddings dos protótipos das categorias (1ª vez baixa o modelo)

# 3. ingerir o conhecimento do ecossistema (HUB_SCAN_ROOT no .env)
npm run hub -- ingest         # ~482 docs / ~2100 chunks no ecossistema atual
```

Rodar o servidor:

```bash
npm run start:dev             # http://localhost:11020 (Swagger em /api/docs)
```

## Exemplos rápidos

```bash
# REST
curl "http://localhost:11020/api/v1/search?q=busca%20hibrida%20pgvector&limit=3"
curl "http://localhost:11020/api/v1/context/export?projectSlug=med-unificando&topic=mcp&maxTokens=4000"
curl "http://localhost:11020/api/v1/summary?projectSlug=radar-unificando"

# CLI
npm run hub -- search "chrome extension vaga ATS" --limit 5
npm run hub -- compare --a docs/ARCHITECTURE.md --b docs/ARCHITECTURE.md --project radar-unificando

# MCP (Streamable HTTP) — handshake:
curl -X POST http://localhost:11020/mcp -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```

Clientes MCP (Claude Desktop/Cursor/opencode) podem apontar para:

```json
{ "mcpServers": { "hub-unificando": { "command": "node", "args": ["<caminho>/hub-unificando/dist/src/mcp-stdio.js"] } } }
```

ou (URL local): `http://localhost:11020/mcp`.

## Estrutura

```
src/
  cli.ts                 # CLI (commander + Nest application context)
  mcp-stdio.ts           # entry point MCP stdio
  app.module.ts / main.ts
  common/                # envelope {success,data,meta} / filtro de erro / guards / DTOs
  infra/
    prisma/              # PrismaService (adapter-pg) + queryRows tipado
    vector/vector.sql.ts # único lugar que toca colunas vector/tsvector/trgm
    embedding/           # EmbeddingProvider (Transformers.js v4, lazy)
    redis/               # RedisService (cache + conexão)
  modules/
    projects|documents|categories|decisions   # domínio de leitura (CRUD R)
    classification/      # ClassifierService (regras + semântica)
    ingestion/           # scanner, parsers, chunker, orquestrador, fila, controller
    search/              # SearchService (RRF)
    context/             # ContextAssembler, Compare, Summary
    mcp/                 # servidor MCP + tools (12)
prisma/
  schema.prisma          # data model (projetos/doc/chunks/categorias/decisões)
  migrations/            # inclui índices HNSW/GIN/pg_trgm
  seed.ts                # categorias + registry
docs/                    # documentação técnica + ADRs
```

## Documentação

| Doc | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Visão geral, módulos, fluxos e camadas |
| [docs/API.md](docs/API.md) | Endpoints REST, envelope, exemplos reais |
| [docs/MCP.md](docs/MCP.md) | Transportes, 12 tools, segurança, config de clientes |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Modelo de dados e índices |
| [docs/INGESTION.md](docs/INGESTION.md) | Pipeline scanner→chunks→embeddings |
| [docs/SEARCH.md](docs/SEARCH.md) | Busca híbrida + RRF |
| [docs/CLASSIFICATION.md](docs/CLASSIFICATION.md) | Taxonomia e classificador |
| [docs/CONTEXT.md](docs/CONTEXT.md) | Pacotes de contexto para LLM |
| [docs/SECURITY.md](docs/SECURITY.md) | Segurança e threat model |
| [docs/TESTING.md](docs/TESTING.md) | Testes (unit/e2e/Testcontainers) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker/CI/deploy |
| [docs/decisions/](docs/decisions/) | ADRs do projeto |

## Testes e qualidade

```bash
npm run lint && npm run typecheck
npm run test               # unit
npm run test:e2e           # REST (precisa do Postgres local)
npm run test:integration   # Testcontainers (pgvector real, hermético)
npm run hub -- ingest --dry-run   # smoke de scan sem escrever
```

## Segurança

Endpoints de escrita exigem `ADMIN_API_KEY` (Bearer, comparação em tempo
constante). O MCP tem `MCP_API_KEY` opcional, allowlist de origins e rate
limit próprio. Todo SQL é parametrizado (nunca concatena entrada). Detalhes em
[docs/SECURITY.md](docs/SECURITY.md).

## Licença

MIT — projeto privado do laboratório Unificando (Renato Bezerra).
