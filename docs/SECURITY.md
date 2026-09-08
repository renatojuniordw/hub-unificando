# Security

The Hub is a knowledge platform that mixes **public reads** (REST/MCP read
tools, CLI) with **admin writes** (ingestion) and an optional **MCP agent
surface**. This document describes the threat model and the controls mapped to
it. Reference files: `src/main.ts`, `src/app.module.ts`,
`src/common/guards/admin.guard.ts`, `src/modules/mcp/mcp.security.ts`,
`src/infra/vector/vector.sql.ts`, `src/infra/prisma/raw.ts`,
`.env.example`, `Dockerfile`, `docker-compose.yml`.

## Threat model

| Surface | Trust | Attackers / risk |
|---|---|---|
| **Public read** (`/api/v1/*` GET, `/health`, Swagger) | unauthenticated | scraping/abuse → DoS via volume; nothing sensitive exposed |
| **Admin write** (`POST /ingest/jobs`, job reads) | `ADMIN_API_KEY` bearer | unauthorized ingestion / resource abuse |
| **MCP HTTP** (`/mcp`) | `MCP_API_KEY` (optional) + origin + rate limit | unauthenticated tool abuse, DNS rebinding, credential stuffing |
| **MCP stdio** | local process | only reachable by a process that can exec the CLI |
| **Content** (indexed repo markdown) | filesystem owners | XSS only if the Hub rendered it — it does not |

Data sensitivity is low (public OSS-style repo docs), but the API must not be
an open write path, an open proxy for expensive work (embeddings, ingestion),
or a way to pivot into the host.

## Authentication

- **AdminGuard** (`src/common/guards/admin.guard.ts`) protects
  `POST /api/v1/ingest/jobs` (and is referenced by the MCP write tool). It
  requires `Authorization: Bearer <ADMIN_API_KEY>` and compares with
  `timingSafeEqual` after an early length check (**constant-time**, no
  short-circuit on prefix). When `ADMIN_API_KEY` is empty the endpoints answer
  **503** ("disabled") rather than failing open — see
  `INGESTION_NOT_ENABLED` mapping in the exception filter.
- **MCP** (`mcp.security.ts`) runs before the transport, outside Nest pipes:
  1. **Origin allowlist** — requests that send an `Origin` must match
     `http://localhost:11020`, `http://127.0.0.1:11020` or an entry from
     `MCP_ALLOWED_ORIGINS`; otherwise `403`. This blocks DNS-rebinding/CSRF
     from browsers; native clients (no `Origin`) are unaffected.
  2. **Bearer API key** — when `MCP_API_KEY` is set, every request needs
     `Authorization: Bearer <key>`; comparison hashes both sides with SHA-256
     before `timingSafeEqual` (**constant-time**, lengths never leak).
  3. **Per-IP rate limit** — sliding 60s window per `clientIp()`. O IP vem do
     socket (`req.socket.remoteAddress`); `x-forwarded-for` só é considerado
     com `TRUST_PROXY=true` (atrás de proxy reverso), usando a **última**
     entrada da cadeia (a adicionada pelo proxy confiável). Com
     `TRUST_PROXY=false` (default, exposição direta), XFF forjado não
     contorna o limite. Limite `MCP_RATE_LIMIT` (default 120/min) → `429`.
  - The write tool `executar_ingestao` additionally refuses to run when
    `MCP_API_KEY` is not configured, and requires Redis to be enabled.

## Secrets handling

- No secrets live in the repo: `.env` is gitignored; only `.env.example` is
  tracked and it ships **empty** `ADMIN_API_KEY`/`MCP_API_KEY` values with a
  generation hint (`openssl rand -base64 32`).
- The Docker image is built without `.env` (`COPY .dockerignore` excludes
  `.env`, `.env.*`); keys are injected at runtime through compose
  `environment:` (or an orchestrator secret store in production).
- Key material is only ever read through the zod-validated `Env`
  (`src/shared/config/env.ts`) — never hardcoded in modules.

## Injection

- **SQLi** — all raw SQL is parameterized: `queryRows`/`$queryRawUnsafe` bind
  values (`...params`) and `vector.sql.ts` never concatenates user input into
  SQL text. Search/classifier filters build clauses from validated DTO
  values, still bound as parameters. Numeric limits (`topK`, `limit`) are
  validated upstream (DTOs/zod) before reaching LIMIT clauses.
