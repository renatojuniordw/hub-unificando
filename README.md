# hub-unificando

**Unificando Knowledge Platform** — plataforma de conhecimento do ecossistema
Unificando (registro de projetos, documentação indexada, decisões de
arquitetura e busca semântica) com **REST API oficial + Servidor MCP + CLI**.

Ela indexa os projetos irmãos (`ui-unificando`, `med-unificando`,
`pdf-unificando`, `radar-unificando`, `radar-unificando-extension`,
`prompts`, `refina`) e expõe esse conhecimento de
forma pronta para humanos, agentes e LLMs.

## O que ela faz

| Área | Como |
|---|---|
| Registry de projetos | 16 projetos multi-superfície (7 ingeridos + portfolio-ui + 8 case studies manuais) com surfaces/status/featured e counts (`GET /api/v1/projects?surface=portfolio`) |
| Blog | Posts do portfolio-ui ingeridos como `blog-post` (frontmatter title/date/tags) e servidos por `GET /api/v1/posts` |
| Ingestão | Knowledge lib commitada (`knowledge/<slug>`) → Scanner (escopo curado: docs + README/CLAUDE/AGENTS + prompts + src/content/blog) → chunking (800–1500 chars) → classificação → embeddings on-device → pgvector |
| Busca híbrida | Vetorial (HNSW cosine) + keyword (tsvector `portuguese`) + fuzzy (pg_trgm), fundidos por **RRF ponderado** (0.40/0.35/0.25, k=60) |
| Classificação | 16 categorias; regras determinísticas (keywords) → semântica (protótipos) → fallback `general` |
| Contexto p/ LLM | Pacotes otimizados por orçamento de tokens (`GET /api/v1/context/export`) |
| MCP | Servidor **Streamable HTTP** em `/mcp` + modo **stdio** com 12 tools declarativas |
| CLI | `hub sync-docs`, `hub ingest`, `hub search`, `hub context`, `hub compare`, `hub summary`, `hub classify`, `hub seed-categories`, `hub scan`, `hub status` |
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
npm run prisma:migrate        # cria o schema + índices (HNSW/GIN/trgm); se nada mudou, não gera migration
npm run prisma:seed           # 16 categorias + registry com os 7 projetos
npm run build                 # necessário: CLI/seed-categories/MCP stdio rodam do dist (tsc, não tsx)

# 3. protótipos das categorias + sincronizar a knowledge lib + ingestão
npm run hub -- seed-categories  # embeddings dos protótipos (1ª vez baixa o modelo)
npm run hub -- sync-docs        # espelha os irmãos (HUB_SCAN_ROOT) em knowledge/<slug>; commite o resultado
npm run hub -- ingest           # lê da lib: ~90 docs curados / ~540 chunks
```

A **knowledge lib** (`knowledge/<slug>`, um folder por repositório) é o espelho
commitado dos arquivos de conhecimento de cada projeto — `docs/` +
README/CLAUDE/AGENTS na raiz + `prompts/` (incluindo os prompts extraídos de
código TS, como os do radar-unificando — ADR 0010). É o que torna o Hub
**autônomo**: `git clone` + `hub ingest` reconstroem o índice em qualquer
lugar (VPS inclusive), sem depender dos repositórios irmãos. Em dev, rode
`hub sync-docs` quando os irmãos mudarem e commite o diff.

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
knowledge/               # lib commitada: docs + prompts dos 7 projetos (gerada por `hub sync-docs`)
docs/                    # documentação técnica + ADRs
```

## Documentação

| Doc | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Visão geral, módulos, fluxos e camadas |
| [docs/API.md](docs/API.md) | Endpoints REST, envelope, exemplos reais |
| [docs/MCP.md](docs/MCP.md) | Transportes, 12 tools, segurança, config de clientes |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Modelo de dados e índices |
| [docs/INGESTION.md](docs/INGESTION.md) | Knowledge lib, resolução da fonte e pipeline scanner→chunks→embeddings |
| [docs/CONTENT.md](docs/CONTENT.md) | Superfícies, registry do portfolio e blog (posts/sync) |
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
