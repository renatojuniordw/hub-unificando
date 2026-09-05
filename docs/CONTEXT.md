# LLM Context Packages

`ContextAssemblerService` (`src/modules/context/context-assembler.service.ts`)
assembles an optimized, **token-budgeted** context package for a project so an
LLM/agent can answer about it without dumping entire repositories. It is
exposed three ways: REST, CLI and the MCP `exportar_contexto_llm` tool.

## Token budget estimation

Token math lives in `src/modules/context/token.ts` and uses the shared
heuristic `TOKEN_CHARS_DIVISOR = 4` (`src/shared/constants.ts`):

- `estimateTokens(text) = ceil(text.length / 4)` — a rough estimate (4 chars
  per token is typical for code/markdown mix); the limitation is documented in
  code and this doc.
- `fitTextToTokens(text, maxTokens)` trims to `maxTokens * 4` chars and, when
  truncation happens, appends the marker `[... truncado por orçamento de
  tokens ...]` so the consumer knows the section is partial.

## REST

`GET /api/v1/context/export` (`context.controller.ts`, DTO in
`context.dto.ts`):

| Param | Type | Notes |
|---|---|---|
| `projectSlug` | string | **required** — project slug |
| `topic` | string | optional, max 500 chars; activates topic search ranking |
| `categories` | string[] | optional category slugs (repeat `categories[]=`); filters documents when no topic |
| `maxTokens` | int | 500–20000, default **6000** |

The effective budget is `Math.max(500, maxTokens)`; sections never exceed
their slice, so a package is always ≤ the requested budget plus section
overhead.

```bash
curl "http://localhost:11020/api/v1/context/export?projectSlug=med-unificando&topic=mcp&maxTokens=4000"
```

```json
{ "success": true, "data": {
    "meta": { "projectSlug": "med-unificando", "topic": "mcp", "generatedAt": "...",
              "tokenBudget": 4000, "totalTokens": 3667 },
    "sections": [
      { "id": "registry",    "title": "Visão Geral do Projeto",     "content": "...", "tokens": 310 },
      { "id": "documents",   "title": "Documentação Relevante",     "content": "...", "tokens": 2900 },
      { "id": "decisions",   "title": "Decisões (ADRs)",            "content": "...", "tokens": 150 },
      { "id": "search",      "title": "Resultados de Busca do Tópico", "content": "...", "tokens": 307 }
    ]
} }
```

## Section catalog and budget ratios

Sections are assembled in a fixed order with fixed ratios of the budget
(`context-assembler.service.ts`):

| `id` | title (pt) | Ratio | Content |
|---|---|---|---|
| `registry` | Visão Geral do Projeto | 10% | `# name (slug)`, description, repo, tags, stack `name@version (role)` line, last ingestion |
| `documents` | Documentação Relevante | **60%** with topic, **75%** without | up to 12 documents: `## title (path)` + `summary` (+ `contentKind`) |
| `decisions` | Decisões (ADRs) | 15% | `## title [status] (date)` + `summary`, up to 8 |
| `search` | Resultados de Busca do Tópico | 15% | only when `topic` is set — top 5 hybrid hits with `<source>` locations |

Notes on behavior:

- With a `topic`, the document list is re-ranked by `SearchService` (hybrid,
  `strategy=balanced`, limit 20) using `score → 1 - 1/(1+score)` as the
  re-rank key; `documents` receives the larger slice and `search` is added.
- Without a `topic`, `categories` filter the document list
  (`doc.categories.some(c => categories.includes(c))`); `search` is empty.
- Document content is `summary` only (first 400 chars of chunk 0) — full text
  lives behind chunk anchors returned by search. Decisions use `summary`, not
  full ADR content.
- Each section is independently `fitTextToTokens`-trimmed to its slice, and
  `buildDocuments` stops early when fewer than 64 tokens remain, so the
  package cannot overspend.

## CLI

`hub context` (in `src/cli.ts`):

```bash
npm run hub -- context --project med-unificando                 # default 6000 tokens, stdout
npm run hub -- context --project med-unificando --topic mcp --maxTokens 4000
npm run hub -- context --project ui-unificando --save           # writes context-<project>.md
```

- Prints `"Orçamento total: X tokens"`, a per-section breakdown and the meta
  line; with `--save` the rendered markdown is written to
  `context-<slug>.md` (the pattern is gitignored via `.dockerignore`).

## MCP tool: `exportar_contexto_llm`

Tool definition: `src/modules/mcp/tools/exportar-contexto-llm.ts` (read-only,
no extra auth beyond the MCP transport).

| Input | Type | Notes |
|---|---|---|
| `project` | string | required slug |
| `topic` | string | optional focus topic |
| `maxTokens` | int | 500–20000, default 6000 |
| `sections` | enum[] | optional whitelist: `registry`, `documents`, `decisions`, `search` |

```json
{ "name": "exportar_contexto_llm",
  "arguments": { "project": "radar-unificando", "topic": "chrome extension", "maxTokens": 5000 } }
```

The tool filters the assembled package to the requested `sections` when a
whitelist is supplied and returns the same `meta`/`sections` shape.

## Consumers

- Agents that need "the right 3000 tokens about this project" call
  `context/export` (REST/MCP) instead of gluing many search calls together.
- Compare (`GET /api/v1/compare`, CLI `hub compare`) and factual summaries
  (`GET /api/v1/summary`, CLI `hub summary`) live in the same
  `src/modules/context/` module but are not token packages; they are covered in
  `docs/API.md`.
