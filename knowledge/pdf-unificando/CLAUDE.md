@AGENTS.md

# PDF Unificando — Guia do Projeto

Ferramenta web de PDF focada em privacidade: nenhum arquivo é armazenado. Tudo processado em `/tmp` e descartado imediatamente após o download.

## Stack

- **Next.js 16** com App Router — leia `node_modules/next/dist/docs/` antes de escrever código; esta versão tem breaking changes
- **React 19** — use `'use client'` explicitamente em componentes com hooks/interatividade
- **TypeScript 5** strict — sem `any` implícito; alias `@/` aponta para `src/`
- **Tailwind CSS v4** via PostCSS — config em `postcss.config.mjs` e tokens em `src/styles/index.css`
- **Vitest** para unit/integration, **Playwright** para E2E

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção (output: standalone)
npm run start      # servidor de produção
npm run lint       # ESLint

# Testes
npx vitest                          # unit + integration (watch)
npx vitest run                      # unit + integration (CI)
npx playwright test                 # E2E (requer servidor rodando)
npx playwright test --ui            # E2E com interface visual
```

## Variáveis de ambiente

Copie `.env.example` e ajuste:

| Variável | Padrão | Obrigatória |
|---|---|---|
| `API_SECRET_KEY` | — | Sim (produção) |
| `ALLOWED_ORIGIN` | `https://pdf.unificando.com.br` | Não, mas recomendado em produção |
| `MAX_FILE_SIZE` | `52428800` (50MB) | Não |
| `MAX_CONCURRENT_JOBS` | `2` | Não |
| `MAX_QUEUE_SIZE` | `5` | Não |
| `RETRY_AFTER_SECONDS` | `30` | Não |
| `NEXT_PUBLIC_GA_ID` | — | Não |
| `NEXT_PUBLIC_ADSENSE_ID` | — | Não |
| `NEXT_PUBLIC_GTM_ID` | — | Não |
| `NEXT_PUBLIC_META_PIXEL_ID` | — | Não |
| `NEXT_PUBLIC_PRIVACY_EMAIL` | `privacidade@unificando.com.br` | Não |

Analytics e AdSense são completamente opcionais — o app funciona sem eles.

## Estrutura

```
src/
  app/
    api/pdf/           # Rotas de API — uma por ferramenta
    ferramentas/       # Páginas das 13 ferramentas (pt-BR)
    layout.tsx         # Root layout (Inter font, lang="pt-BR")
    page.tsx           # Home
  components/
    ads/               # Google AdSense
    layout/            # Header, Footer
    processing/        # Status, retry, download
    pwa/               # PWAInstallBanner, PWARegistration
    seo/               # JsonLd (structured data)
    tools/             # ToolCard, ToolGrid, PrivacyBanner
    tutorials/         # TutorialsList
    upload/            # DropZone, FileQueue
  config/tools.ts      # Metadados de todas as ferramentas
  hooks/               # useFileProcessor, usePdfPages, useDragReorder, useRetryCountdown
  lib/
    pdf/               # Lógica de processamento por ferramenta
    utils/             # http.ts, file.ts, tmp.ts
    queue.ts           # Controle de concorrência com p-limit
    analytics.ts       # GA Measurement Protocol (opcional)
  types/               # ToolDefinition, ProcessingStatus, ProcessedFile
tests/
  unit/                # Vitest — funções de lib
  integration/         # Vitest — rotas de API
  e2e/                 # Playwright — fluxos completos
```

## Ferramentas disponíveis (16)

| Rota | Lib | Binário externo |
|---|---|---|
| `/api/pdf/compress` | `lib/pdf/compress.ts` | Ghostscript |
| `/api/pdf/merge` | `lib/pdf/merge.ts` | — (pdf-lib) |
| `/api/pdf/split` | `lib/pdf/split.ts` | — (pdf-lib) |
| `/api/pdf/extract-pages` | `lib/pdf/extract-pages.ts` | — (pdf-lib + archiver) |
| `/api/pdf/rotate` | `lib/pdf/rotate.ts` | — (pdf-lib) |
| `/api/pdf/organize` | `lib/pdf/organize.ts` | — (pdf-lib) |
| `/api/pdf/protect` | `lib/pdf/protect.ts` | Ghostscript |
| `/api/pdf/watermark` | `lib/pdf/watermark.ts` | — (pdf-lib) |
| `/api/pdf/page-numbers` | `lib/pdf/page-numbers.ts` | — (pdf-lib) |
| `/api/pdf/redact` | `lib/pdf/redact.ts` | — (pdf-lib + pdfjs-dist) |
| `/api/pdf/to-jpg` | `lib/pdf/to-jpg.ts` | poppler-utils |
| `/api/pdf/to-png` | `lib/pdf/to-png.ts` | — (pdfjs-dist + @napi-rs/canvas) |
| `/api/pdf/to-txt` | `lib/pdf/to-txt.ts` | — (pdfjs-dist) |
| `/api/pdf/to-markdown` | `lib/pdf/to-markdown.ts` | — (pdfjs-dist) |
| `/api/pdf/to-word` | `lib/pdf/to-word.ts` | LibreOffice |
| `/api/pdf/from-jpg` | `lib/pdf/from-jpg.ts` | — (Sharp + pdf-lib) |

## Padrões de API

- Todas as rotas aceitam `POST` com `multipart/form-data`
- Campo de arquivo: `file` (único ou múltiplo dependendo da ferramenta)
- Parâmetros extras via FormData (ex: `quality` na compressão)
- Respostas: blob para download ou JSON de erro
- Códigos: `200` ok, `400` arquivo faltando, `413` arquivo grande demais, `429` fila cheia, `500` erro interno
- Headers de rate-limit: `Retry-After`, `X-Queue-Active`, `X-Queue-Pending`
- Cache desabilitado nas rotas de API: `Cache-Control: no-store`

## Convenções importantes

**Arquivos temporários:** Sempre use `lib/utils/tmp.ts` para criar e limpar arquivos em `/tmp`. Nunca deixe arquivos sem cleanup — use `try/finally`.

**Concorrência:** Operações com binários externos (Ghostscript, LibreOffice, poppler) devem usar `binaryLimit` de `lib/queue.ts`. Operações pure-JS (pdf-lib) não precisam.

**Design:** Estilo brutalist — sombras duras (`shadow-[8px_8px_0px_#000]`), sem border-radius nos cards, amarelo neon `#ccff00` como cor de acento. Mantenha os tokens de `src/styles/index.css`.

**Idioma:** Todo texto visível ao usuário em português (pt-BR). Nomes de variáveis e código em inglês.

**Privacidade:** Nenhum arquivo deve ser persistido fora do `/tmp`. Não adicione banco de dados, upload para S3, ou qualquer armazenamento permanente de conteúdo do usuário.

## Docker

```bash
docker compose up --build   # build e sobe com nginx
docker compose up           # sobe com imagem existente
```

- Build multi-stage: `builder` → `runner` (node:22-alpine)
- `/tmp` montado como `tmpfs: 512m`
- Usuário não-root (`appuser`)
- Requer rede externa `nginx-proxy`: `docker network create nginx-proxy`
