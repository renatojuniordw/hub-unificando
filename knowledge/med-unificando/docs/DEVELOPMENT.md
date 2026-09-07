# Desenvolvimento

## Setup

### Pré-requisitos
- Node.js 22+
- Docker Engine 24+
- NPM 10+

### Passos

```bash
# 1. Clone
git clone git@github.com:renatojuniordw/med-unificando.git
cd med-unificando

# 2. Configure
cp .env.example .env

# 3. Banco
docker compose up -d db

# 4. Dependências
npm install

# 5. Prisma
npx prisma generate
npx prisma migrate deploy

# 6. Seed (importa dados da ANVISA)
npx tsx prisma/seed.ts

# 7. Embeddings para busca semântica (multilingual-e5-base, 768d)
npm run search-index

# 8. Sincronizar Farmácia Popular
npm run farmacia-popular

# 9. Dev server
npm run dev
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server :11006 com hot reload |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção :11006 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (unit) |
| `npm run test:watch` | Vitest watch |
| `npm run test:coverage` | Vitest coverage (número oficial) |
| `npm run test:e2e` | Playwright E2E (9 specs; sobe dev server próprio em 11009) |
| `npm run test:e2e:ui` | Playwright UI |
| `npm run seed` | Importar dados ANVISA |
| `npm run migrate` | Aplicar migrations Prisma |
| `npm run generate` | Gerar cliente Prisma |
| `npm run search-index` | Gerar embeddings pgvector (apenas os que faltam) |
| `npm run tsvector` | Gerar tsvector search documents (gap-fill + refinamento) |
| `npm run backfill-indications` | Backfill indicações terapêuticas |
| `npm run farmacia-popular` | Sincronizar Farmácia Popular |
| `npm run purge:logs` | Purge de `search_logs`/`search_feedback` (LGPD, 365d) |
| `npm run pwa:icons` | Regenerar ícones PNG do PWA (192/512) |
| `npm run db:index` | Indications + tsvector + embeddings (sequência) |
| `npm run docker:up` | docker compose up -d |
| `npm run docker:down` | docker compose down |
| `npm run docker:build` | docker compose build --no-cache |

## Estrutura de Arquivos

```
src/
├── app/             # App Router
│   ├── page.tsx     # Home (busca semântica)
│   ├── buscar-avancado/  # Busca textual avançada
│   ├── medicamento/[slug]/ # Detalhes + PDF + preços
│   ├── referencias/      # Lista + detalhe de referência
│   ├── atc/              # Árvore ATC
│   ├── detentor/[holder]/  # Medicamentos por empresa
│   ├── dashboard/        # Estatísticas
│   ├── compare/          # Comparação
│   ├── sobre/            # Sobre o projeto
│   ├── admin/            # Login, import, medicamentos, feedback
│   └── api/              # medicines, health, search-feedback, auth
├── components/
│   ├── admin/       # SyncCard, ImportStats, PriceStats, ConfirmModal, SyncLogList
│   ├── dashboard/   # DashboardFilters, FilterBar, StatCards, ChartsSection
│   ├── layout/      # Header (active link), Footer
│   └── medicines/   # 19 componentes (SearchForm, AutocompleteField, MedicineTable, etc.)
├── hooks/           # use-favorites, use-recent-searches, use-debounced-search
├── lib/
│   ├── actions/     # 17 server actions
│   ├── dictionaries/# ATC, formas farmacêuticas, tarjas, classes, sinônimos
│   ├── config.ts    # Configurações centralizadas (SITE, SEARCH, EMBEDDING, ANVISA)
│   ├── constants.ts # Constantes nomeadas
│   ├── rate-limit.ts # Rate limiter in-memory (por IP, por escopo)
│   ├── auth-guard.ts # withAuth / withAdmin / isAdmin
│   ├── auth.config.ts # Config NextAuth
│   ├── search-preprocessor.ts # Classificação de queries
│   ├── format.ts    # Normalização de texto
│   ├── text-utils.ts # Utilitários de texto
│   ├── build-where.ts # Construção de filtros Prisma
│   ├── query-parser.ts # Parse de query
│   ├── keyword-utils.ts # Sinônimos e expansão
│   ├── search-relevance.ts # Cálculo de relevância
│   ├── score-adjustments.ts # Ajustes por feedback
│   ├── embeddings-generator.ts # Geração batch de embeddings
│   ├── csv-utils.ts # Escape CSV
│   ├── safe-json-ld.ts # JSON-LD sanitizado
│   ├── pdf-parser.ts # Parse de PDF
│   ├── theme-provider.tsx # Dark mode context
│   └── hooks/use-medicine-search.ts # Busca com URL search params
├── types/           # TypeScript interfaces
├── auth.ts          # Instância NextAuth
└── proxy.ts         # Rate limit do login (10/min)
```

## Convenções

### Código
- TypeScript estrito (`strict: true`)
- Server Components por padrão, Client Components quando necessário (`'use client'`)
- Server Actions para mutações de dados
- CSS com Tailwind v4 (utilitário, sem CSS modules)

### Organização
- `src/app/` — rotas (App Router)
- `src/components/` — componentes React
- `src/lib/` — lógica de negócio
- `src/lib/actions/` — server actions
- `src/types/` — tipos compartilhados

### Componentes UI
- `src/components/ui/` — genéricos, reutilizáveis
- `src/components/medicines/` — específicos do domínio
- Cada componente em seu próprio arquivo `.tsx`

### Commits
- Commits atômicos (uma mudança por commit)
- Mensagens em português ou inglês
- Prefixos: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`

