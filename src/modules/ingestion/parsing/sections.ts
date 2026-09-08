/** Parsing utilities: split raw text into heading-aware sections. */

export interface ParsedSection {
  /** Heading lineage from deepest heading up? No — from document root down. */
  headingLineage: string[];
  content: string;
}

/**
 * Parses markdown into sections, each carrying its heading lineage
 * (ex: ["Architecture", "Modules"]). Code fences and lists are preserved
 * verbatim. Headings reset the lineage per level.
 */
export function parseMarkdownSections(markdown: string): ParsedSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let headingLineage: string[] = [];
  let buffer: string[] = [];
  let fenceChar: string | null = null;

  const flush = (): void => {
    const hasContent = buffer.some((line) => line.trim().length > 0);
    if (buffer.length > 0 && (hasContent || headingLineage.length > 0)) {
      sections.push({
        headingLineage: [...headingLineage],
        content: buffer.join('\n').trim(),
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    // Code fences: a `#` line inside a fence is content, not a heading. The
    // closing fence must use the same marker char as the opening one.
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      if (fenceChar === null) {
        fenceChar = char;
      } else if (char === fenceChar) {
        fenceChar = null;
      }
      buffer.push(line);
      continue;
    }
    if (fenceChar === null) {
      const match = /^(#{1,6})\s+(.*)$/.exec(line);
      if (match) {
        flush();
        const level = match[1].length;
        // Keep the ancestor headings (levels < level) and append this one,
        // so the lineage is always contiguous: ["Arquitetura", "Módulos"].
        headingLineage = headingLineage.slice(0, level - 1);
        headingLineage.push(match[2].trim());
        continue;
      }
    }
    buffer.push(line);
  }
  flush();
  return sections;
}

/** Plain-text files become a single unheaded section. */
export function parsePlainText(text: string): ParsedSection[] {
  return [{ headingLineage: [], content: text.trim() }];
}

/** Coarse language detection: Portuguese vs English vs unknown. */
export function detectLanguage(text: string): 'pt-BR' | 'en' | 'unknown' {
  const sample = text.slice(0, 2000).toLowerCase();
  const ptMarkers = ['ção', 'ões', 'não', 'você', 'que', 'para', 'uma', 'como', 'com', 'mais'];
  const enMarkers = ['the', 'and', 'you', 'with', 'for', 'this', 'that', 'would'];
  let pt = 0;
  let en = 0;
  for (const marker of ptMarkers) {
    if (sample.includes(marker)) pt += 1;
  }
  for (const marker of enMarkers) {
    if (sample.includes(marker)) en += 1;
  }
  if (pt > en && pt >= 2) return 'pt-BR';
  if (en > pt && en >= 2) return 'en';
  return 'unknown';
}
