# Build e Deploy — Unificando UI

> Como rodar o projeto localmente, gerar o build de produção e publicar via Docker/Nginx.

---

## 1. Requisitos

- **Node.js ≥ 22** (`.nvmrc` = `22`; `package.json` `engines.node = ">=22.0.0"`) — necessário para o runner de testes nativo (`node --test`) e para o Vite 6.
- npm (qualquer versão recente).

---

## 2. Comandos (`package.json`)

| Comando | O que faz |
| ------- | --------- |
| `npm run dev` | Servidor de desenvolvimento Vite em `http://localhost:11004` (`vite.config.ts`: `port: 11004`, `host: "0.0.0.0"`). |
| `npm run build` | **`node scripts/generate-sitemap.js && vite build`** — gera `public/sitemap.xml` e, em seguida, o build de produção em `dist/`. |
| `npm run preview` | Serve o build (`dist/`) localmente para inspeção. |
| `npm run sitemap` | Gera apenas o sitemap (`scripts/generate-sitemap.js`). |
| `npm test` | Roda os testes com o runner nativo do Node (`node --test`). Ver `docs/testing.md`. |
| `npm run lint` | ESLint 10 (flat config). Ver `docs/workflow.md`. |
| `npx tsc --noEmit` | Type-check (não há script dedicado; use o comando direto). |

> O `vite build` **não** roda type-check. O gate de qualidade completo é: `npm run lint` + `npx tsc --noEmit` + `npm test` + `npm run build`.

---

## 3. Configurações

### `vite.config.ts`

- Plugin React (`@vitejs/plugin-react`).
- Alias `@` → `./src`.
- Dev server: porta `11004`, host `0.0.0.0` (acessível na rede local).
- `build.sourcemap: false` (sem sourcemaps em produção, performance > debug).

### `postcss.config.js`

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

Tailwind v4 CSS-first — **não existe** `tailwind.config.js` nem `autoprefixer`.

### `tsconfig.json`

`strict: true`, `target ES2022`, `module ESNext`, `moduleResolution: "bundler"`, `paths @/* → src/*`, `noEmit`, `allowJs`, `jsx: react-jsx`, `types: ["node"]`, `allowImportingTsExtensions: true` (os testes importam `.ts`).

### `eslint.config.js`

Flat config: `@eslint/js` + `typescript-eslint` (recommended) + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. Ignora `dist`, `public`, `.refactor`, `node_modules`. Bloco especial para `*.test.ts` (globals Node, react-refresh off) e para configs/scripts (globals Node).

---

## 4. Artefatos do Build

`dist/` contém:

- `index.html` (SPA — o Nginx faz fallback para ele).
- Chunks JS por página (code-splitting via `React.lazy`).
- Assets (CSS, imagens) de `src/assets` e **todo o conteúdo de `public/`** (sitemap.xml gerado, robots.txt, llms.txt, manifest.json, favicons, og-image.svg, etc.).

---

## 5. Deploy Containerizado (Docker + Nginx)

### Dockerfile (multi-stage)

1. **Stage builder** (`node:22-alpine`): instala dependências (`npm install --legacy-peer-deps`), copia o código, define args de build e roda `npm run build`.
   - `ARG`/`ENV`: `VITE_TURNSTILE_SITE_KEY`, `VITE_N8N_WEBHOOK_URL`, `VITE_CHATWOOT_TOKEN` — **nota:** hoje o código-fonte **não consome essas variáveis** (apenas `VITE_SITE_URL` é lida em `src/components/common/SEO.tsx`). Os ARGs são remanescentes legados do Dockerfile; não são necessários para o build atual.
2. **Stage prod** (`nginx:alpine`): remove confs padrão, copia `nginx.conf` → `/etc/nginx/conf.d/default.conf`, copia `dist/` → `/usr/share/nginx/html`, ajusta permissões para usuário não-root (`nginx`), adiciona `HEALTHCHECK` (curl local), `USER nginx`, `EXPOSE 80`, roda `nginx -g "daemon off;"`.

### nginx.conf (SPA + segurança)

- `try_files $uri $uri/ /index.html` — fallback SPA para qualquer rota.
- **Security headers:** CSP (permite GTM, GA4, Google Fonts, Cloudflare, Facebook), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `HSTS`, `Cross-Origin-Opener-Policy: same-origin`.
- Compression gzip (texto, JSON, JS).
- Cache de estáticos (`ico|css|js|png|svg|woff2...`) por **1 ano** (`Cache-Control: public`).
- Bloqueio de arquivos ocultos (`location ~ /\. { deny all; }`).
- `server_tokens off`; temp paths em `/tmp` (compatível com filesystem read-only).

### docker-compose.yml

- Build com args de env (`VITE_*`), expõe `127.0.0.1:11004:80` (apenas localhost).
- Hardening: `read_only: true`, `tmpfs` para `/tmp`, `/var/cache/nginx`, `/var/run` (uid/gid 101), `cap_drop: ALL`, `no-new-privileges`, `restart: always`.
- Container: `unificando-frontend`.

### Deploy típico

```bash
npm run build                                   # valida localmente (sitemap + vite build)
docker compose up -d --build                    # sobe o Nginx servindo dist/ na porta 11004
# reverse proxy / DNS apontam unificando.com.br → 127.0.0.1:11004
```

---

## 6. Variáveis de Ambiente

| Variável | Onde é lida | Default |
| -------- | ----------- | ------- |
| `VITE_SITE_URL` | `src/components/common/SEO.tsx` (base de URLs canônicas/og) e `src/vite-env.d.ts` | `https://unificando.com.br` |
| `VITE_TURNSTILE_SITE_KEY`, `VITE_N8N_WEBHOOK_URL`, `VITE_CHATWOOT_TOKEN` | **não são lidas no código atual** (legado do Dockerfile) | — |

---

## 7. Fluxo de Publicação (resumo)

1. Rodar gates: `npm run lint`, `npx tsc --noEmit`, `npm test`.
2. `npm run build` (regenera `sitemap.xml`; gera `dist/`).
3. `docker compose up -d --build` (ou equivalente no servidor).
4. Validar: resposta HTTP no domínio, `sitemap.xml` acessível, headers de segurança presentes, páginas principais 200.

---

## 8. Links Relacionados

- [`architecture.md`](./architecture.md) — estrutura do src e output do build
- [`seo.md`](./seo.md) — sitemap e arquivos de `public/`
- [`testing.md`](./testing.md) — runner de testes
- [`workflow.md`](./workflow.md) — gates de qualidade