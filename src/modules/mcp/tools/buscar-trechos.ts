import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  query: z.string().min(1).max(500).describe('consulta em linguagem natural'),
  project: z.string().optional().describe('slug do projeto (filtro)'),
  category: z.string().optional().describe('slug da categoria (filtro)'),
  topK: z.number().int().min(1).max(50).optional().describe('número de trechos (default 10)'),
  minScore: z.number().min(0).max(1).optional().describe('corte de score (opcional)'),
});

/** busca híbrida de trechos citáveis (R). */
export function buscarTrechos(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'buscar_trechos',
    description:
      'Busca híbrida (vetorial + keyword + fuzzy com RRF) por trechos citáveis no conhecimento indexado.',
    inputSchema: schema,
    handler: async ({ query, project, category, topK, minScore }) => {
      const result = await deps.search.search({
        q: query,
        projectSlug: project,
        category,
        limit: topK ?? 10,
        strategy: 'balanced',
      });
      const hits =
        minScore !== undefined ? result.hits.filter((hit) => hit.score >= minScore) : result.hits;
      return {
        query,
        total: hits.length,
        hits: hits.map((hit) => ({
          projectSlug: hit.projectSlug,
          documentId: hit.documentId,
          path: hit.path,
          title: hit.title,
          heading: hit.heading,
          content: hit.content,
          anchor: hit.anchor,
          score: hit.score,
        })),
      };
    },
  };
}
