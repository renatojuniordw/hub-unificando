# 0010 — Extract TS-embedded prompts into the knowledge lib

Date: 2026-09-07 · Status: accepted

## Context

ADR 0009 made the Hub autonomous via a committed knowledge lib. The curated
scope, however, only mirrors `.md/.mdx/.txt` files — and radar-unificando
(the job platform) keeps its product prompts as **TypeScript constants**:
`src/lib/core/ai/prompts/*.ts` exports template literals such as
`ATS_ANALYZER_PROMPT`, `CHAT_SYSTEM_PROMPT`, … (10 prompts across 8 files,
some interpolating a shared `securityRules({...})` helper with literal
arguments, several versioned via `*_PROMPT_VERSION`). Only `docs/AI.md`
*describes* those prompts; their actual text was not searchable in the Hub.

The user wants the real prompt texts in the knowledge base. The prompts must
stay in the sibling repo as code (they are imported by the app and versioned
there), so the lib needs a generated mirror.

## Decision

1. **Per-project mapping** — `PROMPT_EXTRACTION_SOURCES`
   (`prompt-extraction-sources.ts`) maps slugs to source folders containing
   TS-embedded prompts. Today: `radar-unificando → ['src/lib/core/ai/prompts']`.
   Projects whose prompts are already markdown under a root `prompts/` folder
   (prompts-unificando, promptcraft-unificando) need no mapping.
2. **AST-based extraction, never execution** — `PromptExtractorService`
   parses each `.ts` with the TypeScript compiler API (`createSourceFile`,
   no type checker, no `require` of sibling code). For every exported
   `*_PROMPT` template literal it renders the final text, resolving the only
   supported interpolation: `securityRules({...})` with static literal
   arguments, re-rendered by a pinned local mirror of the sibling helper.
   Unknown interpolations throw `ExtractPromptError`.
3. **Generated files join the lib live set** — `hub sync-docs` writes
   `knowledge/<slug>/prompts/<name>.md` (one per prompt constant, kebab-case
   name from the const, e.g. `SKILL_EXTRACTOR_USER_PROMPT` →
   `skill-extractor-user.md`) alongside the scanned files, prunes generated
   files whose prompt disappeared, and reports them as `filesGenerated`. A
   failed extraction skips the whole project **without pruning** (a broken
   source must never shrink the lib).
4. **Deterministic markdown** — header with source file, const name, version
   (when present) and a deprecated note; no timestamps, so re-syncs produce
   clean git diffs. Runtime placeholders (`{{RESUME_TEXT}}`) stay literal.
   The `prompts/*.md` path already triggers the prompt classification
   (`category: 'prompt'` + `metadata.promptId`, spec §8.2.5).

## Alternatives considered

- **Index the `.ts` files directly**: the scanner's curated scope excludes
  code, and raw TS would pollute chunks with syntax noise.
- **Execute/import the sibling TS** to read the constants: fragile (build
  tooling, side effects, cross-repo coupling) and unnecessary — the template
  literals are static.
- **Move prompts to `.md` in the sibling repo**: cleanest long-term, but
  changes the app's import structure; the extractor decouples the Hub from
  that refactor.

## Consequences

- The Hub indexes the real prompt texts (90 docs / 537 chunks after the
  first radar re-ingest); prompt changes propagate on the next
  `hub sync-docs` + commit.
- The local `securityRules` renderer can drift from the sibling helper; the
  unit spec pins its output, and a mismatch fails CI, not the lib.
- `typescript` is imported lazily (devDependency) — the runtime image and
  CI are unaffected.
