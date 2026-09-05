import { basename } from 'node:path';

/**
 * Deterministic per-path classification overrides (spec §8.2.5). These rules
 * run after the hybrid classifier and win over its primary label, so that
 * well-known files (README, CLAUDE/AGENTS, MCP docs, design-system docs,
 * prompt-library entries) always land in the category the ecosystem expects.
 */

export interface PathSpecialization {
  /** Primary category that overrides the classifier output. */
  category: string;
  /** Categories to persist. Empty = keep the classifier multi-label. */
  categories?: string[];
  /** Extra document metadata (e.g. promptId). */
  metadata?: Record<string, unknown>;
  /** When true the classifier labels are merged into `categories`. */
  mergeSemantic?: boolean;
}

const hasSegment = (normPath: string, segment: string): boolean => {
  const wrapped = `/${normPath}/`;
  return wrapped.includes(`/${segment}/`) || normPath.startsWith(`${segment}/`);
};

/**
 * Applies content-agnostic file-location rules. `snippet` is only used by the
 * README heuristic (api vs general). Returns null when no rule applies.
 */
export function applyPathSpecialization(
  relativePath: string,
  snippet = '',
): PathSpecialization | null {
  const norm = relativePath.replace(/\\/g, '/').toLowerCase();
  const name = basename(norm);

  // Prompt library entries: prompts/*.md → category `prompt` + promptId.
  if (norm.endsWith('.md') && hasSegment(norm, 'prompts')) {
    return {
      category: 'prompt',
      categories: ['prompt'],
      metadata: { promptId: basename(relativePath).replace(/\.[^.]+$/, '') },
    };
  }

  // Agent/workflow guides: CLAUDE.md / AGENTS.md → workflow.
  if (name === 'claude.md' || name === 'agents.md') {
    return { category: 'workflow', categories: ['workflow'] };
  }

  // MCP documentation (docs/MCP.md, any *mcp*.md or mcp/ folder) → mcp.
  if (
    norm.endsWith('mcp.md') ||
    norm.includes('mcp.md') ||
    hasSegment(norm, 'mcp') ||
    hasSegment(norm, 'docs/mcp')
  ) {
    return { category: 'mcp', categories: ['mcp'] };
  }

  // Design-system documentation → design-system (multi-label kept).
  if (
    name.startsWith('design-system') ||
    name.startsWith('design_system') ||
    norm.includes('/design-system') ||
    norm.includes('/design_system') ||
    norm.includes('docs/design-system')
  ) {
    return { category: 'design-system', mergeSemantic: true };
  }

  // README heuristic: project overviews are `api` when they describe HTTP
  // surface, otherwise `general` (spec §8.2.5).
  if (name === 'readme.md' || name === 'readme') {
    const apiHint = /\b(api|rest|endpoint|endpoints|http|swagger|openapi)\b/i.test(
      snippet.slice(0, 600),
    );
    return { category: apiHint ? 'api' : 'general' };
  }

  return null;
}
