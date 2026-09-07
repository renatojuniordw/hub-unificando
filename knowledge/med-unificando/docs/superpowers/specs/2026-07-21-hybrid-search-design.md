# Hybrid Search Design

**Date:** 2026-07-21
**Status:** Approved
**Author:** SDD Task Force

---

## 1. Problem Statement

The original search implementation had four shortcomings:

1. **English-only embedding model** — `all-MiniLM-L6-v2` is trained on English text, producing poor semantic matches for Portuguese medical queries like "anti-inflamatório para articulação" or "remédio para pressão".

2. **Missing pharmaceuticalForm resolution** — The `pharmaceuticalForm` column stores raw ANVISA numeric codes (e.g., `"117"`, `"76, 79"`). These were included verbatim in the embedding text, making semantic search blind to the actual form name (e.g., "XAROPE", "COMPRIMIDO REVESTIDO").

3. **Flat embedding text** — The embedding concatenation included only `tradeName`, `activeIngredient`, `pharmaceuticalForm`, `therapeuticClass`, `indications`, and `synonyms`. It lacked ATC descriptions, prescription type names, Farmácia Popular flag, and other context that would improve semantic relevance.

4. **Semantic-only search** — There was no keyword/trigram fallback. Queries with exact terms (e.g., "xarope", "comprimido") that failed to match semantically returned empty results even when exact matches existed in the database.

---

## 2. Data Quality Findings

| Column | Issue | Impact |
|--------|-------|--------|
| `pharmaceuticalForm` | ANVISA numeric codes (e.g., `"117"`, `"76, 79"`), not human-readable names | Embedding text and keyword search operate on codes, not form names |
| `prescriptionType` | ANVISA codes `"1"`, `"2"`, `"3"`, `"4"` and combinations (e.g., `"1, 2"`) | Same — codes stored, not names |
| `therapeuticClass` | **0% populated** (0/32,585 records) — the ANVISA therapeutic class CSV is inaccessible (`fetch` falls back to `.catch(() => [])` silently) | Keyword search weight for this field (1.5x) has no data to match against |
| `atcCode` | **2.2% populated** (716/32,585) — extremely sparse | ATC descriptions can be resolved for the few records that have codes, but coverage is low |
| `farmaciaPopular` | Column did not exist in the database initially (migration added in Task 4) | Embedding regeneration needed to include this signal |

**Root cause:** ANVISA publishes inter-dependent CSV files. The main `TA_CONSULTA_MEDICAMENTOS.CSV` contains codes that reference lookup tables in other files. Those secondary files (`DADOS_ABERTOS_MEDICAMENTOS.csv` for therapeutic classes) are intermittently inaccessible or structured differently than expected.

---

## 3. Architecture Overview

The solution follows a 4-phase approach executed sequentially across tasks 1–9:

```
Phase 1: Lookup Tables
┌──────────────────────────────────────────────────────────┐
│  pharmaceutical-forms.ts  │  atc-codes.ts               │
│  prescription-types.ts    │  therapeutic-classes.ts     │
└──────────────────────────┬┘
                          │ resolve
                          ▼
Phase 2: Infrastructure
┌──────────────────────────────────────────────────────────┐
│  pg_trgm extension + GIN index on 5 search fields        │
│  (pharmaceuticalForm, therapeuticClass, activeIngredient, │
│   tradeName, indications)                                 │
└──────────────────────────────────────────────────────────┘
                          │ enables
                          ▼
Phase 3: Embeddings + Multilingual Model
┌──────────────────────────────────────────────────────────┐
│  Model: paraphrase-multilingual-MiniLM-L12-v2 (384d)    │
│  Text: resolved names + ATC + prescType + farmaciaPopular│
└──────────────────────────────────────────────────────────┘
                          │ feeds
                          ▼
Phase 4: Search Components
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Query Parser │───▶│ Keyword      │───▶│ Hybrid       │
│ (form/class) │    │ Search       │    │ Search (RRF) │
│              │    │ (pg_trgm)    │    │ (K=60)       │
└──────────────┘    └──────────────┘    └──────────────┘
                            ▲
                     ┌──────┴──────┐
                     │ Semantic    │
                     │ Search      │
                     │ (cosine sim)│
                     └─────────────┘
```

