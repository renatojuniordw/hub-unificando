import { z } from 'zod';
import type { Document } from '../../../generated/prisma/client.js';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z
  .object({
    path: z.string().optional().describe('caminho relativo (ex: docs/ARCHITECTURE.md)'),
    id: z.string().optional().describe('id do documento'),
    project: z.string().optional().describe('projeto (ajuda a desambiguar path)'),
  })
  .refine((args) => Boolean(args.path ?? args.id), {
    message: 'informe "path" ou "id"',
  });

/** conteúdo integral de um documento (por path ou id) (R). */
export function obterDocumento(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'obter_documento',
    description:
      'Conteúdo integral de um documento indexado (por path ou id), incluindo trechos (chunks) ordenados.',
    inputSchema: schema,
    handler: async ({ path, id, project }) => {
      const doc = await resolveDocument(deps, { path, id, project });
      const chunks = await deps.prisma.chunk.findMany({
        where: { documentId: doc.id },
        orderBy: { index: 'asc' },
      });
      return {
        id: doc.id,
        projectSlug: doc.projectSlug,
        path: doc.path,
        title: doc.title,
        summary: doc.summary,
        category: doc.category,
        categories: doc.categories,
        lang: doc.lang,
        contentKind: doc.contentKind,
        chunks: chunks.map((chunk) => ({
          index: chunk.index,
          heading: chunk.heading,
          content: chunk.content,
          anchor: chunk.anchor,
        })),
      };
    },
  };
}

/** Localiza um documento por id ou path (com/sem projeto). */
export async function resolveDocument(
  deps: McpDeps,
  args: { path?: string; id?: string; project?: string },
): Promise<Document> {
  if (args.id) {
    const doc = await deps.documents.get(args.id);
    return doc;
  }
  if (!args.path) {
    throw new Error('informe "path" ou "id"');
  }
  if (args.project) {
    const doc = await deps.documents.getByPath(args.project, args.path);
    if (!doc) throw new Error(`Documento não encontrado (${args.project}/${args.path})`);
    return doc;
  }
  const found = await deps.prisma.document.findFirst({ where: { path: args.path } });
  if (!found) throw new Error(`Documento não encontrado (path="${args.path}")`);
  return found;
}
