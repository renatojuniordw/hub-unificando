import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  project: z.string().optional().describe('slug do projeto (filtro)'),
  category: z.string().optional().describe('slug da categoria (filtro)'),
  docType: z.string().optional().describe('tipo (markdown, txt, ...)'),
  q: z.string().optional().describe('termo livre no título/resumo'),
  page: z.number().int().min(1).max(1000).optional().describe('página (default 1)'),
  pageSize: z.number().int().min(1).max(100).optional().describe('tamanho (default 20)'),
});

/** documentos com filtros (R). */
export function listarDocumentos(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'listar_documentos',
    description:
      'Lista documentos indexados com filtros opcionais de projeto, categoria, tipo e termo.',
    inputSchema: schema,
    handler: async ({ project, category, docType, q, page, pageSize }) => {
      const result = await deps.documents.list({
        projectSlug: project,
        category,
        docType,
        q,
        page: page ?? 1,
        pageSize: pageSize ?? 20,
      });
      return {
        ...result,
        nextPage: result.meta.hasNext,
      };
    },
  };
}