### Data Flow

```
User Query ("xarope antialérgico")
        │
        ▼
  Query Parser
        │
        ├── pharmaceuticalForms: ["xarope"]
        ├── therapeuticClasses: ["antialérgico"]
        └── otherTerms: []
              │
              ▼
  ┌───────────────────┐     ┌───────────────────┐
  │ Keyword Search    │     │ Semantic Search   │
  │ (pg_trgm + XGBoost│     │ (cosine sim 384d) │
  │  field weights)   │     │                   │
  └────────┬──────────┘     └────────┬──────────┘
           │ rank                   │ rank
           ▼                        ▼
  ┌─────────────────────────────────────┐
  │ RRF Fusion (K=60)                   │
  │ rrf = 1/(K+r_sem) + 1/(K+r_key)    │
  └────────────────┬────────────────────┘
                   ▼
           Top 20 Results
```

---

## 4. Component Descriptions

### 4.1 Lookup Dictionaries

Four modules under `src/lib/dictionaries/` that resolve ANVISA codes to human-readable names.

| Module | File | Scope |
|--------|------|-------|
| Pharmaceutical Forms | `pharmaceutical-forms.ts` | Maps 180+ numeric codes (e.g., `"117"` → `"XAROPE"`) to Portuguese names. Handles comma-separated combinations (e.g., `"76, 79"` → `"COMPRIMIDO REVESTIDO, CÁPSULA"`). |
| Prescription Types | `prescription-types.ts` | Maps codes `"1"`→`"VENDA SOB PRESCRIÇÃO MÉDICA"`, `"2"`→`"TARJA VERMELHA"`, `"3"`→`"TARJA PRETA"`, `"4"`→`"VENDA SEM PRESCRIÇÃO"`. Handles combinations (e.g., `"1, 2"`). |
| ATC Codes | `atc-codes.ts` | Maps first letter of ATC code to level-1 description (e.g., `"N"`→`"SISTEMA NERVOSO"`). Also provides `getAtcLevel()` for hierarchical breakdown. |
| Therapeutic Classes | `therapeutic-classes.ts` | Currently an empty array — the ANVISA CSV for therapeutic classes is inaccessible. Placeholder for future population. |

**Usage pattern:** Each module exports a getter function (`getPharmaceuticalFormName`, `getPrescriptionTypeName`, `getAtcDescription`) that accepts `string | null | undefined`, handles nulls/empties, resolves codes via an internal lookup table, and returns the name or `null`.

### 4.2 Query Parser

**File:** `src/lib/query-parser.ts`

Splits a user query into three classified buckets:

| Bucket | Source | Example Match | Weight Boost |
|--------|--------|---------------|-------------|
| `pharmaceuticalForms` | Hardcoded list (21 terms) | "xarope", "comprimido", "pomada" | 2.0× |
| `therapeuticClasses` | Hardcoded list (22 terms) | "antialérgico", "anti-inflamatório" | 1.5× |
| `otherTerms` | Everything else | "remédio", "para", "dormir" | 1.0× |

Edge cases: empty/whitespace query returns all empty arrays; case-insensitive matching; multiple forms/classes in one query.

### 4.3 Keyword Search

**File:** `src/lib/actions/keyword-search.ts`

**Mechanism:** Dynamic SQL using PostgreSQL `pg_trgm` extension's `similarity()` function.

For each (term × field) pair, computes:
```
COALESCE(similarity(m.field::text, $term::text), 0) × fieldWeight × termBoost
```

Then normalizes:
```
keyword_score = Σ(scores) / Σ(weights × boosts)
```

**SQL generation:** Builds `N` similarity conditions (5 fields × M terms), joins them with `OR` in WHERE and weighted sum in SELECT. Uses `$queryRawUnsafe` with parameterized terms for injection safety.

