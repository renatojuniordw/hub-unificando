import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { z } from 'zod';
import type { McpToolDefinition } from './mcp.types';
import { jsonResult, toolError } from './result.utils';

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
 * Wrapping de serialização/erro centralizado (DRY).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fronteira de protocolo (array heterogêneo)
export function registerTools(server: McpServer, defs: readonly McpToolDefinition<any>[]): void {
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
          return toolError(error);
        }
      },
    );
  }
}
