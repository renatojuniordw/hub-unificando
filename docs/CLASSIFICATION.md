# Content Classification

Every ingested document receives a **primary `category`** plus an ordered
multi-label `categories` array. The classifier is hybrid, in
`src/modules/classification/`:

1. **Rules pass** — deterministic keyword scoring against each category.
2. **Semantic pass** — cosine similarity of a passage-prefixed text embedding
   against per-category prototype embeddings.
3. **Fallback** — `general` when nothing reaches confidence.

Classifier service: `src/modules/classification/classifier.service.ts`.
Thresholds: `src/modules/classification/classification.constants.ts`.

## Taxonomy: 16 categories

Categories are DB rows (`categories` table) seeded by `prisma/seed.ts`
from `prisma/seed/categories.ts`. Each has a `slug`, `name`, `description`
and the `keywords` that feed the rule pass; `prototype` is filled later by
`seed-categories` (see below).

| slug | name | keywords highlight |
|---|---|---|
| `design-system` | Design System | tokens, cores, tipografia, sombras, neo-brutalism, grid |
| `architecture` | Arquitetura | arquitetura, módulos, camadas, fluxo, clean architecture, monorepo |
| `api` | API | endpoint, rest, http, rate limit, rota, swagger, openapi |
| `database` | Banco de Dados | postgres, prisma, schema, migration, índice, query, pgvector, redis, hnsw |
| `security` | Segurança | owasp, lgpd, sql injection, xss, jwt, autenticação, api key |
| `deployment` | Deploy & Infra | docker, dockerfile, ci/cd, github actions, nginx, observabilidade |
| `testing` | Testes | jest, vitest, playwright, cobertura, e2e, mock, tdd |
| `mcp` | MCP | mcp, model context protocol, tool, stdio, streamable http |
| `prompt` | Prompts | prompt, engenharia de prompt, meta-prompt, copy |
| `tutorial` | Tutoriais & Guias | tutorial, guia, passo a passo, how-to, walkthrough, manual |
| `seo` | SEO | sitemap, json-ld, meta tags, canonical, lighthouse, core web vitals |
| `workflow` | Convenções & Workflow | workflow, convenções, gates, claude.md, agents.md, processo |
| `decision` | Decisões (ADR) | adr, decision, decisão, roadmap, decision record |
| `pwa` | PWA | manifest, service worker, offline, instalável, cache api |
| `data` | Dados & Domínio | dados, dicionário, catálogo, regras de negócio, anvisa, vagas |
| `general` | Geral | *(no keywords)* — fallback bucket |

## Rule pass (deterministic)

`rulePass(text, categories)` (`classifier.service.ts`, exported and unit-tested):

- Text is lowercased and accent-normalized so "segurança"/"autenticacao"
  match their keyword forms.
- For each category, every keyword that appears in the text contributes
  `min(1, keywordLength / 12)` and the category score is capped at
  `MAX_KEYWORD_WEIGHT = 1` (longer, more specific keywords weigh more; a
  single category cannot exceed 1 regardless of how many keywords hit).
- Categories with no keyword hits score `0`.

Rule pass always runs first because it is cheap and deterministic. When its
best category reaches confidence it wins immediately and the semantic pass is
**not** executed:

```
ruleConfidence(bestRule) >= RULE_CONFIDENCE_THRESHOLD (0.75)
        → category = bestRule, method = "rules"
```

## Semantic pass

When the rules are inconclusive (best rule < 0.75), `classify` runs
`semanticPass(text, categories)`: it embeds the document text with the
`passage: ` prefix, loads every `categories.prototype` vector through raw SQL
(`queryRows` + `vector.sql.ts`) and scores each category with `cosineSimilarity`
(dot product — vectors are L2-normalized, so it equals cosine).

- Prototype dims are checked against the query embedding (a mismatch logs a
  warning and skips that category).
- `SEMANTIC_CONFIDENCE_THRESHOLD = 0.5` — the strongest *semantic* score must
  clear it for the pass to win.

## Combination / multi-label

Scores are combined with `mergeScores`: per category `max(ruleScore,
semanticScore)`. Final decision order (`classify`):

