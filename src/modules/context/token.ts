import { TOKEN_CHARS_DIVISOR } from '../../shared/constants';

/** Rough token estimate (4 chars/token) — documented limitation. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_CHARS_DIVISOR);
}

/** Trims text to fit a token budget, preserving a closing marker. */
export function fitTextToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * TOKEN_CHARS_DIVISOR;
  if (text.length <= maxChars) return text;
  const keep = Math.max(0, maxChars - 32);
  return `${text.slice(0, keep)}\n[... truncado por orçamento de tokens ...]`;
}
