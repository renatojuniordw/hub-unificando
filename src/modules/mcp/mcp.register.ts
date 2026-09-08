import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { z } from 'zod';
import type { McpToolDefinition } from './mcp.types';
import { jsonResult, toolError } from './result.utils';

/** Interface mínima de logger exigida pelo composition root (DIP). */
export interface McpToolLogger {
  error(message: string, stack?: string): void;
}

/** Visão tipada da tool usada dentro do registro (o any fica na fronteira). */
interface BoundedTool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown) => unknown;
}

/**
 * Registra tools declarativas no servidor MCP (composition root).
 * Nova tool = arquivo novo + entrada no array; o núcleo não muda (OCP).
 * Wrapping de serialização/erro centralizado (DRY). O logger é obrigatório
 * para que o erro real de uma tool sempre chegue ao log (nunca é devolvido
 * ao cliente — apenas a mensagem genérica).
 */
export function registerTools(
  server: McpServer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fronteira de protocolo (array heterogêneo)
  defs: readonly McpToolDefinition<any>[],
  logger: McpToolLogger,
): void {
  for (const raw of defs) {
    const tool = raw as BoundedTool;
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: unknown) => {
        try {
          return jsonResult(await tool.handler(args));
        } catch (error) {
          return toolError(error, logger, tool.name);
        }
      },
    );
  }
}
