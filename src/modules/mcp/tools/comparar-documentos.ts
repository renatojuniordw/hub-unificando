import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  pathA: z.string().describe('caminho do documento A'),
  pathB: z.string().describe('caminho do documento B'),
  project: z.string().optional().describe('projeto (desambigua path)'),
});

/** compara 2 documentos (sobreposição, divergências, unificado) (R). */
export function compararDocumentos(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'comparar_documentos',
    description:
      'Compara dois documentos indexados: sobreposição de headings e conteúdo, similaridade e seções comuns.',
    inputSchema: schema,
    handler: async ({ pathA, pathB, project }) => {
      const result = await deps.compare.compare(pathA, pathB, project);
      return result;
    },
  };
}
