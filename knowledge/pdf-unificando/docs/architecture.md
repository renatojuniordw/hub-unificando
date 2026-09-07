# Arquitetura

Visão geral da arquitetura do **Unificando PDF** — stack, camadas, fluxo de uma requisição, padrão de ferramenta e decisões relevantes.

## 1. Stack

| Camada | Tecnologia | Observações |
|---|---|---|
| Framework | **Next.js 16.2.4** | App Router; `output: 'standalone'`; proxy ativo |
| UI | **React 19.2.4** | Server Components por padrão; `'use client'` onde há estado/eventos |
| Linguagem | **TypeScript 5.x (strict)** | `tsconfig.json` |
| Estilo | **Tailwind CSS v4** | Sem `tailwind.config.js`; tokens em `@theme` em `src/styles/index.css` |
| PDF/Imagem | pdf-lib, pdfjs-dist, sharp, @napi-rs/canvas, archiver | Ver `serverExternalPackages` em `next.config.ts` |
| Binários externos | Ghostscript, LibreOffice, qpdf, pdftoppm (poppler) | Instalados no Dockerfile; usados via binários no runtime |
| Fila/limites | p-limit + Map em memória | `src/lib/queue.ts`, `src/lib/utils/rate-limit.ts` |
| Testes | Vitest (unit/integração) + Playwright (e2e) + ESLint | Ver `development.md` |

Versões exatas e scripts: `package.json`.

## 2. Camadas e diretórios

```
src/
├── app/                  # Rotas (App Router)
│   ├── api/              # Route handlers (API)
│   │   ├── health/       # GET /api/health
│   │   └── pdf/*/route.ts# 18 handlers POST (um por ferramenta)
│   ├── ferramentas/*/    # Página pública de cada ferramenta
│   │   ├── page.tsx      # Server Component (SEO/metadata + shell)
│   │   └── *Client.tsx   # Client Component (interação + upload + download)
│   └── tutoriais/, privacidade/, manifest.ts, robots.ts, sitemap.ts
├── components/           # UI reutilizável (por domínio)
│   ├── upload/           # DropZone, FileQueue
│   ├── processing/       # ProcessingStatePanel, ProcessingStatus, SuccessDownload, DownloadButton, RetryCountdown
│   ├── layout/           # Header, Footer, ToolPageShell, ToolFlowShell, CommandPalette, Breadcrumbs, BrutalistCard...
│   ├── shared/           # ChoiceGroup, PageRangeField, StateBanner, TextPreviewPanel
│   ├── tools/            # ToolCard, ToolGrid, ToolIcons...
│   ├── tutorials/        # TutorialsList, TutorialsSearchBar
│   ├── seo/              # JsonLd (schemas Article, HowTo, FAQ, Breadcrumb)
│   ├── observability/    # WebVitalsReporter
│   ├── pwa/              # PWAInstallBanner, PWARegistration
│   ├── network/          # OfflineBanner
│   └── errors/           # ErrorScreen, LocalErrorBoundary
├── hooks/                # useFileProcessor, usePdfPages, useRetryCountdown, usePageRangeForm,
│                         # useDownloadTracking, useCopyToClipboard, useEventListener, useClickOutside,
│                         # useBodyScrollLock, useTextStats
├── lib/
│   ├── pdf/*.ts          # Motor de cada ferramenta (compress, merge, split, rotate, redact, etc.)
│   ├── utils/            # http (parsers/validadores), api-error, fetch-error, file, tmp, logger, rate-limit
│   ├── limits.ts         # Limites de upload compartilhados (client+server)
│   ├── queue.ts          # Fila binária + rate limit + health
│   ├── analytics.ts      # Eventos GA4 (client)
│   └── site.ts           # SITE_URL / siteUrl
├── config/               # Dados estáticos: tools.ts (16 ferramentas), tutorials.ts (16 tutoriais)
├── types/                # pdf.ts, tools.ts
└── proxy.ts              # Proxy/middleware ativo (matcher /api/pdf/:path*)
```

## 3. Fluxo de uma requisição de processamento

