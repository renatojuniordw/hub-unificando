/** Classification thresholds — see docs/CLASSIFICATION.md. */

/** Above this rule score the deterministic pass wins alone. */
export const RULE_CONFIDENCE_THRESHOLD = 0.75;

/** Minimum cosine similarity to a category prototype to trust semantics. */
export const SEMANTIC_CONFIDENCE_THRESHOLD = 0.5;

/** Minimum score for a category to be included in the multi-label set. */
export const MULTI_LABEL_THRESHOLD = 0.55;

/** Maximum number of labels returned per document. */
export const MAX_LABELS = 3;

/** Fallback bucket when nothing reaches confidence. */
export const FALLBACK_CATEGORY = 'general';

/** Keyword-match weight cap (longer keywords are more specific). */
export const MAX_KEYWORD_WEIGHT = 1;
