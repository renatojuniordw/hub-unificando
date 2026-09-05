import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  project: z.string().describe('slug do projeto'),
});

/** resumo contextual de um projeto (visão geral, categorias dominantes, decisões) (R). */
export function resumoProjeto(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'resumo_projeto',
    description:
      'Resumo contextual de um projeto: visão geral, contagens, categorias dominantes, decisões recentes.',
    inputSchema: schema,
    handler: async ({ project }) => {
      const summary = await deps.summary.summarize(project);
      const decisions = await deps.decisions.list(project, undefined, undefined, 1, 5);
      return {
        project: summary.project,
        counts: summary.counts,
        categories: summary.categories,
        recentDocuments: summary.recentDocuments,
        recentDecisions: decisions.data.map((decision) => ({
          title: decision.title,
          status: decision.status,
          date: decision.date,
        })),
      };
    },
  };
}
