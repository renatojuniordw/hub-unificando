# Med Unificando

Consulta inteligente de medicamentos intercambiáveis da ANVISA com busca semântica por IA local.

> Projeto do [Unificando](https://unificando.com.br) — laboratório de projetos autorais e IA — | Desenvolvido por [Renato Bezerra](https://renatobezerra.com.br)
> **Acesse:** [https://med.unificando.com.br](https://med.unificando.com.br)

---

## Funcionalidades

- **Busca textual** por referência, princípio ativo, nome comercial e categoria
- **Busca por descrição** — descreva o medicamento em linguagem natural
- **Busca híbrida** — pgvector + tsvector + pg_trgm com RRF fusion (pesos semântica 0.40 / keyword 0.35 / trigram 0.25, k=60)
- **Score adjustments** — relevância ajustada com base no feedback dos usuários
- **Search Feedback** — usuários avaliam resultados como útil/não útil
- **Autocomplete server-side** com debounce e navegação por teclado (setas, Enter, Escape)
- **Farmácia Popular** — badge e filtro para medicamentos do programa
- **Comparação** lado a lado com destaque visual de diferenças
- **Explorar por referência** — similares de um medicamento de referência (paginação, A-Z)
- **Navegação ATC** — árvore Anatômica/Terapêutica/Química com busca e autocomplete
- **Preços CMED** — tabela com destaque visual (recharts)
- **Página do detentor** — medicamentos de uma empresa com cards mobile
- **Estatísticas** com filtros interativos (ano, categoria, situação) e timeline
- **Exportação** CSV e Excel (corretamente escapado) · **Relatório PDF** (pdfmake)
- **Favoritos** · **Buscas recentes** (localStorage)
- **Dark mode** (CSS variables) · **Mobile responsive** · **Header active link** · **Scroll to top**
- **PWA** — instalável como app (manifest com ícones 192/512 + service worker com offline parcial; não cacheia `/admin`/`/api`)
- **SEO** — JSON-LD Schema.org/MedicalDrug, OG Image dinâmica, sitemap 32K+ URLs, robots com GPTBot/ClaudeBot/Google-Extended, `/privacidade` (LGPD)
- **CI** — GitHub Actions (lint, typecheck, unit, build em push/PR)
- **Resiliência** — ErrorBoundary global, skeleton global realista, URLs de `/medicamento/[slug]` com ID estável no sufixo entre syncs (diff)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16.2.10 (App Router + Turbopack) |
| Linguagem | TypeScript (~5) |
| Banco | PostgreSQL 16 + pgvector (HNSW) |
| ORM | Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`) |
| Autenticação | NextAuth v5 (Credentials, JWT) + bcryptjs |
| IA (embeddings) | Xenova Transformers (ONNX local) |
| IA (busca) | multilingual-e5-base (768d) + tsvector + pg_trgm + fusão RRF |
| Testes unit | Vitest 4 + Testing Library + jsdom |
| Testes E2E | Playwright (`@playwright/test`, 8 specs) |
| Estilo | Tailwind CSS v4 |
| PDF | pdfmake + pdf-parse (server-side) |
| Exportação | xlsx (CSV/Excel) |
| Gráficos | recharts |
| Validação | zod |
| Infra | Docker Compose + multi-stage build + GitHub Actions |

---

## Quick Start

```bash
# 1. Clone
git clone git@github.com:renatojuniordw/med-unificando.git
cd med-unificando

# 2. Configure
cp .env.example .env
# edite DB_PASSWORD, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, BASE_URL

# 3. Build + suba (use --build para garantir a imagem com o código atual)
docker compose up -d --build
```

Acesse [http://localhost:11006](http://localhost:11006). No primeiro boot, o entrypoint aplica migrations, faz seed ANVISA (se o banco estiver vazio), sincroniza Farmácia Popular e gera tsvector/embeddings.

---

## Instalação Manual (desenvolvimento)

```bash
# 1. Dependências
npm install

# 2. Banco (PostgreSQL 16 + pgvector)
docker compose up -d db          # apenas o medicamentos-db (127.0.0.1:5432)

# 3. Prisma
npx prisma generate
npx prisma migrate deploy

# 4. Seed dos dados ANVISA (baixa o CSV oficial; bypass de TLS escopado à ANVISA)
npm run seed

# 5. Índices de busca
npm run db:index                 # backfill-indications + tsvector + embeddings

# 6. Dev server (porta 11006)
npm run dev
```

> O TLS da ANVISA (certificados ICP-Brasil fora das CAs do Node) é tratado por um
> agente HTTPS dedicado e escopado ao host (`src/lib/anvisa-https.ts`). **Não** existe
> mais `NODE_TLS_REJECT_UNAUTHORIZED=0` global (removido em 2026-09-03).

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DB_PASSWORD` | Senha do Postgres do compose | Sim (compose) |
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `AUTH_SECRET` | Chave secreta JWT (`openssl rand -base64 32`) | Sim |
| `ADMIN_EMAIL` | Email do admin inicial (seed) | Sim |
| `ADMIN_PASSWORD` | Senha do admin inicial (seed) | Sim |
| `BASE_URL` | URL base do site (sitemap/robots/OG) | Não |
| `NEXT_PUBLIC_BASE_URL` | URL base pública/inline — mesma de `BASE_URL`, prefixo `NEXT_PUBLIC_` para componentes client (JSON-LD do Breadcrumbs); evita hydration mismatch | Não |
| `ANVISA_MEDICINES_URL` | URL do CSV de medicamentos ANVISA (fallback) | Não |
| `ANVISA_PRICES_URL` | URL do CSV de preços CMED (fallback) | Não |
| `ANVISA_THERAPEUTIC_CLASS_URL` | URL do CSV de dados abertos ANVISA (classe terapêutica, fallback) | Não |
| `EMBEDDING_MODEL` | Modelo de embeddings (default: `Xenova/multilingual-e5-base`) | Não |
| `EMBEDDING_DIMS` | Dimensões do embedding (default: 768; `EMBEDDING.COLUMN` é fixo em `embedding` no código) | Não |
| `SEARCH_LOGS_RETENTION_DAYS` | Dias de retenção de `search_logs` no purge (default 365) | Não |
| `SEARCH_FEEDBACK_RETENTION_DAYS` | Dias de retenção de `search_feedback` no purge (default 365) | Não |
| `MCP_ENABLED` | Liga/desliga o endpoint `/api/mcp` (default `true`) | Não |
| `MCP_API_KEY` | Se definida, exige `Authorization: Bearer <key>` no MCP | Não |
| `MCP_ALLOWED_ORIGINS` | Allowlist extra de Origin (vírgula) além de `BASE_URL` | Não |
| `MCP_SESSION_TTL_MIN` | TTL de sessão MCP em minutos (default `60`) | Não |
| `MCP_ENABLE_JSON_RESPONSE` | `true` = respostas JSON puras; `false` = SSE (default) | Não |
| `MCP_RATE_LIMIT` | Limite de req/min por IP no MCP (default `120`) | Não |
| `NODE_ENV` | `production` (compose) | Não |

Todas as variáveis com `:?` no compose são obrigatórias em deploy. **Removido:** `ALLOW_INSECURE_TLS` (não há mais variável global de TLS).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (porta 11006) |
| `npm run build` | Build de produção |
| `npm run start` | Iniciar em produção (porta 11006) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (unit) |
| `npm run test:watch` | Vitest watch |
| `npm run test:coverage` | Vitest coverage (número oficial) |
| `npm run test:e2e` | Playwright (sobe dev server próprio em 11009 via `scripts/e2e-server.sh`) |
| `npm run test:e2e:ui` | Playwright UI |
| `npm run seed` | Importar dados ANVISA (`prisma/seed.ts`) |
| `npm run search-index` | Gerar embeddings apenas dos que faltam |
| `npm run tsvector` | Gerar tsvector (gap-fill + refinamento) |
| `npm run backfill-indications` | Backfill de indicações terapêuticas |
| `npm run farmacia-popular` | Sincronizar Farmácia Popular |
| `npm run purge:logs` | Purge de `search_logs`/`search_feedback` (retenção LGPD 365d) |
| `npm run pwa:icons` | Regenerar ícones PNG do PWA (192/512) |
| `npm run db:index` | Indications + tsvector + embeddings (sequência completa) |
| `npm run migrate` | Aplicar migrations do Prisma |
| `npm run generate` | Gerar cliente Prisma |
| `npm run docker:up` / `docker:down` / `docker:build` | Compose up / down / build sem cache |

Outros utilitários (não npm scripts) em `scripts/`: `reindex-embeddings.ts`, `smoke-sync-ids.ts`, `check-backup-freshness.sh`, `e2e-server.sh`, `diagnose-search.ts`, `test-hybrid*.ts`, `analyze-thresholds.ts`, `add-active-ingredients.ts`, `backfill-therapeutic-class.ts`, `run-search-tests.ts`.

---

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Home com busca semântica |
| `/buscar-avancado` | Busca textual com filtros avançados |
| `/medicamento/[slug]` | Detalhes (preços, similares, bula) — slug semântico com ID estável no sufixo |
| `/referencias` | Lista de medicamentos de referência |
| `/referencias/[name]` | Similares de uma referência específica |
| `/atc` | Navegação por árvore ATC |
| `/atc/[code]` | Medicamentos por código ATC |
| `/detentor/[holder]` | Medicamentos de um detentor |
| `/compare` | Comparação lado a lado (sincroniza com `?ids=`) |
| `/dashboard` | Estatísticas com filtros interativos (cacheado) |
| `/sobre` | Sobre o projeto e fontes de dados |
| `/mcp` | Página pública do MCP Server (instruções de uso) |
| `/privacidade` | Política de privacidade (LGPD) |
| `/admin/login` | Login (rate limit 10/min no callback) |
| `/admin/import` | Sincronização ANVISA + Preços + Farmácia Popular |
| `/admin/medicamentos` | Busca admin de medicamentos |
| `/admin/medicamentos/[id]` | Edição admin de medicamento |
| `/admin/search-feedback` | Console de feedback das buscas |
| `/admin/search-analytics` | Analytics das buscas (top queries, performance) |

---

## API Pública

```bash
# Listar medicamentos (paginado, max 100/página)
curl "http://localhost:11006/api/medicines?page=1&pageSize=10"

# Filtrar
curl "http://localhost:11006/api/medicines?category=Similar&status=Ativo"

# Exportar CSV
curl "http://localhost:11006/api/medicines?format=csv" -o medicamentos.csv

# Health check
curl http://localhost:11006/api/health

# Autocomplete (sugestões trigram)
curl "http://localhost:11006/api/autocomplete?q=dipirona&limit=5"

# Search Feedback (POST; body limitado a 8KB)
curl -X POST http://localhost:11006/api/search-feedback \
  -H "Content-Type: application/json" \
  -d '{"query":"...","medicineId":1,"medicineName":"...","feedback":"helpful"}'
```

### MCP Server (Model Context Protocol)

O site também expõe um **MCP Server** via Streamable HTTP (`spec 2025-06-18`) no
endpoint `https://med.unificando.com.br/api/mcp` — agentes de IA (Claude
Desktop/Code, Cursor, opencode) consultam o domínio como **12 ferramentas**
read-only (`buscar_medicamentos`, `buscar_por_descricao`, `detalhe_medicamento`,
`arvore_atc`, ...), reutilizando as mesmas Server Actions do site.

Exemplo de config no cliente:

```jsonc
{
  "mcpServers": {
    "med-unificando": { "url": "https://med.unificando.com.br/api/mcp" }
  }
}
```

Documentação completa: **[`docs/MCP.md`](docs/MCP.md)** · Página pública: [`/mcp`](https://med.unificando.com.br/mcp) · Endpoint: `/api/mcp`

Rate limits: `/api/medicines` 60/min · `/api/autocomplete` 120/min · `/api/search-feedback` POST 20/min · login 10/min (callback NextAuth + proxy). Detalhes em `docs/API.md`.

---

## Arquitetura

```
src/
├── app/                       # Páginas (App Router)
│   ├── buscar-avancado/        # Busca avançada
│   ├── medicamento/[slug]/     # Detalhe do medicamento
│   ├── referencias/            # Referências
│   ├── atc/[code]/             # Classificação ATC
│   ├── detentor/[holder]/      # Detentor
│   ├── dashboard/              # Estatísticas (cacheado)
│   ├── compare/                # Comparação
│   ├── privacidade/            # Política de privacidade
│   ├── sobre/                  # Sobre
│   ├── mcp/                    # Página do MCP Server (instruções)
│   ├── admin/
│   │   ├── (auth)/login/      # Login (rate limit no callback)
│   │   └── (protected)/        # Layout que exige sessão
│   │       ├── import/          # Sync ANVISA + Preços + Farmácia Popular
│   │       ├── medicamentos/    # Admin de medicamentos
│   │       ├── search-feedback/ # Feedback
│   │       └── search-analytics/ # Analytics
│   ├── api/                   # Rotas de API
│   │   ├── medicines/         # REST público (JSON/CSV, 60/min)
│   │   ├── autocomplete/      # Sugestões trigram (120/min)
│   │   ├── search-feedback/   # POST feedback (20/min) + GET stats (admin)
│   │   ├── search-analytics/  # GET analytics (admin)
│   │   ├── mcp/               # MCP Server — Streamable HTTP (read-only)
│   │   ├── auth/[...nextauth]/ # NextAuth v5 (rate limit login 10/min)
│   │   └── health/            # Health check
│   ├── layout.tsx · loading.tsx · not-found.tsx · sitemap.ts · robots.ts · opengraph-image.tsx
├── components/
│   ├── layout/                # Header (aria-controls/focus trap), Footer
│   ├── medicines/             # Componentes de domínio
│   ├── admin/                 # Componentes do admin
│   ├── dashboard/             # Componentes do dashboard
│   ├── ui/                    # Primitivos reutilizáveis (data-testid em 36 arquivos)
│   └── pwa-register.tsx       # Registro do service worker
├── hooks/                     # use-autocomplete, use-debounced-search, use-favorites, use-recent-searches
├── lib/
│   ├── actions/               # Server Actions (busca, semântica, admin, preços, ATC, comparação...)
│   ├── dictionaries/          # atc-codes, pharmaceutical-forms, prescription-types, synonyms, therapeutic-*
│   ├── config.ts              # SITE, SEARCH, EMBEDDING, ANVISA centralizados
│   ├── constants.ts           # MEDICINE_LIMITS, BATCH...
│   ├── sync-diff.ts           # Diff preservando IDs (matchKey reference + multiplicidade)
│   ├── tsvector-refresh.ts    # Regeneração de tsvector (nomes ATC/forma)
│   ├── anvisa-https.ts        # Agente TLS escopado à ANVISA (ICP-Brasil)
│   ├── data-cache.ts          # unstable_cache (detail, atc, holder, dashboard, stats)
│   ├── rate-limit.ts + rate-limit-action.ts  # in-memory com sweep (teto 10k)
│   ├── auth-guard.ts          # withAuth / withAdmin / withAdminReturn / isAdmin
│   ├── feedback-schema.ts     # zod para feedback
│   ├── mcp/                   # MCP Server — types, register, session, security, tools
│   └── ... (format, text-utils, build-where, query-parser, keyword-utils,
│            search-relevance, score-adjustments, embeddings-generator, csv-utils,
│            csv-export, safe-json-ld, pdf-parser, prisma, theme-provider,
│            hooks/use-medicine-search.ts)
├── auth.ts                    # Instância NextAuth
├── proxy.ts                   # Defesa de borda no login (matcher /admin/login + callback)
└── types/                     # index.ts, medicine.ts, next-auth.d.ts, pdf-*
public/  # manifest.json (PWA com ícones), sw.js, icon-192/512.png/svg, llms.txt
e2e/     # 9 specs Playwright (smoke, busca, compare, detalhe, referências, login, PWA, MCP)
tests/   # ~64 arquivos Vitest (api, components, lib, hooks, mcp)
scripts/ # utilitários (19 arquivos TS/SH)
prisma/  # schema.prisma, migrations (17), seed.ts, import-prices.ts
.github/workflows/ci.yml       # lint + typecheck + test + build (sem banco)
.dockerignore  # exclui .env, node_modules, docs do build
```

### Princípios de Código

- **SRP / OCP / LSP / ISP / DIP** — responsabilidade única, composição sobre modificação
- **DRY** — constantes nomeadas (MEDICINE_LIMITS, SEARCH), componentes reutilizáveis
- **Clean Code** — sem `any` desnecessário, nomes reveladores
- **Tipagem** — `types/index.ts` compartilhado entre client, server actions e API

---

## Design System

Identidade **Healthcare Moderno** — amarelo neon (`#ccff00`) como acento de marca, preto como primary, branco como fundo; dark mode via CSS variables. Detalhes em [DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md).

---

## Testes

- **Unitários (Vitest):** 58 arquivos / **385 testes** — `npm test`
- **Cobertura:** oficial `npm run test:coverage` → **Lines 91% · Stmts 89.1% · Branch 81.9% · Funcs 88.3%** (hooks incluídos; `semantic-search.ts` excluído por design — modelo on-device)
- **E2E (Playwright):** 8 specs / **18 testes** — `npm run test:e2e` (sobe dev server próprio em 11009; exige Postgres `medicamentos-db` no ar)
- Rastreabilidade: `tests/test-report.md` e `tests/business-rules.md`

---

## Segurança

- **Docker**: read-only rootfs, `no-new-privileges`, `cap_drop ALL`, non-root (UID 1001); `.dockerignore` exclui `.env`/segredos do build
- **HTTP**: security headers no `next.config.ts` (HSTS preload, CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) — fontes self-hosted via `next/font`
- **Rate Limit**: in-memory com sweep (teto 10k buckets) — medicines 60/min, autocomplete 120/min, feedback 20/min; **login 10/min** no callback `/api/auth/callback/credentials` (route wrapper) + proxy
- **Autenticação**: páginas `/admin/*` protegidas por sessão; actions admin com `withAdmin`; APIs analytics/feedback exigem role `ADMIN`
- **TLS de saída**: verificação por padrão; único bypass escopado ao host ANVISA (`anvisa-https.ts`) — sem variável global
- **Erros**: rotas devolvem mensagens genéricas (erro do Prisma nunca vaza ao cliente)
- **PWA**: service worker NÃO cacheia `/admin`/`/api`/`/dashboard`
- **CI**: GitHub Actions roda lint + typecheck + testes + build
- Detalhes: `docs/SECURITY.md`

---

## Fontes de Dados

- **Medicamentos**: [Dados Abertos ANVISA](https://dados.anvisa.gov.br/dados/) — `TA_CONSULTA_MEDICAMENTOS.CSV`
- **Preços**: Tabela CMED — `TA_PRECOS_MEDICAMENTOS.csv`
- **Farmácia Popular**: PDF do Ministério da Saúde
- **Portal**: [dados.anvisa.gov.br](https://dados.anvisa.gov.br/dados/)

---

## Documentação

- `docs/API.md` — endpoints REST (parâmetros, rate limits, exemplos)
- `docs/ARCHITECTURE.md` — visão geral, fluxos de dados, decisões
- `docs/BUSINESS_RULES.md` — regras de negócio, busca híbrida, dados
- `docs/DATABASE.md` — schema, índices, migrações, trigger tsvector
- `docs/DEPLOYMENT.md` — deploy, backup, monitoramento, crontab
- `docs/DEVELOPMENT.md` — setup de desenvolvimento, comandos
- `docs/CRON.md` — agendamentos (sync, purge, backup, monitor)
- `docs/DESIGN_SYSTEM.md` — identidade visual, componentes, a11y
- `docs/SECURITY.md` — modelo de ameaça, headers, rate limits
- `docs/USER_STORIES.md` — jornadas do usuário
- `docs/MCP.md` — MCP Server (tools, clientes, segurança, deploy)

---

## Contribuindo

Contribuições são bem-vindas! Abra uma issue ou envie um pull request (CI roda automaticamente: lint, typecheck, testes e build).

---

## Licença

MIT