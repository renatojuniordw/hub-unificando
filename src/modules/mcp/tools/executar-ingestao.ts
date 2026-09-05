import { z } from 'zod';
import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';

const schema = z.object({
  project: z.string().optional().describe('slug do projeto; ausente = todos os habilitados'),
  path: z.string().optional().describe('reservado para ingestão por arquivo (v2)'),
  reset: z.boolean().optional().describe('true = força reindexação mesmo sem mudança de hash'),
});

/**
 * Dispara job de ingestão (W, auth admin). Requer MCP_API_KEY configurada
 * (ver docs/MCP.md). Se REDIS estiver off, responde erro limpo.
 */
export function executarIngestao(deps: McpDeps): McpToolDefinition<typeof schema> {
  return {
    name: 'executar_ingestao',
    description:
      'Dispara um job assíncrono de ingestão (admin). Requer MCP_API_KEY configurada no servidor.',
    inputSchema: schema,
    handler: async ({ project, reset }) => {
      if (!deps.env.MCP_API_KEY) {
        throw new Error('Ingestão via MCP desabilitada: MCP_API_KEY não configurada');
      }
      if (!deps.queue.isEnabled()) {
        throw new Error('Fila de ingestão desabilitada (REDIS_ENABLED=false)');
      }
      const job = await deps.writeRepo.createJob('ingest', {
        projectSlug: project ?? null,
        reset: reset ?? false,
      });
      const enqueued = await deps.queue.enqueue(
        { projectSlug: project },
        { force: reset ?? false, dryRun: false },
        job.id,
      );
      return {
        jobId: job.id,
        queueId: enqueued.queueId,
        status: 'queued',
        project: project ?? '*',
      };
    },
  };
}
