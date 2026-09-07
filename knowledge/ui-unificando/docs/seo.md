# SEO — Unificando UI

> Como o site implementa SEO técnico, metadados, dados estruturados, sitemap e visibilidade para AI crawlers.

---

## 1. Componente SEO (`src/components/common/SEO.tsx`)

Toda página usa `<SEO>` no topo do seu JSX. O componente injeta tudo via **react-helmet-async** (provedor montado em `src/index.tsx`).

### Props

| Prop | Obrigatório | Default | Descrição |
| ---- | ----------- | ------- | --------- |
| `title` | sim | — | `<title>` + `og:title` + `twitter:title` |
| `description` | sim | — | meta description + `og:description` + `twitter:description` |
| `canonical` | não | `"/"` → site raiz | caminho relativo, ex. `/laboratorio`; vira `https://unificando.com.br/laboratorio` |
| `ogImage` | não | `/og-image.svg` | caminho relativo; vira URL absoluta |
| `jsonLd` | não | `Organization` default | objeto ou array injetado como `<script type="application/ld+json">` |
| `robots` | não | `index, follow, max-snippet:-1, max-image-preview:large` | meta robots customizada |
| `keywords` | não | lista default (`Unificando, laboratório digital, ...Recife`) | meta keywords |

### O que é gerado

- `<title>`, meta description, meta keywords, `<link rel="canonical">`, meta robots.
- **AI crawlers:** `bingbot`, `chatgpt="all"`, `ai-crawler="all"` e `<link rel="llms" href="/llms.txt" title="AI Discovery" type="text/plain">`.
- **Open Graph:** type website, title, description, url, image, site_name "Unificando", locale `pt_BR`.
- **Twitter Card:** `summary_large_image` + title/description/image.
- **JSON-LD:** o default é `Organization` (name "Unificando", url, logo `.../assets/img/LOGO_UNIFICANDO.svg`, description). As páginas passam seus próprios `jsonLd`.

**Base URL:** `import.meta.env.VITE_SITE_URL || "https://unificando.com.br"` — todas as URLs absolutas (canonical, og:image) usam essa base.

### JSON-LD por página

| Página | Tipo(s) | Destaques |
| ------ | ------- | --------- |
| Home | `WebSite` + `SearchAction` + `Organization` | endereço `PostalAddress` (Recife/PE/BR), `ContactPoint`, logo, sameAs Instagram |
| `/laboratorio` | `CollectionPage` | coleção de capacidades |
| `/metodo-unificando` | `HowTo` com 3 `HowToStep` | processo em etapas (prototipação → validação → deploy) |
| `/sobre` | `AboutPage` + `Organization` + `PostalAddress` | manifesto |
| `/contato` | `ContactPage` + `Organization` + `ContactPoint` | formulário |
| `/privacidade` | `WebPage` + `BreadcrumbList` | política |
| `/termos` | `WebPage` | termos |
| `/links` | `SEO` sem jsonLd | página de canais |
| 404 | `SEO` com `robots` restrito | não indexar |

> **404/NotFound:** usa `<SEO ... robots="noindex, follow">` (ou similar) para não indexar a rota de erro; `robots.txt` também bloqueia `/404`.

---

## 2. Base no `index.html` (raiz)

Camadas de SEO/performance que vivem fora do React:

- `<html lang="pt-BR">`, `<meta charset>`, viewport.
- **GTM `GTM-NV6BPT7T` + GA4 `G-F0XYHKBGM1`:** carregados **adiados** — gatilhos de primeira interação (`scroll`, `mousemove`, `touchstart`, `keydown`) ou `requestIdleCallback` (timeout 8s) / `setTimeout` 6s. `<noscript>` com iframe do GTM.
- **Meta tags base** (title "Unificando | Laboratório de Projetos Autorais & IA", description, keywords, author, robots), OG/Twitter base e **AI crawlers** (repetidos no `index.html` como fallback antes do React montar).
- **PWA:** `<meta name="theme-color" content="#0f172a">`, apple-mobile-web-app, favicon `/favicon.png`, apple-touch-icon `/logo_thumbnail.svg`, `<link rel="manifest" href="/manifest.json">`.
- **Google Fonts Inter (300–900):** `preconnect` para `fonts.googleapis.com`/`fonts.gstatic.com`, carregamento assíncrono (`media="print" onload="this.media='all'"`) + fallback `<noscript>`.
- `<body class="bg-slate-50 text-slate-900">` + `<div id="root">` + módulo `/src/index.tsx`.

