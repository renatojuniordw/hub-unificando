import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';
import { resolveDocument } from './obter-documento';

const schema = z
  .object({
    path: z.string().optional().describe('caminho relativo do documento'),
    id: z.string().optional().describe('id do documento'),
  })
  .refine((args) => Boolean(args.path ?? args.id), {
    message: 'informe "path" ou "id"',
  });

/** resumo contextual de um documento (R). */
export function resumoDocumento(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'resumo_documento',
    description:
      'Resumo contextual de um documento: título, categoria, headings (sumário) e prévia do conteúdo.',
    inputSchema: schema,
    handler: async ({ path, id }) => {
      const doc = await resolveDocument(deps, { path, id });
      if (!doc) {
        throw new Error(`Documento não encontrado (path="${path ?? ''}" id="${id ?? ''}")`);
      }
      const chunks = await deps.prisma.chunk.findMany({
        where: { documentId: doc.id },
        orderBy: { index: 'asc' },
      });
      const headings = [
        ...new Set(chunks.map((chunk) => chunk.heading).filter((h): h is string => Boolean(h))),
      ].slice(0, 20);
      return {
        id: doc.id,
        path: doc.path,
        title: doc.title,
        category: doc.category,
        categories: doc.categories,
        lang: doc.lang,
        summary: doc.summary,
        headings,
        chunkCount: chunks.length,
        tokenEstimate: doc.tokenEstimate,
        updatedAt: doc.updatedAt,
      };
    },
  };
}
