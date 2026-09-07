# Arquitetura

## Visão Geral

Med Unificando é uma aplicação Next.js 16 (App Router) com PostgreSQL que consome dados abertos da ANVISA e do Ministério da Saúde para fornecer consulta inteligente de medicamentos intercambiáveis brasileiros.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Navegador   │────▶│  Next.js 16  │────▶│ PostgreSQL  │
│ (Tailwind v4)│     │ (App Router) │     │   (Prisma)  │
│   (PWA)     │     │  :11006      │     │   :5432     │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                     │
                    ┌──────▼───────┐    ┌────────▼────────┐
                    │  Xenova/TF   │    │  SearchFeedback  │
                    │ (Embeddings) │    │   (score ajust)  │
                    │ (LLM local)  │    └─────────────────┘
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌─────────────────┐
                    │  Dados       │     │  Farmácia       │
                    │  Abertos     │     │  Popular (PDF)  │
                    │  ANVISA/CMED │     │  MS             │
                    └──────────────┘     └─────────────────┘
```

## Estrutura de Pastas

```
med-unificando/
├── prisma/
│   ├── schema.prisma              # Medicine, Price, User, SyncLog, SearchFeedback (search_logs é tabela crua)
│   ├── migrations/                # 17 migrations versionadas (inclui trigger de tsvector + remove salt)
│   └── seed.ts                    # Importa CSV ANVISA (medicamentos) + admin
├── scripts/
│   ├── generate-search-index.ts   # Gera embeddings pgvector 768d (multilingual-e5-base), incremental
│   ├── reindex-embeddings.ts      # Re-indexa TODOS os embeddings (forçado)
│   ├── generate-tsvector.ts       # Gap-fill da coluna regular tsvector (refina via tsvector-refresh.ts)
│   ├── sync-farmacia-popular.ts   # Sincroniza PDF da Farmácia Popular
│   ├── backfill-indications.ts    # Preenche indicações terapêuticas
│   ├── backfill-therapeutic-class.ts  # Preenche classe terapêutica do CSV DADOS_ABERTOS
│   ├── add-active-ingredients.ts  # Adiciona princípios ativos normalizados
│   ├── purge-search-logs.ts       # Purge retenção LGPD (365d) de search_logs/search_feedback
│   ├── smoke-sync-ids.ts          # Smoke: prova que o diff preserva IDs
│   ├── generate-pwa-icons.ts      # Gera icons-192/512.png a partir do SVG (sharp)
│   ├── check-backup-freshness.sh  # Verifica frescor do backup (para cron/monitor)
│   ├── e2e-server.sh              # Sobe dev server + warm-up p/ Playwright
│   ├── diagnose-search.ts         # Diagnóstico de performance da busca
│   ├── test-hybrid-search.ts / test-hybrid.ts / test-keyword.ts / test-tsvector.ts
│   ├── run-search-tests.ts        # Runner de bateria de testes de busca
│   └── analyze-thresholds.ts      # Análise de thresholds de relevância
├── public/
│   ├── manifest.json              # PWA manifest (ícones 192/512, standalone)
│   ├── sw.js                      # Service worker (não cacheia /admin·/api·/dashboard)
│   ├── icon-192.png · icon-512.png · icon-192.svg
│   └── llms.txt
├── src/
│   ├── app/
│   │   ├── page.tsx               # Home (busca semântica + autocomplete)
│   │   ├── loading.tsx            # Loading state global (skeleton realista)
│   │   ├── not-found.tsx          # 404 customizada
│   │   ├── sitemap.ts             # Sitemap dinâmico (~32k+ URLs)
│   │   ├── robots.ts              # Configuração de indexação
│   │   ├── opengraph-image.tsx    # OG Image gerada dinamicamente
│   │   ├── medicamento/[slug]/    # Detalhes + JSON-LD + breadcrumbs + bula + gráfico preços + similares
│   │   ├── referencias/           # Lista (paginação, A-Z, ordenação) + detalhe de referência
│   │   ├── atc/                   # Árvore ATC (busca + autocomplete + expandir/recolher)
│   │   ├── atc/[code]/            # Medicamentos por código (paginação, breadcrumbs, mobile cards)
│   │   ├── detentor/[holder]/     # Todos medicamentos de uma empresa (cards mobile + resumo)
│   │   ├── dashboard/             # Stats + timeline por ano
│   │   ├── compare/               # Comparação lado a lado
│   │   ├── sobre/                 # Sobre o projeto
│   │   ├── mcp/                   # Página pública com instruções do MCP Server
│   │   ├── privacidade/           # Política de privacidade (LGPD)
│   │   ├── admin/
│   │   │   ├── (auth)/login/      # Login (rate limit 10/min no callback)
│   │   │   └── (protected)/       # Layout que exige sessão (redirect p/ login)
│   │   │       ├── import/            # Sincronização ANVISA + Preços + Farmácia Popular
│   │   │       ├── medicamentos/      # CRUD de medicamentos (admin)
│   │   │       ├── medicamentos/[id]/ # Edição individual
│   │   │       ├── search-feedback/   # Visualização de feedback de busca
│   │   │       └── search-analytics/  # Analytics das buscas (search_logs)
│   │   └── api/
│   │       ├── medicines/         # API REST pública (JSON/CSV, rate limit 60/min)
│   │       ├── autocomplete/      # Sugestões trigram (rate limit 120/min)
│   │       ├── search-feedback/   # POST feedback (20/min) + GET stats (admin)
│   │       ├── search-analytics/  # GET analytics (admin)
│   │       ├── mcp/               # MCP Server — Streamable HTTP (tools read-only)
│   │       ├── auth/[...nextauth] # NextAuth v5 (Credentials)
│   │       └── health/            # Health check
│   ├── components/
│   │   ├── layout/                # Header (active link), Footer
│   │   ├── ui/                    # Badge, Button, Card, Input, Pagination, Skeleton,
│   │   │                          # Tooltip, Toast, Breadcrumbs, StatusPill, ClipboardButton,
│   │   │                          # FavoriteButton, PdfDownloadButton, ScrollToTop,
│   │   │                          # ConsoleCredits, ErrorBoundary, BarChart
│   │   ├── dashboard/             # DashboardFilters, FilterBar, StatCards, ChartsSection
│   │   ├── admin/                 # SyncCard, ImportStats, PriceStats, ConfirmModal, SyncLogList
│   │   └── medicines/             # SearchForm, AutocompleteField, SemanticSearch, MedicineTable,
│   │                              # MedicineInfoCard, SimilarSection, PriceSection, PriceChart,
│   │                              # CompareView, CompareTable, CompareSearch, ExportButton,
│   │                              # StatusFilter, ActionBar, HolderContent, ReferenceSearch,
│   │                              # SimilarMedicinesList, AtcTree, AtcCodeContent, ViewToggle,
│   │                              # SemanticResultsTable, SearchResultsCards, RecentSearches
│   ├── hooks/                     # use-favorites, use-recent-searches, use-debounced-search, use-autocomplete
│   ├── components/pwa-register.tsx # Registro do service worker (contexto seguro)
│   ├── lib/
│   │   ├── actions/               # 17 server actions
│   │   │   ├── search.ts                    # searchMedicines (clamp pageSize), getDashboardStats, searchAutocomplete, countMedicines
│   │   │   ├── semantic-search.ts           # hybridSearch (IA local, RRF 3 vias), classificação
│   │   │   ├── keyword-search.ts            # Busca tsvector + FTS
│   │   │   ├── trigram-search.ts            # Busca trigram (pg_trgm)
│   │   │   ├── admin.ts                     # syncWithAnvisa, getImportInfo
│   │   │   ├── prices.ts                    # syncPrices
│   │   │   ├── embeddings.ts                # Geração de embeddings (batch 50)
│   │   │   ├── compare.ts                   # Comparação lado a lado
│   │   │   ├── references.ts                # Referências
│   │   │   ├── atc.ts                       # Árvore ATC
│   │   │   ├── export-action.ts             # CSV + Excel (xlsx)
│   │   │   ├── pdf-report.ts                # PDF (pdfmake)
│   │   │   ├── search-feedback.ts           # CRUD de feedback + applyScoreAdjustments
│   │   │   ├── farmacia-popular.ts          # Parse + match Farmácia Popular
│   │   │   ├── farmacia-popular-ativos.ts   # Ativos da Farmácia Popular
│   │   │   ├── medicines-admin.ts           # CRUD admin de medicamentos
│   │   │   └── medicine-detail.ts           # Detalhes do medicamento
│   │   ├── dictionaries/
│   │   │   ├── atc-codes.ts
│   │   │   ├── pharmaceutical-forms.ts
│   │   │   ├── prescription-types.ts
│   │   │   ├── synonyms.ts                  # SYNONYM_MAP consolidado
│   │   │   ├── therapeutic-classes.ts
│   │   │   └── therapeutic-class-indications.ts
│   │   ├── sync-diff.ts           # Diff preservando IDs (matchKey reference + multiplicidade)
│   │   ├── tsvector-refresh.ts    # Regeneração de tsvector com nomes ATC/forma resolvidos
│   │   ├── anvisa-https.ts        # Agente TLS escopado à ANVISA (ICP-Brasil)
│   │   ├── data-cache.ts          # Wrappers unstable_cache (detail, atc, holder, dashboard, stats)
│   │   ├── config.ts              # Configurações centralizadas (SITE, SEARCH, EMBEDDING, ANVISA)
│   │   ├── constants.ts           # MEDICINE_LIMITS etc.
│   │   ├── rate-limit.ts          # Rate limiter in-memory (por IP, por escopo; sweep/evict, teto 10k)
│   │   ├── rate-limit-action.ts   # Rate limit para server actions públicas
│   │   ├── auth-guard.ts          # withAuth, withAuthReturn, withAdmin, withAdminReturn, isAdmin
│   │   ├── auth.config.ts         # Config NextAuth (signIn, maxAge, cookies)
│   │   ├── search-preprocessor.ts # classifyQuery, refineLowConfidenceClassification
│   │   ├── format.ts              # Normalização de texto
│   │   ├── text-utils.ts          # Utilitários de texto (normalizeQuery etc.)
│   │   ├── build-where.ts         # Construção de filtros Prisma
│   │   ├── query-parser.ts        # Parse de query
│   │   ├── keyword-utils.ts       # Sinônimos e expansão
│   │   ├── search-relevance.ts    # Cálculo de relevância (honestScore)
│   │   ├── score-adjustments.ts   # Ajustes de score por feedback
│   │   ├── embeddings-generator.ts # Geração batch de embeddings
│   │   ├── mcp/                   # MCP Server (Streamable HTTP)
│   │   │   ├── types.ts           #   McpToolDefinition (declaração declarativa)
│   │   │   ├── result.ts          #   jsonResult / toolError (serialização)
│   │   │   ├── register.ts        #   registerTools(server, defs) — OCP
│   │   │   ├── server.ts          #   createMcpServer() (factory)
│   │   │   ├── config.ts          #   MCP_CONFIG (env vars)
│   │   │   ├── session.ts         #   McpSessionManager (1 server/sessão, TTL)
│   │   │   ├── security.ts        #   origin + api key + rate limit
│   │   │   └── tools/             #   12 tools declarativas + schemas zod
│   │   ├── csv-utils.ts           # Escape CSV
│   │   ├── safe-json-ld.ts        # JSON-LD sanitizado
│   │   ├── pdf-parser.ts          # Parse de PDF
│   │   ├── theme-provider.tsx     # Dark mode context
│   │   ├── prisma.ts              # PrismaClient singleton
│   │   └── hooks/use-medicine-search.ts  # Busca com URL search params
│   ├── types/                     # index, medicine, next-auth.d.ts, pdf-parse.d.ts, pdfmake.d.ts
│   ├── auth.ts                    # Instância NextAuth v5
│   ├── proxy.ts                   # Defesa de borda (matcher /admin/login + /api/auth/callback/credentials)
│   └── generated/prisma/          # Cliente Prisma gerado
├── e2e/                           # 9 specs Playwright (smoke, busca, compare, detalhe, referências, login, PWA, MCP)
├── tests/                         # Testes Vitest (~64 arquivos: api, components, lib, hooks, mcp)
├── .github/workflows/ci.yml       # CI: lint + typecheck + test + build (sem DB)
├── prisma.config.ts
├── vitest.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── docker-entrypoint.sh
├── Dockerfile                     # Multi-stage (node:22-slim, non-root)
├── docker-compose.yml             # App + PostgreSQL (healthcheck, limites)
├── .env.example
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    ├── BUSINESS_RULES.md
    ├── CRON.md
    ├── DATABASE.md
    ├── DEPLOYMENT.md
    ├── DESIGN_SYSTEM.md
    ├── DEVELOPMENT.md
    ├── MCP.md                      # MCP Server (tools, clientes, segurança, deploy)
    ├── SECURITY.md
    └── USER_STORIES.md
