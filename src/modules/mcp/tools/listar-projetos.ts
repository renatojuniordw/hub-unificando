import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({});

/** registry de projetos com contagens de docs/chunks (R). */
export function listarProjetos(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'listar_projetos',
    description:
      'Lista o registry de projetos do ecossistema Unificando (slug, nome, descrição, repo, stack, tags, contagem de documentos).',
    inputSchema: schema,
    handler: async () => {
      const result = await deps.projects.list(undefined, 1, 100);
      return { total: result.meta.total, projects: result.data };
    },
  };
}
