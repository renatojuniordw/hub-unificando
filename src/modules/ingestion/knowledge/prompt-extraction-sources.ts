/**
 * Per-project mapping of folders that hold prompts embedded in TypeScript
 * source (template-literal constants). `hub sync-docs` extracts each prompt's
 * text into `knowledge/<slug>/prompts/<name>.md` (see prompt-extractor.service
 * and ADR 0010). Projects whose prompts are already plain `.md` files under a
 * root `prompts/` folder (prompts, refina) do not
 * need this mapping — the scanner mirrors them directly.
 */
export const PROMPT_EXTRACTION_SOURCES: Record<string, string[]> = {
  'radar-unificando': ['src/lib/core/ai/prompts'],
};
