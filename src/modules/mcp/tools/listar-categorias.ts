import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({});

/** taxonomia com contagens (R). */
export function listarCategorias(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'listar_categorias',
    description:
      'Taxonomia de conteúdo do Hub: categorias, descrições e número de documentos classificados em cada uma.',
    inputSchema: schema,
    handler: async () => {
      const categories = await deps.categories.list();
      return categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
        documentCount: category.documentCount,
      }));
    },
  };
}
