/**
 * Lightweight YAML-frontmatter parser for markdown content (blog posts, etc.).
 * Supports the flat frontmatter shape used across the ecosystem:
 * `title`, `description`, `date`, `tags[]`, `readingTime`, `draft` — scalar
 * strings, YYYY-MM-DD dates, arrays of strings, booleans. Quoted and unquoted
 * scalars are handled. Only fields we consume are extracted; unknown fields
 * are ignored.
 */

export interface Frontmatter {
  title?: string;
  description?: string;
  /** ISO date (frontmatter `date`), kept as the raw string. */
  date?: string;
  tags?: string[];
  readingTime?: string;
  draft?: boolean;
  /** Whether the document started with a frontmatter block at all. */
  hasFrontmatter: boolean;
}

/** Extracts the YAML block delimited by leading `---` lines, if present. */
function extractFrontmatterBlock(content: string): string | null {
  if (!content.startsWith('---')) return null;
  const newline = content.indexOf('\n');
  if (newline === -1) return null;
  const rest = content.slice(newline + 1);
  // The closing delimiter must sit on its own line (`\n---`) optionally
  // followed by end-of-string or a newline — otherwise there is no block.
  const end = rest.search(/\n---(?:\r?\n|$)/);
  if (end === -1) return null;
  return rest.slice(0, end);
}

/**
 * Parses a YAML scalar (handles quotes, booleans, numbers) and returns the
 * canonical string form.
 */
function parseScalar(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

/**
 * Splits an inline YAML array (`a, b, "c, d"`) on commas, keeping quoted
 * segments intact and stripping the surrounding quotes.
 */
function splitArrayRespectingQuotes(input: string): string[] {
  const items: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ',') {
      const item = current.trim();
      if (item.length > 0) items.push(item);
      current = '';
    } else {
      current += char;
    }
  }
  const last = current.trim();
  if (last.length > 0) items.push(last);
  return items;
}

function parseBoolean(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  return value === 'true' || value === 'yes' || value === '1';
}

/**
 * Parses frontmatter from markdown content. Never throws: on a malformed or
 * absent block it returns `{ hasFrontmatter: false }`-style safe defaults.
 */
export function parseFrontmatter(content: string): Frontmatter {
  const block = extractFrontmatterBlock(content);
  if (block === null) return { hasFrontmatter: false };

  const result: Frontmatter = { hasFrontmatter: true };
  const lines = block.split(/\r?\n/);

  let currentListKey: keyof Frontmatter | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // List item belonging to the previous array key (e.g. tags).
    if (/^-\s+/.test(trimmed) && currentListKey) {
      const item = parseScalar(trimmed.replace(/^-\s+/, ''));
      if (currentListKey === 'tags') {
        (result.tags ??= []).push(item);
      }
      continue;
    }

    currentListKey = null;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const rawValue = trimmed.slice(colon + 1).trim();

    switch (key) {
      case 'title':
        result.title = parseScalar(rawValue);
        break;
      case 'description':
        result.description = parseScalar(rawValue);
        break;
      case 'date':
        result.date = parseScalar(rawValue);
        break;
      case 'readingTime':
        result.readingTime = parseScalar(rawValue);
        break;
      case 'draft':
        result.draft = parseBoolean(rawValue);
        break;
      case 'tags':
        // Inline array form: `tags: [a, b]` — otherwise lines follow as list.
        if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
          result.tags = splitArrayRespectingQuotes(rawValue.slice(1, -1));
        } else if (rawValue.length === 0) {
          currentListKey = 'tags';
        }
        break;
      default:
        break;
    }
  }
  return result;
}

/** A post is a real blog post when frontmatter carries both title and date. */
export function isBlogPostFrontmatter(frontmatter: Frontmatter): boolean {
  return (
    frontmatter.hasFrontmatter &&
    typeof frontmatter.title === 'string' &&
    frontmatter.title.length > 0 &&
    typeof frontmatter.date === 'string' &&
    frontmatter.date.length > 0
  );
}
