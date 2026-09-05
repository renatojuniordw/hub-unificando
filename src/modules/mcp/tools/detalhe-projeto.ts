import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  project: z.string().describe('slug do projeto (ex: med-unificando)'),
});

/** projeto + documentos + decisões (R). */
export function detalheProjeto(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'detalhe_projeto',
    description:
      'Detalhe completo de um projeto: dados do registry, documentos indexados e decisões (ADRs).',
    inputSchema: schema,
    handler: async ({ project }) => {
      const detail = await deps.projects.detail(project);
      return {
        project: {
          slug: detail.slug,
          name: detail.name,
          description: detail.description,
          repoUrl: detail.repoUrl,
          tags: detail.tags,
          stack: detail.stack,
          lastIngestedAt: detail.lastIngestedAt,
          counts: detail.counts,
        },
        documents: detail.documents.map((doc) => ({
          path: doc.path,
          title: doc.title,
          category: doc.category,
          categories: doc.categories,
          updatedAt: doc.updatedAt,
        })),
      };
    },
  };
}