---

## 3. Arquivos estáticos em `public/`

| Arquivo | Papel |
| ------- | ----- |
| `robots.txt` | `Allow: /`; `Disallow: /404` e `/links`; regras separadas permitindo `GPTBot`, `ChatGPT-User`, `Google-Extended`; `Sitemap: https://unificando.com.br/sitemap.xml` |
| `llms.txt` | Descrição do laboratório para LLMs — resumo, 8 páginas principais, 3 projetos (PDF/Med/Radar), DevTools npm, capacidades, contato |
| `sitemap.xml` | **Gerado** por `scripts/generate-sitemap.js` (ver seção 4) |
| `manifest.json` | PWA manifest: nome completo, short_name, theme `#0f172a`, background `#f8fafc`, lang `pt-BR`, ícones SVG + PNG 512 |
| `og-image.svg` | Imagem padrão de Open Graph/Twitter |
| `favicon.png`, `logo.svg`, `logo_dark.svg`, `logo_thumbnail.svg`, `LOGO_UNIFICANDO.svg`, `LOGO_PERFIL.png` | Favicons e identidade |
| `ads.txt` | Declaração de ads (se houver parceiros) |

---

## 4. Sitemap (`scripts/generate-sitemap.js`)

- Node puro (sem libs): monta XML via template string e grava em **`public/sitemap.xml`** (o Vite copia para `dist/` no build).
- `SITE_URL = "https://unificando.com.br"`; `lastmod` = data do dia de execução.
- **8 URLs** com priority/changefreq:

| Path | Priority | Changefreq |
| ---- | -------- | ---------- |
| `/` | 1.0 | weekly |
| `/laboratorio` | 0.9 | monthly |
| `/metodo-unificando` | 0.8 | monthly |
| `/contato` | 0.8 | monthly |
| `/sobre` | 0.7 | monthly |
| `/links` | 0.5 | monthly |
| `/privacidade` | 0.3 | yearly |
| `/termos` | 0.3 | yearly |

- Executado automaticamente no `npm run build` (antes do `vite build`) e manualmente via `npm run sitemap`.
- **Não inclui:** produtos em subdomínios (`pdf.`/`med.`/`radar.`) nem `/servicos` (redirect). Subdomínios têm seus próprios sitemaps.

---

## 5. Checklist — adicionar uma nova página com SEO

1. Criar a rota em `src/routes.ts` (`ROUTES.NOVA = "/nova"`).
2. Registrar no `AppRouter` (`src/router/index.tsx`) com `React.lazy` + `Route`.
3. No componente da página, importar e renderizar `<SEO title="..." description="..." canonical={ROUTES.NOVA} jsonLd={{...}} />`, seguindo o padrão das páginas existentes.
4. Adicionar a URL ao array `routes` de `scripts/generate-sitemap.js` (prioridade da nova página).
5. Se quiser aparecer para LLMs, atualizar `public/llms.txt` (seções "Páginas principais" / "Projetos").
6. Rodar `npm run build` (regenera sitemap) e validar: `curl -s https://unificando.com.br/sitemap.xml | grep <nova-url>`.

---

## 6. Observações

- O componente `SEO` injeta `bingbot/chatgpt/ai-crawler` em **todas** as páginas — decisão deliberada de visibilidade para AI search.
- `VITE_SITE_URL` permite customizar a base de URLs por ambiente (build); default hardcoded é `https://unificando.com.br`.
- Sinais de marca: nome "Unificando", URL canônica única por página, dados estruturados `Organization` com logo e endereço — consolidam a entidade em busca/AI.

## 7. Links Relacionados

- [`architecture.md`](./architecture.md) — roteamento e AppRouter
- [`build-and-deploy.md`](./build-and-deploy.md) — pipeline de build que gera o sitemap
- [`data-and-content.md`](./data-and-content.md) — onde vive o texto de `llms.txt` e constantes