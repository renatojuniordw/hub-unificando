# Banco de Dados

## Tecnologia

PostgreSQL 16 via Prisma 7 ORM (cliente gerado em `src/generated/prisma`, adapter `@prisma/adapter-pg`).

Extensões:
- `pgvector` — embeddings vetoriais para busca semântica
- `pg_trgm` — similaridade trigram para autocomplete fuzzy

## Migrations

Total: 17 migrations (em `prisma/migrations/`):

| Migration | Descrição |
|-----------|-----------|
| `20260717174911_init` | Tabela `medicines` inicial |
| `20260717175640_add_users` | Modelo `User` para autenticação |
| `20260717193631_enrich_medicine_model` | Campos: category, atcCode, status, etc. |
| `20260717195040_add_prices` | Modelo `Price` para preços CMED |
| `20260717213851_add_synonyms_indications` | Campos `synonyms` e `indications` |
| `20260717223730_add_sync_log` | Modelo `SyncLog` para log de sincronizações |
| `20260721132351_add_therapeutic_class` | Campo `therapeuticClass` no modelo Medicine |
| `20260721191040_add_farmacia_popular` | Campo `farmaciaPopular` no modelo Medicine |
| `20260721204758_add_pg_trgm_and_search_index` | Extensão pg_trgm, índice GIN trigram (5 colunas) |
| `20260721214620_add_pgvector_tsvector` | Colunas `embedding` (vector(384)) + `search_document` (tsvector GENERATED), índice GIN |
| `20260821000000_add_embedding_new_768` | Nova coluna `embedding_new` vector(768) + índice HNSW |
| `20260821010000_add_search_logs` | Tabela `search_logs` (analytics de busca) |
| `20260821020000_finalize_embedding_768` | Remove `embedding` (384d), renomeia `embedding_new` → `embedding` (768d) e o índice |
| `20260821030000_add_search_feedback` | Tabela `search_feedback` + índices |
| `20260903000000_make_search_document_regular` | `search_document` vira coluna **regular** (não GENERATED); índices para `referenceMedicine`, `atcCode`, `inclusionDate` |
| `20260903120000_remove_salt_column` | Remove campo `salt` de `users` (hash bcrypt embute o salt; campo redundante) |
| `20260904000000_add_search_document_trigger` | Função + trigger `trg_medicines_search_document` preenche `search_document` no INSERT/UPDATE (via COALESCE, preservando vetores do script) |

## Modelos

### Medicine (32.661 registros)

```prisma
model Medicine {
  id                   Int      @id @default(autoincrement())
  reference            String   // Número de registro ANVISA (9 dígitos)
  activeIngredient     String   // Princípio ativo
  tradeName            String   // Nome comercial
  similarHolder        String   @map("holder_of_similar_medicine_registration")  // Detentor
  pharmaceuticalForm   String   // Forma farmacêutica
  concentration        String   // Concentração
  inclusionDate        String   // Data de publicação ANVISA
  category             String?  // Similar, Genérico, Novo, Específico, Fitoterápico, Biológico, Dinamizado, Radiofármaco
  referenceMedicine    String?  // Medicamento de referência (para similares)
  atcCode              String?  // Código ATC
  prescriptionType     String?  // Tarja (tipo de prescrição)
  status               String?  // Ativo / Inativo
  authorization        String?  // Número de autorização
  presentationCount    Int?     // Quantidade de apresentações registradas
  synonyms             String?  // Sinônimos do produto (quando disponível)
  indications          String?  // Indicações terapêuticas (quando disponível)
  therapeuticClass     String?  // Classe terapêutica
  anvisaFileDate       DateTime? // Data do arquivo ANVISA (Last-Modified do CSV)
  lastImportAt         DateTime? // Data da última importação
  farmaciaPopular      Boolean  @default(false) @map("farmacia_popular") // Farmácia Popular (MS)
  embedding            Unsupported("vector(768)")? // Embedding pgvector para busca semântica
  searchDocument       Unsupported("tsvector")?   @map("search_document") // Documento tsvector (coluna regular)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([reference])
  @@index([activeIngredient])
  @@index([tradeName])
  @@index([similarHolder])
  @@index([category])
  @@index([status])
  @@index([farmaciaPopular])
  @@map("medicines")
}
```

> `embedding` é `vector(768)` (multilingual-e5-base). `search_document` é uma coluna **regular** (não GENERATED) — desde a migração `20260904000000` um **trigger** (`trg_medicines_search_document`) preenche `search_document` automaticamente em INSERT/UPDATE com os campos crus (via `COALESCE`, sem sobrescrever vetores existentes), garantindo que **após um sync a busca textual nunca fique vazia**; o refinamento de alta qualidade (nomes de forma farmacêutica/ATC resolvidos) continua via `scripts/generate-tsvector.ts` / `src/lib/tsvector-refresh.ts`.

### Price (53.422 registros)

```prisma
model Price {
  id           Int      @id @default(autoincrement())
  reference    String   // Registro ANVISA (primeiros 9 dígitos do NU_REGISTRO)
  cnpj         String   // CNPJ do detentor
  company      String   // Razão social
  productName  String   // Nome do produto
  presentation String   // Apresentação (dosagem + embalagem)
  substance    String   // Substância ativa
  pf0Price     Float?   // Preço Fábrica ICMS 0%
  pf18Price    Float?   // Preço Fábrica ICMS 18%
  hospitalOnly String?  // Restrição hospitalar (S/N)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([reference])
  @@index([cnpj])
  @@map("prices")
}
```