- **Prompt injection** — indexed markdown is *data*, never instructions for
  the Hub itself. Consumers that feed context packages to LLMs should treat
  repo content as untrusted text (see CONTEXT.md); the Hub does not
  auto-execute extracted "tool calls".
- **Log injection** — pino request logging is on by default only outside
  `test`; values pass through pino serializers.

## XSS / content rendering

- The Hub is a JSON API. Repo markdown is **never rendered server-side** to
  HTML; chunk content is returned as plain text inside JSON (client-side
  rendering only). There is no CSP-relevant HTML surface beyond Swagger UI
  (`/api/docs`) and the built-in `helmet()` defaults, both applied in
  `src/main.ts`.
- `helmet()` is applied globally (`app.use(helmet())`), setting
  `X-Content-Type-Options`, frame/Sniff guards, etc.

## CORS and CSRF

- `enableCors` restricts browsers to `CORS_ORIGINS` (default
  `http://localhost:11020`) plus — for MCP — the same allowlist logic with
  `Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS` and the
  `mcp-session-id` header exposed (`MCP_ALLOWED_HEADERS`).
- Read endpoints are state-changing-free (no cookies), which removes the
  classic CSRF class; admin writes require a bearer header a cross-origin
  browser cannot attach.

## DoS / rate limiting

- **REST** — `ThrottlerModule` per-IP 60s windows: `THROTTLE_READ` (120/min)
  globally, and `POST /ingest/jobs` carrega `@Throttle(THROTTLE_WRITE)`
  (default 30/min, configurável via env). O `req.ip` do Express segue o
  mesmo `trust proxy` da config — fora de proxy, não confia em XFF.
- **MCP** — dedicated per-IP bucket (see above), session cap
  `MAX_SESSIONS = 10_000` with TTL sweep (60 min sliding, `mcp.session-manager.ts`).
- **Search costs** — embedding + three top-K queries per call are bounded:
  `topK = 60` fixed, `limit` capped at 50, results cached in Redis for
  `SEARCH_CACHE_TTL_SECONDS` (60 s) to absorb repeat queries.
- **Ingestion** — BullMQ concurrency 1 per worker/container; queue disabled
  when `REDIS_ENABLED=false` returns `400` instead of spawning work.
- **Payloads** — global `ValidationPipe` with `whitelist` +
  `forbidNonWhitelisted` rejects unknown/oversized fields (`q` ≤ 500,
  `maxTokens` ≤ 20000, `pageSize` ≤ 100, ...).

## Logging and observability

- `nestjs-pino` with `redact: ['req.headers.authorization']`
  (`src/app.module.ts`) — bearer tokens never reach logs.
- Errors: the global `HttpExceptionFilter` maps exceptions to stable codes and
  never echoes internal messages for 500s; the full stack is logged server-side
  with a `rid` correlation id.

## Dependency policy

- Dependencies are pinned in `package-lock.json`; `npm ci` everywhere
  (CI workflow and image build).
- CI runs `npm audit --audit-level=high` as a dedicated `audit` job
  (`.github/workflows/ci.yml`); treat failures as blocking and keep an
  upgrade/bump rotation for transitive deps.
- Ecosystem baseline: `nestjs-commander` is **not** used (unmaintained, 0.2.6;
  see `docs/decisions/0005-cli-without-nestjs-commander.md`).

## Running hardened

- `Dockerfile` runs as non-root UID **1001** (`hubuser`). `.env` is excluded
  by `.dockerignore`, so no key material is baked into the image — config is
  injected at runtime through `docker-compose.yml` `environment:`.
- The runtime image keeps the full `node_modules` on purpose: the entrypoint
  needs the `prisma` CLI + `tsx` for first-boot migrate/seed
  (`docker/entrypoint.sh`).
- `docker-compose.yml` mounts the sibling projects **read-only**
  (`/Users/renatobezerra/Developer/Unificando Hub:/workspace/projects:ro`),
  gives the model cache a named volume, and healthchecks the app against
  `/health`.
- In production behind a TLS-terminating proxy, set
  `NODE_ENV=production` (pino autoLogging stays on, pretty transport off) and
  `TRUST_PROXY=true` (env) — com o flag, o rate limit (REST e MCP) passa a
  confiar no `x-forwarded-for` adicionado pelo proxy e usa a **última**
  entrada. Em exposição direta (sem proxy), mantenha `TRUST_PROXY=false`
  (default): XFF do cliente é ignorado e não contorna os limites por IP.
