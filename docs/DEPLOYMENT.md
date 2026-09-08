# Deployment

The Hub ships as a single Dockerized NestJS application (REST API + MCP server
+ BullMQ worker in one process) alongside PostgreSQL 16 + pgvector and Redis.
All infrastructure is declared in `docker-compose.yml`; the image is built from
the multi-stage `Dockerfile`.

## Ports and services (`docker-compose.yml`)

| Service | Image | Host port | Healthcheck | Volume |
|---|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | **11022** → 5432 | `pg_isready -U hub -d hub_unificando` (5s/5s/10) | `pgdata:/var/lib/postgresql/data` |
| `redis` | `redis:7-alpine` | **11023** → 6379 | `redis-cli ping` (5s/5s/10) | `redisdata:/data` (`--appendonly yes`) |
| `app` | `hub-unificando` (build `./Dockerfile`) | **11020** → 11020 | `fetch('http://localhost:11020/health')` (15s/5s/5) | `transformers-cache:/tmp/.transformers-cache` |

Postgres credentials inside compose are `hub:hub`, database `hub_unificando`;
Redis has no password (dev/private-net default — restrict the port in real
deployments). The `app` service `depends_on` both dependencies with
`condition: service_healthy`, so the API never races its stores.

Environment injected into `app` (all overridable from the shell):

- `NODE_ENV=production`, `PORT=11020`
- `DATABASE_URL=postgresql://hub:hub@db:5432/hub_unificando`
- `REDIS_URL=redis://redis:6379`, `REDIS_ENABLED=true`
- `KNOWLEDGE_LIB_ROOT=/app/knowledge` (the committed knowledge lib baked into
  the image — the ingestion source; dev default is `knowledge` relative to the
  repo root)
- `EMBEDDING_MODEL`/`EMBEDDING_DIMS`/`EMBEDDING_CACHE_DIR` (defaults
  `Xenova/multilingual-e5-base` / `768` / `/tmp/.transformers-cache`)
- `ADMIN_API_KEY`, `MCP_API_KEY`, `MCP_ENABLE_JSON_RESPONSE`,
  `MCP_SESSION_TTL_MIN`, `MCP_RATE_LIMIT` (passed through, empty by default)

In local dev (`docker-compose.yml`) the sibling projects are mounted
**read-only** at `/workspace/projects`:

```yaml
- /Users/renatobezerra/Developer/Unificando Hub:/workspace/projects:ro
```

## Dockerfile (multi-stage)

`Dockerfile` builds from `node:22-bookworm-slim`.

- **Stage `build`** — `npm ci`, copies `tsconfig*`/`nest-cli.json`/
  `prisma.config.ts`/`prisma`, runs `prisma generate`, copies `src`, runs
  `npm run build`. The output artifacts are `node_modules`, `dist`, `prisma`.
- **Stage `runtime`** —
  - Creates **non-root** `hubuser` (**UID 1001**) and runs as it.
  - Copies `node_modules` (the **full** tree: the entrypoint uses the `prisma`
    CLI and `tsx` for first-boot migrate/seed), `dist`, `prisma`, the
    **knowledge lib** (`knowledge/`), `package.json`, `prisma.config.ts` and
    `docker/entrypoint.sh`.
  - `ENV NODE_ENV=production`, `EXPOSE 11020`,
    `ENTRYPOINT ["docker/entrypoint.sh"]`.

`.dockerignore` excludes `.env`, `.env.*`, `node_modules`, `dist`, git
metadata — nothing secret or redundant is baked in.

## First boot: `docker/entrypoint.sh`

On every container start the entrypoint runs `set -e` bootstrap before
serving traffic:

1. `npx prisma migrate deploy` — apply pending migrations (HNSW/GIN/trgm
   indexes come from the committed migration `20260905130559_init`).
2. `node --import tsx prisma/seed.ts` — seed the 16 categories + registry of
   7 projects (idempotent upserts).
