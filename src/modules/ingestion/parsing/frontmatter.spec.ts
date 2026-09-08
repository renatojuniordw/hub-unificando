import { parseFrontmatter, isBlogPostFrontmatter } from './frontmatter';

describe('parseFrontmatter', () => {
  it('parses a real blog post frontmatter with list tags', () => {
    const content = [
      '---',
      'title: "Como uso MCP + IA para buscar vagas certas no Gupy (não só vagas)"',
      'description: "Por que abandonei scraping frágil."',
      'date: "2026-08-04"',
      'tags:',
      '  - IA',
      '  - MCP',
      '  - Next.js',
      'readingTime: "7 min"',
      '---',
      '# Corpo',
    ].join('\n');
    const result = parseFrontmatter(content);
    expect(result.hasFrontmatter).toBe(true);
    expect(result.title).toContain('Gupy');
    expect(result.title).toContain('(não só vagas)');
    expect(result.date).toBe('2026-08-04');
    expect(result.tags).toEqual(['IA', 'MCP', 'Next.js']);
    expect(result.readingTime).toBe('7 min');
    expect(result.draft).toBeUndefined();
  });

  it('parses inline array tags', () => {
    const result = parseFrontmatter('---\ntags: [IA, Segurança, "Blog, ética"]\ndate: 2026-07-16\n---\nx');
    expect(result.tags).toEqual(['IA', 'Segurança', 'Blog, ética']);
  });

  it('parses draft as boolean', () => {
    const draft = parseFrontmatter('---\ndraft: true\n---\nx');
    expect(draft.draft).toBe(true);
    const notDraft = parseFrontmatter('---\ndraft: false\n---\nx');
    expect(notDraft.draft).toBe(false);
  });

  it('returns hasFrontmatter false for content without a block', () => {
    expect(parseFrontmatter('# apenas corpo').hasFrontmatter).toBe(false);
    expect(parseFrontmatter('').hasFrontmatter).toBe(false);
  });

  it('handles malformed blocks safely without throwing', () => {
    // No closing delimiter -> no frontmatter block.
    expect(parseFrontmatter('---\nque:brado').hasFrontmatter).toBe(false);
    expect(parseFrontmatter('---').hasFrontmatter).toBe(false);
    // Unterminated inline array is tolerated.
    expect(() => parseFrontmatter('---\ntitle: [quebrado\n---\nx')).not.toThrow();
  });

  it('keeps apostrophes/quotes inside quoted scalars intact', () => {
    const result = parseFrontmatter(
      '---\ndescription: "Ignore \'instruções maliciosas\' em prompts externos."\n---\nx',
    );
    expect(result.description).toBe("Ignore 'instruções maliciosas' em prompts externos.");
  });
});

describe('isBlogPostFrontmatter', () => {
  it('true only when both title and date exist', () => {
    expect(isBlogPostFrontmatter(parseFrontmatter('---\ntitle: X\ndate: 2026-01-01\n---\nx'))).toBe(true);
    expect(isBlogPostFrontmatter(parseFrontmatter('---\ntitle: X\n---\nx'))).toBe(false);
    expect(isBlogPostFrontmatter(parseFrontmatter('---\ndate: 2026-01-01\n---\nx'))).toBe(false);
    expect(isBlogPostFrontmatter(parseFrontmatter('# sem frontmatter'))).toBe(false);
  });
});