### 4.4 Semantic Search

**File:** `src/lib/actions/semantic-search.ts` (`semanticSearch` function)

**Mechanism:** Cosine similarity between query embedding and all 32,585 pre-computed embeddings.

- Loads `Xenova/paraphrase-multilingual-MiniLM-L12-v2` model (384d, multilingual)
- Loads `embeddings.bin` (Float32Array, ~47MB) and `embeddings-header.json`
- Computes cosine similarity against every embedding vector
- Returns top-K with Ativo-boosting (active medicines ranked above inactive at equal scores)

### 4.5 Hybrid Search (RRF Fusion)

**File:** `src/lib/actions/semantic-search.ts` (`hybridSearch` function)

Fuses semantic and keyword results using Reciprocal Rank Fusion:

```
RRF(d) = 1 / (K + r_semantic(d)) + 1 / (K + r_keyword(d))
```

Where:
- `K = 60` (RRF constant, prevents extreme score domination)
- `r_semantic(d)` = rank position from semantic search (1-based)
- `r_keyword(d)` = rank position from keyword search (1-based)
- Missing from one source → denominator is `Infinity` → term is 0

**Fallback logic:**
- If semantic returns empty → use keyword results directly (sorted by keywordScore)
- If keyword returns empty → use semantic results directly
- If both return results → perform RRF fusion
- Fetches full medicine records for keyword-only results that don't appear in semantic results

---

## 5. Field Weights

| Field | Weight | Rationale |
|-------|--------|-----------|
| `pharmaceuticalForm` | 2.0 | High specificity — users searching "xarope" or "comprimido" have strong intent |
| `therapeuticClass` | 1.5 | Medium specificity — therapeutic class queries ("anti-inflamatório") are meaningful but broader |
| `activeIngredient` | 1.0 | Baseline — active ingredient is the most important identifier but common enough to weight equally with other core fields |
| `tradeName` | 1.0 | Baseline — trade names are specific identifiers |
| `indications` | 1.0 | Baseline — indications provide relevant context but vary widely in quality |

**Term category boosts** (applied multiplicatively on top of field weights):

| Category | Boost | Reason |
|----------|-------|--------|
| pharmaceuticalForms | 2.0× | User explicitly naming a form has strong intent |
| therapeuticClasses | 1.5× | User naming a class has medium intent |
| otherTerms | 1.0× | Generic terms without specific classification signal |

**Effective weight range:** 1.0× (other × indication) to 4.0× (pharmaceuticalForm × pharmaceuticalForms).

---

## 6. File Changes Summary

### Created (12 files)

| File | Purpose | Task |
|------|---------|------|
| `src/lib/dictionaries/pharmaceutical-forms.ts` | Resolve ANVISA codes to form names | 1 |
| `tests/lib/dictionaries/pharmaceutical-forms.test.ts` | Unit tests for form resolution | 1 |
| `src/lib/dictionaries/prescription-types.ts` | Resolve ANVISA codes to prescription type names | 2 |
| `tests/lib/dictionaries/prescription-types.test.ts` | Unit tests for prescription type resolution | 2 |
| `src/lib/dictionaries/atc-codes.ts` | ATC level-1 descriptions | 3 |
| `tests/lib/dictionaries/atc-codes.test.ts` | Unit tests for ATC descriptions | 3 |
| `src/lib/dictionaries/therapeutic-classes.ts` | Empty placeholder for therapeutic classes | 4 |
| `tests/lib/dictionaries/therapeutic-classes.test.ts` | Unit tests (empty list) | 4 |
| `prisma/migrations/*_add_pg_trgm_and_search_index/migration.sql` | pg_trgm extension + GIN index | 6 |
| `src/lib/query-parser.ts` | Query parsing into forms/classes/other | 7 |
| `src/lib/actions/keyword-search.ts` | pg_trgm keyword search server action | 8 |
| `src/lib/actions/semantic-search.ts` | `hybridSearch()` RRF fusion function | 9 |

### Modified (9+ files)