1. **Rules win** when the best rule score is >= `RULE_CONFIDENCE_THRESHOLD`
   (0.75) — method `rules`, no embedding work.
2. **Semantic win** when the best semantic score >= `SEMANTIC_CONFIDENCE_THRESHOLD`
   (0.5). The **primary `category` is the top of the combined max-scores**
   (semantics can promote a category the rules half-detected); labels come from
   `multiLabel(combined, best)` — method `semantic`.
3. **Weak rules win** when no semantic score clears 0.5 but a rule score is
   `> 0` — method `rules` with the raw rule scores.
4. Otherwise **fallback** to `general` (method `fallback`).

`multiLabel(scores, primary)` (constants `MULTI_LABEL_THRESHOLD = 0.55`,
`MAX_LABELS = 3`):

- Every category with `score >= 0.55` (excluding `general`), sorted
  descending, capped at 3, with the primary label forced to the front.

The returned shape is always `{ category, categories[], confidence, method }`
where `method ∈ "rules" | "semantic" | "fallback"`. `classify(text)` is also
exposed by the CLI (`hub classify "<text>"`).

## Path specialization (§8.2.5)

`src/modules/classification/path-specialization.ts` applies deterministic
per-file overrides **after** the hybrid classifier, at ingestion and
reclassification time. The file path wins over the classifier primary label:

| Path | Primary | Notes |
|---|---|---|
| `prompts/*.md` | `prompt` | `metadata.promptId` = filename stem |
| `CLAUDE.md` / `AGENTS.md` | `workflow` | agent/process guides |
| `*mcp*.md`, `docs/mcp/**`, `MCP.md` | `mcp` | MCP docs |
| `*design-system*`, `docs/design-system*` | `design-system` | keeps semantic multi-label |
| `README.md` | `general` / `api` | `api` when the first 600 chars mention HTTP surface |

The classifier keeps full authority for every other file. Prompt/MCP/workflow
files are single-label; design-system/README keep semantic labels merged.

## Fallback

Only when **no rule score is > 0** and **no semantic score clears 0.5** does
the result become `FALLBACK_CATEGORY = 'general'` with `method = "fallback"`
(confidence 0). Anything with even weak rule evidence stops before this.

## Prototype seeding

`prototype-seeder.service.ts` (`src/modules/classification/prototype-seeder.service.ts`)
computes and persists `categories.prototype`:

- Anchor text = `metadata.anchor` when present, otherwise
  `"${name}. ${description}"`; embedded with the `passage:` prefix.
- Idempotent: skips when prototypes already exist unless `--force` is passed.
- Errors when no categories exist ("run `prisma:seed` first").

```bash
npm run hub -- seed-categories        # compute + persist prototypes
npm run hub -- seed-categories --force # recompute and overwrite
# standalone: npm run seed-categories (dist/scripts/seed-categories.js)
```

## Where classification runs

- **Ingestion** — `IngestionOrchestrator.ingestFile` classifies
  `title + chunks content`, sliced to the first 3000 chars, then applies the
  path rules above. Dry-runs skip classification and stamp `general`.
- **`seed-categories`** does not classify documents — it only seeds the
  prototypes the semantic pass depends on. To (re)classify the corpus after a
  taxonomy change without re-embedding:
  `hub classify --project <slug>` (all projects when omitted).

## Accuracy notes and tuning backlog

- Accent normalization and the `len/12` keyword weight keep Portuguese rule
  precision high for strong signals (`prisma`, `pgvector`, `mcp`,
  `neo-brutalism`), verified by the unit suite
  (`classifier.service.spec.ts`): rules win above 0.75, semantics rescue
  inconclusive texts, zero-signal text lands in `general`.
- The classifier **input is only the first 3000 chars**; docs whose category
  signal sits deep in the body can drift toward `general` — extend the window
  or classify per chunk and aggregate if it shows up in accuracy reviews.
- `documentText` does not include the file path (only the title); the README
  vs AGENTS.md vs prompt-library distinction is handled by the **path
  specialization rules**, not the classifier body.
- Backlog candidates: per-chunk majority voting, keyword synonym groups,
  prototype warm-up at boot to avoid first-request latency, and a labeled
  golden-set evaluation to tune `0.75/0.5/0.55`.