```

## Fluxo de Dados

### Importação
1. Usuário admin clica "Sincronizar" ou via script `npm run seed`
2. Servidor faz HEAD no CSV remoto → verifica `Last-Modified`
3. Se alterado: baixa CSV → `iconv` (Latin-1 → UTF-8) → `xlsx` (parse) → **diff em `src/lib/sync-diff.ts`** (casa por `reference` + multiplicidade; só insere/atualiza/apaga o que mudou — **preserva IDs** das URLs públicas)
4. **Transação única** com `pg_advisory_xact_lock(hashtext('unificando_sync'))` (serializa syncs concorrentes; rollback em falha)
5. Trigger `trg_medicines_search_document` preenche `search_document` na hora do INSERT/UPDATE (busca textual nunca fica vazia); refinamento em background (`tsvector-refresh.ts`) eleva a qualidade com nomes ATC/forma resolvidos
6. Extrai `therapeuticClass` do campo `CLASSE_TERAPEUTICA` do CSV DADOS_ABERTOS_MEDICAMENTOS
7. Registra log em `SyncLog` (type, count, status) — preços dentro da mesma transação
8. `revalidatePath('/dashboard')`/`('/atc')` invalida caches; no Docker, a sequência é orquestrada pelo `docker-entrypoint.sh` quando o banco está vazio

### Busca Híbrida (3 fontes + RRF)
1. `npm run search-index` → `Xenova/multilingual-e5-base` (768d) → embeddings no PostgreSQL (pgvector, índice HNSW)
2. `npm run tsvector` → coluna `search_document` tsvector (regular) + índice GIN, stemming pt-br + sinônimos
3. pg_trgm → índice GIN trigram para keyword/autocomplete fuzzy
4. `hybridSearch` orquestra as 3 fontes em paralelo (topK × 5):
   - **Semântica**: `1 - (embedding <=> query_vector)` com cosine; `SET LOCAL ivfflat.probes` (best-effort) + `SET LOCAL hnsw.ef_search = 100` (recall HNSW; sem ele o `LIMIT` truncava em 40); semantic gate
   - **Keyword**: `ts_rank(search_document, to_tsquery('portuguese', ...))` com expansão de sinônimos
   - **Trigram**: `GREATEST(similarity(tradeName), similarity(activeIngredient))` com o operador `%`
5. **RRF fusion** combina os 3 rankings:
   ```
   RRF(d) = Σ peso / (k + posição)
   k = 60 | semântica 0.40 | keyword 0.35 | trigram 0.25
   ```
6. Pós-processamento: penalidade de falso positivo por substring, boost por match de nome, verificação por keyword, penalidade de falta de suporte (com isenção para score semântico ≥ 0.80), ajustes por feedback e prioridade para medicamentos Ativos (penalidade `INACTIVE_STATUS_PENALTY` para status ≠ Ativo)
7. Fallbacks: **fallback híbrido** (semânticos reprovados no gate com score ≥ 0.80 + keyword + trigram via RRF) e semântica pura — ambos também registram em `search_logs`
8. `logSearch` registra a busca em `search_logs` (analytics)

### Classificação de Query
- `classifyQuery` (heurística, `search-preprocessor.ts`): identifica frases de condição ("remédio para"), formas farmacêuticas, classes terapêuticas e nomes de medicamento (sufixos: -lina, -zepam, -prazol, -profeno, etc.)
- `classifyByEmbedding`: compara o embedding da query com centróides (amostra de nomes reais de medicamentos do banco vs. indicações/sinônimos)
- Somente reclassifica o fallback genérico quando a confiança ≤ 0.4

### SearchFeedback (Feedback Loop)
1. Usuário interage com resultados (clica em "útil" / "não útil")
2. POST → `/api/search-feedback` (rate limit 20/min) → tabela `search_feedback`
3. `score-adjustments.ts` consulta feedback agregado por medicamento
4. Ajusta score no re-ranking: feedback positivo aumenta rank, negativo reduz
5. Admin visualiza feedback em `/admin/search-feedback`

### Analytics de Busca
1. `logSearch` grava `query, results_count, top_score, query_type, response_time_ms` em `search_logs`
2. `/api/search-analytics` (admin) expõe top queries, queries sem resultado, performance (avg/p95), total 7 dias e distribuição por tipo
3. Admin visualiza em `/admin/search-analytics`

### Farmácia Popular
1. PDF do Ministério da Saúde é baixado
2. `scripts/sync-farmacia-popular.ts` orquestra a sincronização
3. `pdf-parser.ts` extrai tabelas do PDF
4. `lib/actions/farmacia-popular.ts` faz matching por `activeIngredient`
5. Dados armazenados: medicamento, apresentação, preço máximo, uf
6. Exibido no detalhe do medicamento como badge "Farmácia Popular"

### Geração de Embeddings
1. `scripts/generate-search-index.ts` processa em lotes de 50 medicamentos (DB batch 100, retry 3, delay 100ms)
2. Apenas medicamentos sem embedding (`WHERE embedding IS NULL`)
3. `Xenova/multilingual-e5-base` via Xenova Transformers (server-side, 100% local)
4. Texto com prefixo `passage:` + campos enriquecidos (forma farmacêutica e ATC resolvidos por dicionários)
5. Armazena vetor 768d na coluna `embedding` (pgvector)
6. `scripts/reindex-embeddings.ts` força a regeneração completa (troca de modelo)

### Geração de PDF
1. Botão "📥 BAIXAR PDF" na página de detalhes do medicamento
2. Server action `generateMedicinePdf()` usa pdfmake (engine vfs_fonts)
3. PDF inclui: cabeçalho com marca, informações do medicamento, medicamento de referência, tabela de preços CMED, rodapé com data e fonte
4. `pdfmake` com `pdfkit` como engine de renderização (serverExternalPackages)

### Exportação (CSV/Excel)
1. Botão "Exportar" nos resultados de busca ou dashboard
2. `lib/actions/export-action.ts` gera CSV ou Excel (xlsx library)
3. Suporta filtros ativos (detentor, classe, preço)
4. Download via Response (Content-Disposition: attachment)

### Otimizações de SEO
1. `generateMetadata()` em cada página de detalhe → title + description + Open Graph
2. JSON-LD (Schema.org/MedicalDrug) no detalhe (sanitizado via `safe-json-ld.ts`)
3. `sitemap.ts` → 32K+ URLs
4. `robots.ts` → permite indexação, bloqueia /admin/ e /api/
5. `opengraph-image.tsx` → OG Image dinâmica por medicamento

### PWA (real, desde 2026-09-03)
- `public/manifest.json` com `display: standalone`, `id`, `scope` e **ícones 192x192/512x512** (gerados por `scripts/generate-pwa-icons.ts` via sharp)
- `public/sw.js` — service worker: navegações network-first com fallback offline; `_next/static` cache-first; **exclui `/admin`, `/api`, `/dashboard`** (sessão/dados dinâmicos nunca saem de cache)
- Registro em `src/components/pwa-register.tsx` no root layout (somente https/localhost)
- `apple-touch-icon` aponta para `icon-192.png`

## Decisões Técnicas

| Decisão | Alternativa | Escolha | Motivo |
|---------|-------------|---------|--------|
| IA local vs OpenAI | API paga | Xenova Transformers | Zero custo, sem dependência externa |
| Modelo de embedding | USE, BERT | multilingual-e5-base | 768 dims, multi-língua, melhor recall que e5-small |
| CSV parser | Manual | xlsx library | Lida com aspas, multi-linha, encoding |
| Encoding | UTF-8 direto | iconv-lite Latin-1 | CSV da ANVISA é ISO-8859-1 |
| CSS | styled-components | Tailwind v4 | Build time, sem runtime |
| Auth | NextAuth v5 | Credentials provider | Simples para admin único |
| Porta | 3000 (padrão) | 11006 | Evita conflito com outras apps |
| PDF | jspdf/pdfkit | pdfmake | PdfPrinter API, layout declarativo |
| Test runner | Jest | Vitest | Nativo ESM, mais rápido, compatível com Next |
| Export | csv-stringify | xlsx | Suporte nativo a Excel (.xlsx) |
| Feedback | Session/memória | PostgreSQL (SearchFeedback) | Persistente, auditável, queryável |
| Farmácia Popular | Manual OCR | pdf-parse + matching por activeIngredient | Custo zero, estrutura tabular previsível |
| Rate limit | Redis | In-memory (Map) | Suficiente para instância única; migrar p/ Redis se multi-instância |
| MCP transport | SSE antigo / stdio | Streamable HTTP (web-standard) | Spec 2025-06-18; roda nativo no route handler do Next (Request/Response) |
| MCP session | Singleton por processo | 1 McpServer + 1 transport por sessão (Map) | SDK rejeita conectar o mesmo Server a 2 transports; clientes reconectam via 404 |

## Segurança

- **Docker**: read-only rootfs, `no-new-privileges`, `cap_drop ALL`, non-root user (UID 1001)
- **Rede**: bridge isolada `/16`
- **HTTP**: security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP via next.config.ts)
- **CSP**: Content-Security-Policy no next.config.ts — fontes self-hosted (next/font), sem CDN de fontes
- **Rate limit interno**: `src/lib/rate-limit.ts` (in-memory Map, janela 60s, **sweep/evict teto 10k**) — escopos: medicines-api 60/min, autocomplete 120/min, search-feedback POST 20/min; server actions também limitadas via `rate-limit-action.ts`
- **Rate limit login**: **10/min no callback `/api/auth/callback/credentials`** (wrapper em `[...nextauth]/route.ts`, antes do handler) + `src/proxy.ts` na borda (matcher `/admin/login` + callback)
- **Auth**: páginas `/admin/(protected)/` exigem sessão (redirect p/ login); actions de admin usam withAdmin/withAdminReturn; `/admin/import` tem callback authorized; rotas `/api/search-analytics` e GET `/api/search-feedback` exigem role ADMIN
- **Body Size**: limite de 10MB para server actions; `/api/search-feedback` rejeita body > 8KB (413)
- **Erros**: mensagens genéricas ao cliente (nunca `error.message` do Prisma)
- **Prisma**: módulo não exposto ao cliente (Edge Runtime não o carrega)
- **Infra de build**: `.dockerignore` exclui `.env`/segredos; CI GitHub Actions (lint + typecheck + test + build)