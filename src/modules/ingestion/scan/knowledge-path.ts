/** Knowledge root file names (project root only). */
export const KNOWLEDGE_ROOT_NAMES = new Set(['README.md', 'CLAUDE.md', 'AGENTS.md']);

/** Documentation folders at any depth below the project root. */
const KNOWLEDGE_DIRS = new Set(['docs', 'documentation']);

const KNOWLEDGE_EXTENSION = /\.(md|mdx|txt)$/i;

/**
 * Curated "knowledge" scope (docs/CHANGES-knowledge-scope.md): only real
 * documentation is indexed — README/CLAUDE/AGENTS at the project root, files
 * under a `docs`/`documentation` folder at any depth, and `prompts/` at the
 * root — always with a `.md`/`.mdx`/`.txt` extension.
 */
export function isKnowledgePath(relativePath: string): boolean {
  const segments = relativePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');
  if (segments.length === 0) return false;
  const leaf = segments[segments.length - 1];
  if (!KNOWLEDGE_EXTENSION.test(leaf)) return false;
  if (segments.length === 1) return KNOWLEDGE_ROOT_NAMES.has(leaf);
  if (segments.some((segment) => KNOWLEDGE_DIRS.has(segment))) return true;
  return segments[0] === 'prompts';
}
