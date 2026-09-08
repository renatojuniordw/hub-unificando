import { isKnowledgePath, KNOWLEDGE_ROOT_NAMES } from './knowledge-path';

describe('isKnowledgePath (curated knowledge scope)', () => {
  it('includes README/CLAUDE/AGENTS at the project root', () => {
    for (const name of KNOWLEDGE_ROOT_NAMES) {
      expect(isKnowledgePath(name)).toBe(true);
    }
    expect(isKnowledgePath('README.md')).toBe(true);
  });

  it('rejects loose markdown at the project root', () => {
    expect(isKnowledgePath('notes.md')).toBe(false);
    expect(isKnowledgePath('relatorio-final.md')).toBe(false);
    expect(isKnowledgePath('llms.txt')).toBe(false);
  });

  it('includes docs/ at any depth', () => {
    expect(isKnowledgePath('docs/a.md')).toBe(true);
    expect(isKnowledgePath('docs/sub/x.md')).toBe(true);
    expect(isKnowledgePath('x/docs/y.md')).toBe(true);
    expect(isKnowledgePath('a/b/c/documentation/guide.mdx')).toBe(true);
  });

  it('includes prompts/ at the project root', () => {
    expect(isKnowledgePath('prompts/base.md')).toBe(true);
    expect(isKnowledgePath('prompts/nested/prompt.md')).toBe(true);
  });

  it('rejects prompts folders deeper than the root', () => {
    expect(isKnowledgePath('src/prompts/notes.md')).toBe(false);
  });

  it('rejects code-like files with markdown-ish names', () => {
    expect(isKnowledgePath('src/docs.ts')).toBe(false);
    expect(isKnowledgePath('docs.ts')).toBe(false);
    expect(isKnowledgePath('components/docs.tsx')).toBe(false);
  });

  it('rejects non markdown/txt extensions', () => {
    expect(isKnowledgePath('docs/webp.bin')).toBe(false);
    expect(isKnowledgePath('docs/architecture.pdf')).toBe(false);
    expect(isKnowledgePath('docs/image.png')).toBe(false);
  });

  it('keeps public/docs reachable while public/llms.txt is not', () => {
    expect(isKnowledgePath('public/docs/index.md')).toBe(true);
    expect(isKnowledgePath('public/llms.txt')).toBe(false);
  });

  it('includes blog posts under src/content/blog (single content/ exception)', () => {
    expect(isKnowledgePath('src/content/blog/mcp-gupy.md')).toBe(true);
    expect(isKnowledgePath('src/content/blog/aws/outro.md')).toBe(false); // nested beyond blog
    expect(isKnowledgePath('src/content/outra-coisa.md')).toBe(false);
    expect(isKnowledgePath('src/lib/foo.md')).toBe(false);
    expect(isKnowledgePath('src/content/blog/draft.md')).toBe(true); // drafts still scanned; orchestrator decides
  });

  it('normalizes Windows separators', () => {
    expect(isKnowledgePath('docs\\a.md')).toBe(true);
    expect(isKnowledgePath('docs\\sub\\x.txt')).toBe(true);
    expect(isKnowledgePath('src\\content\\blog\\post.md')).toBe(true);
  });

  it('rejects empty and weird paths', () => {
    expect(isKnowledgePath('')).toBe(false);
    expect(isKnowledgePath('.')).toBe(false);
    expect(isKnowledgePath('./README.md')).toBe(true);
  });
});
