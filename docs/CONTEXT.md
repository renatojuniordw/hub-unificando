# LLM Context Packages

`ContextAssemblerService` (`src/modules/context/context-assembler.service.ts`)
assembles an optimized, **token-budgeted** context package for a project so an
LLM/agent can answer about it without dumping entire repositories. The
catalog follows spec §12: every claim carries an inline source and a `fontes`
section lists all included chunks, so nothing unsourced survives. It is
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
- `trimToBudget` reduces whole sections (least important first) until the
  package fits `Math.max(500, maxTokens)`.

## REST

`GET /api/v1/context/export` (`context.controller.ts`, DTO in
`context.dto.ts`):

| Param | Type | Notes |
|---|---|---|
| `project` | string | **required** — project slug |
| `topic` | string | optional, max 500 chars; appended to each section query |
| `categories` | string[] | optional category slugs (repeat `categories[]=`) |
| `maxTokens` | int | 500–20000, default **6000** |
| `sections` | string | optional CSV of section ids (e.g. `arquitetura,fontes`) |

```bash
curl "http://localhost:11020/api/v1/context/export?project=med-unificando&topic=mcp&maxTokens=4000"
```

```json
{ "success": true, "data": {
    "meta": { "projectSlug": "med-unificando", "topic": "mcp", "generatedAt": "...",
              "tokenBudget": 4000, "totalTokens": 3667 },
    "sections": [
      { "id": "visao_geral", "title": "Visão Geral", "content": "...", "tokens": 310 },
      { "id": "arquitetura", "title": "Arquitetura", "content": "...", "tokens": 900 },
      { "id": "design_system", "title": "Design System", "content": "...", "tokens": 700 },
      { "id": "componentes_reutilizaveis", "title": "Componentes reutilizáveis", "content": "...", "tokens": 500 },
      { "id": "exemplos", "title": "Exemplos", "content": "...", "tokens": 400 },
      { "id": "decisoes_previas", "title": "Decisões prévias", "content": "...", "tokens": 150 },
      { "id": "convencoes", "title": "Convenções", "content": "...", "tokens": 400 },
      { "id": "fontes", "title": "Fontes", "content": "- med-unificando/docs/MCP.md#mcp (≈ 55 tokens)", "tokens": 150 }
    ]
} }
```

## Section catalog (spec §12)

Sections are assembled in a fixed order (`context-assembler.service.ts`):

| `id` | title (pt) | Content / retrieval |
|---|---|---|
| `visao_geral` | Visão Geral | registry block: name, slug, description, repo, tags, stack `name@version (role)`, last ingestion |
| `arquitetura` | Arquitetura | top 6 hybrid hits filtered `category=architecture` |
| `design_system` | Design System | hits `category=design-system`; when the project has none, **falls back to `ui-unificando`** (central brand DS) with an explicit note |
| `componentes_reutilizaveis` | Componentes reutilizáveis | hits for component keywords in `design-system`, then `architecture` |
| `exemplos` | Exemplos | hits for `exemplo`/`uso` phrases |
| `decisoes_previas` | Decisões prévias | accepted ADRs (up to 5), topic-filtered when a topic is given |
| `convencoes` | Convenções | hits `category=workflow` (CLAUDE/AGENTS/gates) |
| `fontes` | Fontes | deduped `project/path#heading (≈ N tokens)` list of every included chunk |

Rules of the gold line:

- Each included chunk renders as `#### heading` + trimmed body + a
  `_Fonte: project/path#anchor_` line — **every assertion is sourced**.
- The `fontes` section is always produced (when chunks were included) and the
  CLI/REST/MCP consumers see exactly the same catalog.
- Retrieval queries are built as `"<section phrase> <topic>"` (hybrid,
  `strategy=balanced`), so a focused `topic` re-ranks every section.
- `trimToBudget` trims least-important sections first, always keeping
  `visao_geral` and `fontes` until the very end.

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
| `sections` | enum[] | optional whitelist: `visao_geral`, `arquitetura`, `design_system`, `componentes_reutilizaveis`, `exemplos`, `decisoes_previas`, `convencoes`, `fontes` |

```json
{ "name": "exportar_contexto_llm",
  "arguments": { "project": "radar-unificando", "topic": "chrome extension", "maxTokens": 5000 } }
```

The tool passes the whitelist straight to the assembler and returns the same
`meta`/`sections` shape.

## Consumers

- Agents that need "the right N tokens about this project" call
  `context/export` (REST/MCP) instead of gluing many search calls together.
- Compare (`GET /api/v1/compare`, CLI `hub compare`) and summaries
  (`GET /api/v1/summary`, CLI `hub summary`) live in the same
  `src/modules/context/` module but are not token packages; they are covered in
  `docs/API.md`.