### User

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  role              String   @default("USER")
  password          String
  confirmationToken String?
  recoverToken      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("users")
}
```

Cardinalidade: 1 usuário admin por instalação.

### SyncLog

```prisma
model SyncLog {
  id        Int      @id @default(autoincrement())
  type      String   // 'medicines' | 'prices' | 'embeddings' | 'farmacia-popular'
  count     Int      // Quantidade de registros importados
  status    String   // 'success' | 'error'
  message   String?  // Mensagem de erro (se houver)
  createdAt DateTime @default(now())

  @@map("sync_logs")
}
```

### SearchFeedback

```prisma
model SearchFeedback {
  id           Int      @id @default(autoincrement())
  query        String   // Termo buscado
  medicineId   Int      @map("medicine_id") // ID do medicamento clicado
  medicineName String   @map("medicine_name") // Nome do medicamento clicado
  feedback     String   // "helpful" | "not_helpful"
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([query, feedback])
  @@index([medicineId])
  @@index([createdAt])
  @@map("search_feedback")
}
```

### search_logs (tabela raw — sem modelo Prisma)

Tabela criada por migration e acessada via SQL cru (`$queryRawUnsafe`), usada para analytics de busca:

```sql
CREATE TABLE search_logs (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  top_score REAL,
  query_type TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Escrita: `logSearch` em `src/lib/actions/semantic-search.ts` (fire-and-forget)
- Leitura: `/api/search-analytics` e página admin `/admin/search-analytics`
- Retenção: `scripts/purge-search-logs.ts` (`npm run purge:logs`) remove registros > 365 dias (política LGPD — ver `/privacidade`)

## Índices

| Tabela | Índices | Queries beneficiadas |
|--------|---------|----------------------|
| medicines | reference, activeIngredient, tradeName, similarHolder, category, status, farmaciaPopular | Busca textual, autocomplete, filtros por categoria/situação/Farmácia Popular |
| medicines | `idx_medicines_embedding` (HNSW, cosine) — 768 dims | Busca vetorial por similaridade semântica |
| medicines | `idx_medicines_search_document` (GIN) | Busca tsvector por texto completo |
| medicines | `idx_medicines_search_fields` (GIN trigram, 5 colunas) | Autocomplete fuzzy (operador `%`) |
| medicines | `idx_medicines_reference_medicine`, `idx_medicines_atc_code`, `idx_medicines_inclusion_date` | Filtros ILIKE e ordenações em produção |
| prices | reference, cnpj | Join com medicines por registro, filtro por empresa |
| search_feedback | query+feedback, medicineId, createdAt | Análise de feedback, agregação por consulta |
| search_logs | query, created_at DESC | Analytics: top queries, janelas de tempo |

## Embeddings

Os embeddings são armazenados diretamente no banco de dados PostgreSQL usando a extensão **pgvector**:

- **Modelo**: `Xenova/multilingual-e5-base` (768 dimensões) — configurável via `EMBEDDING_MODEL`/`EMBEDDING_DIMS`
- **Índice**: HNSW com cosine (o antigo IVFFlat de 384d foi removido na migração de finalização)
- **Recall**: a busca semântica define `SET LOCAL hnsw.ef_search = 100` (`SEARCH.HNSW_EF_SEARCH`) antes da consulta — sem isso o HNSW usa o default de 40 e o `LIMIT` (topK × 5 = 100) retorna no máximo 40 registros
- **Geração**: batch de 50 registros (`generate-search-index.ts`), apenas medicamentos sem embedding (`WHERE embedding IS NULL`); retry 3x por lote
- **Prefixo**: texto de documento com prefixo `passage:`; consultas usam `query:`
- **Cache do modelo**: `/tmp/.transformers-cache` (volume `transformers_cache` no Docker)
- **Texto indexado**: `nome | princípio ativo | forma farmacêutica | classe terapêutica | descrição ATC | indicações | sinônimos | concentração | categoria | tipo prescrição | detentor | situação | farmácia popular`

### Colunas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `medicines.embedding` | `vector(768)` | Embedding gerado por `multilingual-e5-base` |
| `medicines.search_document` | `tsvector` | Documento de texto completo (coluna regular, populada por `generate-tsvector.ts`) |

### Índices

- `idx_medicines_embedding`: HNSW (cosine) para busca vetorial
- `idx_medicines_search_document`: GIN para busca tsvector

## Comandos

```bash
# Criar migration
npx prisma migrate dev --name descricao

# Aplicar em produção
npm run migrate

# Gerar cliente
npm run generate

# Seed
npm run seed

# Gerar tsvector search documents (coluna regular)
npm run tsvector

# Gerar embeddings para busca semântica (apenas os que faltam)
npm run search-index

# Re-indexar TODOS os embeddings (força regeneração completa)
npx tsx scripts/reindex-embeddings.ts

# Sequência completa de índices (indications + tsvector + embeddings)
npm run db:index

# Purge de retenção LGPD (search_logs/search_feedback > 365d)
npm run purge:logs

# Gerar ícones PWA
npm run pwa:icons
```