| File | Change | Task |
|------|--------|------|
| `prisma/schema.prisma` | Added `therapeuticClass` field, `farmaciaPopular` field | 4, 5 |
| `scripts/generate-embeddings.ts` | Import from new embeddings-generator module | 2 |
| `src/lib/embeddings-generator.ts` | Enriched text: resolved forms, ATC, prescType, multilingual model | 5 |
| `src/lib/actions/embeddings.ts` | Updated select to include new fields | 5 |
| `src/lib/actions/admin.ts` | Hardened therapeuticClass import with retry + logging | 4 |
| `src/lib/config.ts` | Added `EMBEDDING.MODEL` config (multilingual) | 5 |
| `src/lib/actions/semantic-search.ts` | Added `hybridSearch()` function alongside existing `semanticSearch()` | 9 |
| `src/components/medicines/semantic-search.tsx` | Changed import from `semanticSearch` to `hybridSearch` | 9 |
| `tests/lib/actions/hybrid-search.test.ts` | Integration tests for RRF fusion | 9 |

**Total:** 21 files changed, 854 insertions, 16 deletions across 9 tasks.

---

## 7. Testing Strategy

### Unit Tests (per component)

| Component | Test File | Tests |
|-----------|-----------|-------|
| Pharmaceutical Forms | `tests/lib/dictionaries/pharmaceutical-forms.test.ts` | Single code, multiple codes, null/empty, comma-separated combinations |
| Prescription Types | `tests/lib/dictionaries/prescription-types.test.ts` | Single code, combinations, null/empty |
| ATC Codes | `tests/lib/dictionaries/atc-codes.test.ts` | Level-1 codes, null/empty, getAtcLevel hierarchy |
| Therapeutic Classes | `tests/lib/dictionaries/therapeutic-classes.test.ts` | Empty list is exported |
| Query Parser | `tests/lib/query-parser.test.ts` | Form detection, class detection, case insensitivity, empty query, multiple categories |
| Keyword Search | `tests/lib/actions/keyword-search.test.ts` | Empty query, similarity SQL generation, LIMIT parameter |
| Hybrid Search | `tests/lib/actions/hybrid-search.test.ts` | Empty query, RRF fusion with both sources returning results |

### Mock Strategy

- **Prisma:** `@/lib/prisma` is mocked for all search tests to avoid database dependency
- **Keyword Search:** `@/lib/actions/keyword-search` is mocked in hybrid-search tests to isolate RRF logic
- **Transformers/Xenova:** `@xenova/transformers` is fully mocked — model loading and inference are skipped
- **File system:** `fs.readFileSync` is mocked to return synthetic embedding data (1 record, 4 dims)

### Full Suite

```bash
npx vitest run
```

**Result:** 26 files, 173 tests — all passing.

---

## 8. Rollback Plan

### Scenario: Hybrid search produces worse results than semantic-only

**Steps:**

1. **Revert semantic-search.ts** — Restore `semanticSearch` as the default export in the server action file (keep `hybridSearch` as unused export for future tuning)

2. **Revert UI import** — Change `semantic-search.tsx` back to import `semanticSearch` instead of `hybridSearch`

3. **Drop pg_trgm index (optional)** — If keyword search is not needed:
   ```sql
   DROP INDEX IF EXISTS idx_medicines_search_fields;
   ```

4. **Revert config model (if needed)** — Restore `config.ts` to use `Xenova/all-MiniLM-L6-v2` instead of `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, then regenerate embeddings

### Scenario: Embedding regeneration fails

- Keep old `embeddings.bin` and `embeddings-header.json` in `public/embeddings/`
- The embedding cache (`clearEmbeddingsCache()`) clears in-memory state only
- Fallback: delete new files, restore old files from git, restart server

### Git Commands for Full Rollback

```bash
# Revert all hybrid search changes (tasks 6-9)
git revert 23c8640 936040d d7f8db4 a6332f9 --no-edit

# Or reset to pre-hybrid baseline
git reset --hard 36c2815
```
