import type { z } from 'zod';

/** Definição declarativa de uma tool MCP (mesmo padrão do med-unificando). */
export interface McpToolDefinition<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: S;
  handler: (input: z.infer<S>) => unknown;
}

/** Resultado de tool no formato esperado pelo protocolo MCP (content blocks). */
export type McpToolResult = {
  content: { type: 'text'; text: string }[];
};

/** Payload padrão devolvido por toda tool (docs/MCP.md). */
export interface McpToolPayloadOk {
  ok: true;
  data: unknown;
}

export interface McpToolPayloadError {
  ok: false;
  error: { code: string; message: string };
}