3. `node dist/scripts/seed-categories.js` — compute category prototype
   embeddings. Failure is tolerated with a warning ("as ferramentas seguirão
   por regras") because the model download needs network on first run.
4. `node dist/src/cli.js ingest` — first ingestion **from the committed
   knowledge lib** (`KNOWLEDGE_LIB_ROOT=/app/knowledge`). Idempotent (sha256
   dedupe + `pruneStaleDocuments`); a failed ingest does not stop the boot —
   re-run manually with `docker compose -f docker-compose.prod.yml exec app
   node dist/src/cli.js ingest`.
5. `exec node dist/src/main.js` — replace the shell and start API + MCP.

Consequences: the app container self-provisions a fresh database; repeated
restarts are cheap because `migrate deploy`/seeds/ingest are idempotent. The
cost is that the container must contain the full `node_modules` (no
`--omit=dev`) and needs outbound network the first time the model is
downloaded (cached in the `transformers-cache` volume).

## Production / VPS (`docker-compose.prod.yml`)

The Hub is **autonomous**: no sibling repositories, no uploaded artifacts. All
knowledge travels inside the image (`knowledge/` committed docs — including
the prompts extracted from TS sources, ADR 0010 → copied into
`/app/knowledge`). Updating the index = push a commit that updates
`knowledge/`, then rebuild:

```bash
# on dev: re-mirror the siblings and commit the lib diff
npm run hub -- sync-docs
git add knowledge && git commit -m "docs: sync knowledge lib"

# on the VPS
export POSTGRES_PASSWORD="$(openssl rand -base64 32)"   # OBRIGATÓRIO — sem a
                                                          # variável o compose
                                                          # falha (fail-closed)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app      # first boot ingests
docker compose -f docker-compose.prod.yml exec app node dist/src/cli.js status
```

O `docker-compose.prod.yml` aplica hardening (os mesmos `security_opt` /
`cap_drop`/`read_only` do compose dev) e **exige `POSTGRES_PASSWORD`**: sem a
variável no ambiente, o compose falha no `up` em vez de subir com senha
default. Atrás de proxy reverso (nginx/traefik), exporte também
`TRUST_PROXY=true` — só então o rate limit confia no `x-forwarded-for`
(ver SECURITY.md); exposição direta mantém `false` (default).

## Local development

```bash
# 1. infra only (Postgres 11022, Redis 11023)
docker compose up -d db redis

# 2. install + configure
npm install                 # postinstall runs `prisma generate`
cp .env.example .env        # then: generate ADMIN_API_KEY / MCP_API_KEY

# 3. schema + seeds + prototypes
npm run prisma:migrate      # prisma migrate dev (creates the init migration DB)
npm run prisma:seed         # 16 categories + 7 registry projects
npm run hub -- seed-categories   # prototype embeddings (downloads the model once)

# 4. mirror the siblings into the knowledge lib + ingest (reads from the lib)
npm run hub -- sync-docs    # knowledge/<slug>/; commit the result when it changes
npm run hub -- ingest

# 5. run the server
npm run start:dev           # http://localhost:11020 · Swagger /api/docs
```

Helper scripts in `package.json`: `npm run db:up` /
`npm run db:down` (`docker compose up/down db redis`), `prisma:deploy`,
`prisma:studio`.

## Running the full stack

```bash
docker compose up -d --build        # db + redis + app (entrypoint bootstraps)
docker compose ps                   # wait until app is healthy
curl http://localhost:11020/health  # { "success":true, "data": { "status":"ok", ... } }
```

Set real keys before exposing the app:

```bash
export ADMIN_API_KEY="$(openssl rand -base64 32)"
export MCP_API_KEY="$(openssl rand -base64 32)"
docker compose up -d --build
```

## Backups

Postgres owns all durable knowledge (documents, chunks, categories,
decisions, ingestion jobs). Stop-free logical backup with `pg_dump`:

```bash
docker compose exec db pg_dump -U hub -d hub_unificando --format=custom -f /tmp/hub.dump
docker compose cp db:/tmp/hub.dump ./backups/hub-$(date +%F).dump
```

Restore into the running container:

```bash
docker compose exec -T db pg_restore -U hub -d hub_unificando --clean --if-exists < hub-2026-09-05.dump
```

Redis holds only ephemeral state (BullMQ jobs, search cache): no backup needed
beyond its `appendonly` volume; a lost Redis means re-queueing an ingestion,
never data loss.

## Logs and operations

- `docker compose logs -f app` — pino JSON logs (`redact` strips
  `Authorization`); add `NODE_ENV=production` pino transport is plain JSON.
- Job visibility: `GET /api/v1/ingest/jobs/:id` or the
  `ingestion_jobs` table (`npm run prisma:studio`).
- Status smoke: `docker compose exec app node dist/src/cli.js status`.
- Model cache: named volume `transformers-cache`; delete it to force a
  re-download, or set `EMBEDDING_MODEL` to a locally cached variant.

## Deployment checklist (production-like)

- [ ] TLS termination in front (reverse proxy) + trusted `x-forwarded-for`
- [ ] Strong random `ADMIN_API_KEY` and `MCP_API_KEY`, never in git
- [ ] Restrict Postgres/Redis ports to the private network (or drop host port
      publishing entirely)
- [ ] Pin image digests and PG/Redis minors; keep `npm audit --audit-level=high`
      green in CI
- [ ] Knowledge lib commitada na imagem (`knowledge/` → `KNOWLEDGE_LIB_ROOT`);
      write the model cache volume
- [ ] Scheduled `pg_dump` (see above) with retention
