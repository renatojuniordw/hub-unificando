import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  project: z.string().optional().describe('slug do projeto (filtro)'),
  q: z.string().optional().describe('termo livre no título/resumo'),
  status: z.enum(['accepted', 'superseded', 'proposed']).optional().describe('status da decisão'),
  page: z.number().int().min(1).optional().describe('página (default 1)'),
  pageSize: z.number().int().min(1).max(50).optional().describe('tamanho (default 10)'),
});

/** busca de ADRs (R). */
export function consultarDecisao(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'consultar_decisao',
    description:
      'Busca decisões de arquitetura (ADRs) do ecossistema, com filtros de projeto, termo e status.',
    inputSchema: schema,
    handler: async ({ project, q, status, page, pageSize }) => {
      const result = await deps.decisions.list(project, status, q, page ?? 1, pageSize ?? 10);
      return {
        total: result.meta.total,
        decisions: result.data.map((decision) => ({
          id: decision.id,
          projectSlug: decision.projectSlug,
          title: decision.title,
          date: decision.date,
          status: decision.status,
          summary: decision.summary,
          sourcePath: decision.sourcePath,
        })),
      };
    },
  };
}
