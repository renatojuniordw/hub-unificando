# Segurança

## Visão Geral

Esta aplicação implementa múltiplas camadas de segurança seguindo princípios OWASP.

## Medidas Implementadas

### Autenticação
- **NextAuth v5** com Credentials provider e estratégia JWT
- Sessão expira em 24 horas (`maxAge: 86400`)
- Cookies `secure` em produção
- Senhas com hash bcrypt (salt + hash)
- JWT com `maxAge: 86400` e role/id no token

### Controle de Acesso
- **Páginas admin**: `/admin/(protected)/*` exigem sessão — o layout redireciona para `/admin/login`; `/admin/import` tem callback `authorized` no NextAuth
- **Server actions admin**: `withAdmin` / `withAdminReturn` em `src/lib/auth-guard.ts` (role `ADMIN`)
- **APIs admin**: `/api/search-analytics` e GET `/api/search-feedback` retornam 401 sem role `ADMIN`
- **Rate limit por rota** (`src/lib/rate-limit.ts` — `Map<string, { count, resetAt }>` em memória, janela 60s, com **sweep/evict** de buckets expirados, teto de 10.000):
  - `/api/medicines`: 60 req/min/IP
  - `/api/autocomplete`: 120 req/min/IP
  - `POST /api/search-feedback`: 20 req/min/IP
  - `/api/auth/callback/credentials` (POST login): 10 req/min/IP — aplicado no wrapper de `src/app/api/auth/[...nextauth]/route.ts` **antes** de delegar ao handler; `src/proxy.ts` (`matcher: ['/admin/login', '/api/auth/callback/credentials']`) reforça na borda
- **Rate limit em server actions públicas** (`src/lib/rate-limit-action.ts`, mesmo limiter por IP):
  - `searchMedicines` e `hybridSearch`: 120 req/min/IP
  - `searchAutocomplete`: 120 req/min/IP
  - `exportToExcel`/`exportToCsv`: 30 req/min/IP
  - `submitSearchFeedback`: 20 req/min/IP (mesmo limite da rota `/api/search-feedback`)
- Em excesso: `429` com header `Retry-After` (rotas) ou erro `RATE_LIMIT_ERROR` (actions)

### Headers de Segurança
- `Content-Security-Policy` (definida em `next.config.ts`):
  ```
  default-src 'self'
  img-src 'self' https: data:
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  font-src 'self' https://fonts.gstatic.com data:
  script-src 'self' 'unsafe-inline'            # development adiciona 'unsafe-eval'
  connect-src 'self' https://dados.anvisa.gov.br
  frame-ancestors 'none'
  base-uri 'self'
  form-action 'self'
  ```