```
Browser (Client Component)
  └─ formData multipart (arquivos + parâmetros) via fetch
       ├─ nginx (produção): TLS, rate limit (5r/m burst=3), client_max_body_size 55M,
       │                     proxy p/ container :11005 (timeouts 120s)
       ▼
  Next.js Proxy (src/proxy.ts) — matcher /api/pdf/:path*
       ├─ valida origem (ALLOWED_ORIGIN vs Origin vs Host) → 403 se divergir
       ├─ valida Bearer token (API_SECRET_KEY) se configurado → 401
       ├─ injeta x-request-id
       └─ Next clona/bufferiza o body (proxyClientMaxBodySize 55mb)
       ▼
  Route Handler (src/app/api/pdf/*/route.ts)
       ├─ validateRateLimit(req) → 429 (IP 5 req/min + sobrecarga de fila)
       ├─ parse*Upload (parseSinglePdfUpload | parsePdfUploads | parseImageUploads)
       │     ├─ honeypot (_hp) → 400
       │     ├─ presença / mínimo → 400
       │     ├─ tamanho por arquivo (50MB) e total (50MB) → 413
       │     ├─ quantidade (20) → 413
       │     └─ magic bytes (PDF/JPG/PNG) → 400
       ├─ processa em src/lib/pdf/* (pdf-lib | pdfjs | sharp | binários)
       │     └─ binaryLimit (p-limit, MAX_CONCURRENT_JOBS) para binários externos
       └─ responde binário via streamResponse(...) OU JSON de erro via errorResponse(...)
       ▼
  Client (useFileProcessor)
       ├─ timeout (60s default; 120s p/ juntar-pdf e jpg-para-pdf) + retries (abort/rede)
       ├─ normaliza erro (api-error/fetch-error) → PT-BR
       └─ UI de estado: ProcessingStatePanel → SuccessDownload (download via blob URL)
```

Erros não tratados caem no `catch` → `errorResponse(err)` que serializa `ApiError` (status/code/details) ou 500 `INTERNAL_ERROR`.

## 4. Padrão de uma ferramenta

Cada ferramenta segue a mesma estrutura de 6 partes (detalhes em [`tools.md`](./tools.md)):

1. `src/config/tools.ts` — registro com slug, nome, SEO, ícone, tier, `multiple`, `usesBinary`
2. `src/lib/pdf/<slug>.ts` — função pura que recebe `Buffer`(s) e retorna `Buffer`
3. `src/app/api/pdf/<slug>/route.ts` — handler POST (parse + process + stream)
4. `src/app/ferramentas/<slug>/page.tsx` — Server Component (metadata + `ToolPageShell`)
5. `src/app/ferramentas/<slug>/<Tool>Client.tsx` — Client Component (`useFileProcessor` + Upload/Estado/Download)
6. Testes unitários (`tests/unit/lib/pdf/*`) e de integração (`tests/integration/api/routes.test.ts`)

Os componentes compartilhados de estado (`ProcessingStatePanel`, `SuccessDownload`) e os parsers de upload (`src/lib/utils/http.ts`) eliminam a duplicação entre ferramentas.

## 5. Gerenciamento de concorrência e limites

- **Fila binária** (`src/lib/queue.ts`): `binaryLimit = pLimit(MAX_CONCURRENT_JOBS)` (default 2) para operações que chamam binários externos (Ghostscript, LibreOffice, pdftoppm). `isOverloaded()` considera `active + pending >= MAX_CONCURRENT + MAX_QUEUE_SIZE` (default 2 + 5).
- **Rate limit por IP** (`src/lib/utils/rate-limit.ts`): Map em memória, janela deslizante de 60s, limite 5 req/min por IP (`x-real-ip`, setado pelo nginx e não forjável).
- **Limites de upload** (`src/lib/limits.ts`): 50MB por arquivo, 50MB total, 20 arquivos — validados no cliente (drop) e no servidor (parsers).
- **Limite de body no Proxy**: `experimental.proxyClientMaxBodySize: '55mb'` em `next.config.ts`. Importante: o valor default do Next é 10MB e **truncava uploads >10MB** quebrando o `formData()` (bug histórico resolvido — ver `CHANGELOG`/git).

## 6. Decisões de arquitetura relevantes

- **`output: 'standalone'` + nginx**: container Node enxuto com `server.js`; nginx faz TLS, rate limit e terminação de body grande.
- **`serverExternalPackages`**: `sharp`, `pdf-lib`, `@napi-rs/canvas`, `pdfjs-dist` ficam fora do bundle para evitar problemas de native modules.
- **Sem banco de dados**: não há persistência; conteúdo é estático (`config/`) e estado é em memória. Escala horizontal exigiria Redis para rate limit/fila — ver [`data.md`](./data.md).
- **Proxy com clonagem de body**: `src/proxy.ts` + `proxyClientMaxBodySize` — necessário para validação de origem antes do processamento e para permitir leituras múltiplas do body (proxy + route).
- **Segurança em camadas**: servidor (limites/honeypot/rate limit) **e** cliente (feedback imediato) — ver [`security.md`](./security.md).