## Modelo de Dados

Sempre que alterar `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name descricao
npx prisma generate
```

Nunca edite migrations já aplicadas — sempre crie novas.

## Geração de PDF

O PDF é gerado server-side com `pdfmake`. A action `generateMedicinePdf()` em
`src/lib/actions/pdf-report.ts` cria um documento com cabeçalho, grid de informações,
tabela de preços e rodapé.

O `pdfmake` está em `serverExternalPackages` no `next.config.ts` porque usa
módulos nativos do Node.js (pdfkit internamente).

```typescript
import PdfPrinter from 'pdfmake'
const printer = new PdfPrinter(fonts)
const doc = printer.createPdfKitDocument(docDefinition)
doc.pipe(res)
doc.end()
```

Após importar novos dados, regenerar embeddings:

```bash
npm run search-index
```

Isso atualiza os embeddings no banco de dados PostgreSQL (pgvector) com os medicamentos que ainda não possuem embedding.

## Busca Semântica

Usa `@xenova/transformers` com o modelo `Xenova/multilingual-e5-base` (768 dimensões).

O modelo é baixado automaticamente na primeira execução e cacheado em `/tmp/.transformers-cache` (volume `transformers_cache` no Docker).

O fluxo:
1. `npm run search-index` → gera embeddings no banco pgvector (coluna `embedding` vector(768), índice HNSW)
2. Busca semântica: pgvector cosine distance com **semantic gate** (thresholds em `SEARCH` no `config.ts`); `SET LOCAL hnsw.ef_search = 100` garante o recall do HNSW
3. Busca keyword: tsvector + GIN index (stemming pt-br + sinônimos)
4. Busca trigram: pg_trgm (`%` + `similarity`) para keyword/autocomplete
5. **RRF fusion** (Reciprocal Rank Fusion) combina os 3 rankings (k=60; pesos: semântica 0.40, keyword 0.35, trigram 0.25)
6. **Score adjustments** baseados em feedback dos usuários
7. **Synonym expansion** com mapa consolidado em `dictionaries/synonyms.ts`

Regras adicionais do pipeline (config em `SEARCH`): queries de condição com confiança alta aprovam no gate a partir de `SEMANTIC_HARD_MIN` (0.80) sem suporte keyword/trigram; resultados sem suporte textual com score semântico ≥ `SEMANTIC_NO_SUPPORT_EXEMPT` (0.80) são eximidos da penalidade; o fallback é híbrido (semântica + keyword + trigram via RRF) para semânticos reprovados no gate com score ≥ `SEMANTIC_FALLBACK_MIN` (0.80). Ajustes de score em `score-adjustments.ts` incluem prioridade para medicamentos Ativos (`INACTIVE_STATUS_PENALTY`) e penalidades de tópico não-gástrico expandidas (cardiovascular/angina, urinário/bexiga, oxibutinina) para buscas de estômago. Fallbacks também persistem em `search_logs`.