- As fontes da aplicação são **self-hosted** via `next/font` (`/_next/static/media/...`, permitidas por `'self'`) — não há dependência de CDN de fontes no bundle
- `X-Frame-Options: DENY` (camada dupla com `frame-ancestors 'none'`)
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block` (opcional, adicionado no Nginx — não habilitado na aplicação)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (servido pela **aplicação** via `next.config.ts`)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Docker Security
- Containers rodando como não-root (UID 1001)
- `no-new-privileges: true`
- `cap_drop: ALL` + capabilities mínimas necessárias
- `read_only: true` no filesystem
- Portas internas (5432) não expostas externamente
- Rede isolada (`172.28.0.0/16`)
- Limites de memória e CPU
- **`.dockerignore`** exclui `.env`, `.env.*`, `node_modules`, `.git`, `docs`, `README.md` e artefatos de teste do build context — segredos reais nunca entram no build

### Infraestrutura
- Nginx como reverse proxy com TLS 1.2/1.3
- Certificados Let's Encrypt com auto-renovação
- Rate limiting no Nginx (30 req/s API, 100 req/s geral)
- Cache de estáticos (assets: 30 dias, embeddings: 1 dia)
- Gzip para texto, CSS, JS, JSON

### TLS de saída
- Verificação TLS **habilitada por padrão** no processo; o único bypass é **escopado ao host ANVISA** via agente dedicado (`src/lib/anvisa-https.ts`), necessário pelos certificados ICP-Brasil fora das CAs padrão do Node
- Não existe mais `NODE_TLS_REJECT_UNAUTHORIZED=0` global (removido do `docker-entrypoint.sh`, seed e cron)

### Dados
- `.env` não commitado (`.gitignore`)
- Senhas não armazenadas em texto puro (bcrypt)
- CSV sanitizado antes de parsing (remove chars de controle)
- `escapeCsv()` para prevenir injection em exports
- **Erros sanitizados**: `submitSearchFeedback` nunca devolve `error.message` ao client (detalhes do Prisma/SQL ficam só no log do servidor); as demais rotas públicas retornam mensagens genéricas

### LGPD / Privacidade
- Política de privacidade pública em `/privacidade` (dados coletados, finalidade, base legal, retenção, direitos do titular)
- Logs de busca anônimos (sem IP/UA/cookies de rastreamento)
- Retenção de `search_logs`/`search_feedback`: 12 meses, com purge agendado (`npm run purge:logs` → `scripts/purge-search-logs.ts`)

### PWA / Service Worker
- `public/sw.js` implementa cache (navegações network-first; `_next/static` cache-first) **excluindo deliberadamente `/admin`, `/api` e `/dashboard`** — sessão e dados dinâmicos nunca são servidos de cache offline
- Registro via `src/components/pwa-register.tsx` (somente contexto seguro: https ou localhost)
- Manifest com Ícones instaláveis (`icon-192.png`/`icon-512.png`), `display: standalone`

### Sanitização de Input
- Feedback de busca validado em `src/lib/actions/search-feedback.ts`:
  - Verificação de campos obrigatórios (`query`, `medicineId`, `medicineName`, `feedback`)
  - Validação de enum (`helpful` | `not_helpful`)
  - `query` convertida para lowercase e trim (via `normalizeQuery`)
  - `query` limitada a 200 chars, `medicineName` a 300 chars
  - `medicineId` validado como inteiro positivo

### Vulnerabilidades Conhecidas

Estado atual: `npm audit --omit=dev` — **0 críticas, 9 altas**. As que permanecem sem fix compatível (fora do range atual ou exigem upgrade breaking) são:

| Dependência | Severidade | Status |
|-------------|------------|--------|
| `xlsx@0.18.5` | High | **Sem fix disponível** — mitigado: fonte confiável (ANVISA), input sanitizado e export limitado por rate limit (30/min) |
| `sharp` (via `@xenova/transformers`) | High | **Mitigado** — não exercitado pela pipeline de embeddings textuais; upgrade exige major do transformers |
| `next`/`postcss` | High | **Mitigado** — fix exige next 16.3.4 (fora do range atual); exposição limitada |
| tooling Prisma (`deepmerge-ts`, `mysql2`, `hono`) | High | **Mitigado** — dependências apenas de dev/toolchain, não do runtime da aplicação |
| `protobufjs@7.x` | (antiga Critical) | **Corrigido** — `overrides` força versão segura |

## MCP Server (`/api/mcp`)

O endpoint MCP (Streamable HTTP) segue o mesmo modelo de segurança da API
pública, com camadas adicionais exigidas pelo spec:

- **Origin allowlist (anti DNS rebinding)** — se o header `Origin` vier presente
  (navegadores), precisa estar na allowlist (`BASE_URL` + `MCP_ALLOWED_ORIGINS`);
  clientes nativos (Claude/Cursor/opencode) não enviam `Origin` e são aceitos.
  Fora da lista → `403`.
- **API key opcional** — com `MCP_API_KEY` definida, toda requisição exige
  `Authorization: Bearer <key>` (comparação constant-time via
  `crypto.timingSafeEqual` com hash SHA-256); senão → `401`.
- **CORS para navegadores** — a rota ecoa `Access-Control-Allow-Origin` apenas
  para origens permitidas e responde preflight `OPTIONS` (o transporte MCP não
  emite CORS por conta própria). Consumo principal: clientes nativos.
- **Rate limit por IP** — escopo `mcp`, default `120 req/min` (`MCP_RATE_LIMIT`),
  reusando `src/lib/rate-limit.ts` (mesmo limiter e sweep das rotas `/api`).
- **Somente leitura** — expõe apenas as Server Actions públicas de consulta
  (`src/lib/actions/*`). Actions administrativas (`withAdmin`/`withAdminReturn`,
  `revalidatePath`, escrita em banco) **não** são registradas como tools.
- **Erros genéricos** — as tools nunca devolvem detalhes internos; apenas
  `Erro interno ao executar a ferramenta` (detalhe vai para o log do servidor).
- **Sessões com TTL** — mapa em memória com sweep (teto 10k, padrão do
  rate-limit); TTL `MCP_SESSION_TTL_MIN` (default 60min, renovação deslizante).
  Sessão inválida/expirada → `404`, o cliente reinicializa (spec).

Implementação: `src/lib/mcp/security.ts`, `src/lib/mcp/session.ts`.

## Limitações Conhecidas

1. **Rate limit em memória** — Implementado via `Map<string, { count, resetAt }>` em `src/lib/rate-limit.ts` (rotas e actions) e `src/lib/mcp/session.ts` (sessões MCP). Funciona para single-instância. Para múltiplas instâncias/workers, migrar para Redis.
2. **Spoofing de IP** — `getClientIp` usa o primeiro valor de `x-forwarded-for`. Em produção atrás de proxy, garantir que o proxy sobrescreva o header para não permitir burlar o limite por IP.
3. **xlsx@0.18.5** — Sem fix disponível para prototype pollution. Mitigado por ser fonte confiável (ANVISA) e uso restrito a admin.
4. **Autenticação simples** — Apenas email/senha com Credentials provider. Sem 2FA. Para produção com dados sensíveis, considerar 2FA.
5. **ANVISA ICP-Brasil** — Bypass de verificação TLS escopado ao host ANVISA (`src/lib/anvisa-https.ts`). Necessário até que a cadeia ICP-Brasil seja suportada pelo CA store do Node no ambiente.

## Relatório de Auditoria

Auditoria de segurança/LGPD/deploy em 03/09/2026 (read-only) — `docs/relatorio-seguranca-lgpd-deploy.md`:
- 38 itens avaliados: 3 altos e 7 médios identificados; **correções aplicadas em 03/09/2026** (upgrade `next-auth` 5.0.0-beta.32/@auth/core 0.41.3, TLS de saída escopado à ANVISA, política de privacidade `/privacidade`, retenção+purge 12 meses, rate limit em server actions públicas, CSP sem domínios mortos, campo `salt` removido)
- **Auditoria técnica de 21 itens (03/09/2026)**: sync transacional com advisory lock, rate limit de login real no callback do NextAuth, `.dockerignore`, erros sanitizados, pruning do rate-limit Map, clamp de `pageSize`, `select` em exports, caches de stats (unstable_cache), CI GitHub Actions — ver plano/relatório em `~/.verboo/plans/` e docs correlatos
- Pendências restantes: monitoramento/backup ativos no servidor (não verificáveis no repositório), 2FA opcional, `registrationNumber @@unique` (depende de auditoria de unicidade do CSV)

## Como Reportar Vulnerabilidades

Se encontrar uma vulnerabilidade, por favor reporte diretamente ao mantenedor do projeto via email.
