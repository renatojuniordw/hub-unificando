import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  project: z.string().describe('slug do projeto'),
  topic: z.string().optional().describe('tópico focado (ativa busca no tópico)'),
  maxTokens: z
    .number()
    .int()
    .min(500)
    .max(20000)
    .optional()
    .describe('orçamento de tokens (default 6000)'),
  sections: z
    .array(z.enum(['registry', 'documents', 'decisions', 'search']))
    .optional()
    .describe('seleção de seções (todas por padrão)'),
});

/** pacote de contexto pronto p/ LLM (§12) (R). */
export function exportarContextoLlm(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'exportar_contexto_llm',
    description:
      'Pacote de contexto pronto para LLM: visão geral, documentação relevante, decisões e busca no tópico, respeitando orçamento de tokens.',
    inputSchema: schema,
    handler: async ({ project, topic, maxTokens, sections }) => {
      const pkg = await deps.context.export({
        projectSlug: project,
        topic,
        maxTokens: maxTokens ?? 6000,
      });
      const filtered =
        sections && sections.length > 0
          ? {
              ...pkg,
              sections: pkg.sections.filter((section) => sections.includes(section.id as never)),
            }
          : pkg;
      return filtered;
    },
  };
}
