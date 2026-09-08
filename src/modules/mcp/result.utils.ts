import type { McpToolPayloadError, McpToolPayloadOk, McpToolResult } from './mcp.types';

/** Mensagem genérica: nunca vazar detalhes internos (Prisma/stack/db). */
const GENERIC_ERROR_MESSAGE = 'Erro interno ao executar a ferramenta';

/** Serializa dados no content block padrão da tool. */
export function jsonResult(data: unknown): McpToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: true, data } satisfies McpToolPayloadOk, null, 2),
      },
    ],
  };
}

/** Erro seguro; o detalhe real vai apenas para o log interno. */
export function toolError(
  error: unknown,
  logger?: { error: (message: string, stack?: string) => void },
  toolName?: string,
): McpToolResult {
  const message = error instanceof Error ? error.message : 'unknown';
  if (logger) {
    logger.error(
      `[mcp] error on tool${toolName ? ` "${toolName}"` : ''}: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ok: false,
            error: { code: 'MCP_ERROR', message: GENERIC_ERROR_MESSAGE },
          } satisfies McpToolPayloadError,
          null,
          2,
        ),
      },
    ],
  };
}
