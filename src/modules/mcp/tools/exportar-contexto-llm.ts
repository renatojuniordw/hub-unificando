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
    .array(
      z.enum([
        'visao_geral',
        'arquitetura',
        'design_system',
        'componentes_reutilizaveis',
        'exemplos',
        'decisoes_previas',
        'convencoes',
        'fontes',
      ]),
    )
    .optional()
    .describe('seleção de seções (todas por padrão)'),
});

/** pacote de contexto pronto p/ LLM (§12) (R). */
export function exportarContextoLlm(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'exportar_contexto_llm',
    description:
      'Pacote de contexto pronto para LLM (spec §12): visão geral, arquitetura, design system (com fallback para ui-unificando), componentes reutilizáveis, exemplos, decisões prévias, convenções e fontes — com citações e orçamento de tokens.',
    inputSchema: schema,
    handler: async ({ project, topic, maxTokens, sections }) => {
      const pkg = await deps.context.export({
        projectSlug: project,
        topic,
        maxTokens: maxTokens ?? 6000,
        sections,
      });
      return pkg;
    },
  };
}