O texto usado para gerar cada embedding (prefixo `passage:`) inclui:
`nome | princípio ativo | forma farmacêutica | classe terapêutica | descrição ATC | indicações | sinônimos | concentração | categoria | tipo prescrição | detentor | situação | farmácia popular`

## Testes

```bash
npm run test           # Rodar testes
npm run test:watch     # Modo watch
npm run test:coverage  # Com cobertura
```

Testes estão em `tests/` usando Vitest + @testing-library/react + jsdom. E2E em `e2e/` com Playwright.

```bash
npm run test:e2e   # exige Postgres (medicamentos-db) no ar; sobe dev server próprio em 11009
```

Cobertura oficial (`npm run test:coverage`): **Lines 91% · Stmts 89.1% · Branch 81.9% · Funcs 88.3%** (58 arquivos / 385 testes unit; 18 testes E2E). `semantic-search.ts` fica fora da cobertura por design (injeta modelo on-device).

## MCP Server

O endpoint MCP (`/api/mcp`) funciona no dev server normalmente. Para testá-lo manualmente:

```bash
# Dev server
npm run dev

# Para testar com respostas JSON puras (sem SSE) — o default é SSE
MCP_ENABLE_JSON_RESPONSE=true npm run dev
```

Em seguida siga o fluxo de curl descrito em `docs/MCP.md` (initialize → tools/list → tools/call).

Testes dedicados:
- **Unit (Vitest)**: `tests/lib/mcp-registry.test.ts`, `tests/lib/mcp-schemas.test.ts`,
  `tests/lib/mcp-tools.test.ts`, `tests/lib/mcp-session.test.ts`, `tests/lib/mcp-security.test.ts`,
  `tests/api/mcp-route.test.ts`.
- **E2E (Playwright)**: `e2e/mcp.spec.ts` — valida o handshake real; o servidor de E2E roda com
  `MCP_ENABLE_JSON_RESPONSE=true` (configurado em `playwright.config.ts`).

## Hooks Customizados

- `use-favorites` — Favoritos em localStorage (toggle, isFavorite)
- `use-recent-searches` — Últimas 5 buscas em localStorage
- `use-debounced-search` — Busca com debounce genérica, proteção contra race condition
- `use-medicine-search` (`src/lib/hooks/`) — URL search params → server data → pagination, proteção contra race condition; não refaz a busca no mount (SSR já serviu)
- `use-autocomplete` — sugestões com navegação por teclado; Enter só é interceptado quando há sugestão selecionada (form submete por teclado)

## Encoding

Os CSVs da ANVISA estão em **Latin-1 (ISO-8859-1)**.

```typescript
// Correto
import iconv from 'iconv-lite'
const text = iconv.decode(buffer, 'latin1')

// ERRADO — corrompe acentos
const text = buffer.toString()
```

## SSL

Os servidores da ANVISA usam certificados ICP-Brasil que não constam nas CAs padrão do Node, causando `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. O projeto resolve isso com um agente HTTPS **escopado ao host ANVISA** (`src/lib/anvisa-https.ts`) — usado por `prisma/seed.ts`, `prisma/import-prices.ts`, `scripts/backfill-therapeutic-class.ts`, `src/lib/csv-utils.ts` e `src/lib/actions/admin.ts`.

Não é necessário (nem recomendado) exportar `NODE_TLS_REJECT_UNAUTHORIZED=0` globalmente — isso desabilitaria a verificação TLS de todas as conexões de saída do processo.

## Porta

O projeto roda na porta **11006** (configurada em `package.json` scripts).

```bash
npm run dev    # → http://localhost:11006
npm run start  # → http://localhost:11006
```
