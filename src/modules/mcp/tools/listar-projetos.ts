import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  page: z.number().int().min(1).optional().describe('página (default 1)'),
  pageSize: z.number().int().min(1).max(100).optional().describe('tamanho (default 20)'),
});

/** registry de projetos com contagens de docs/chunks (R). */
export function listarProjetos(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'listar_projetos',
    description:
      'Lista o registry de projetos do ecossistema Unificando (slug, nome, descrição, repo, stack, tags, contagem de documentos).',
    inputSchema: schema,
    handler: async ({ page, pageSize }) => {
      const result = await deps.projects.list(
        undefined,
        undefined,
        undefined,
        page ?? 1,
        pageSize ?? 20,
      );
      return {
        total: result.meta.total,
        nextPage: result.meta.hasNext,
        projects: result.data,
      };
    },
  };
}
