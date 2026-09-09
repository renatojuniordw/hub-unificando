import type { McpToolPayloadOk, McpToolResult } from './mcp.types';
import { McpToolError } from './mcp.errors';

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

/**
 * Erro seguro para o cliente. Erros de domínio tipados (McpToolError — ex.:
 * recurso não encontrado) mantêm código e mensagem legíveis; erros
 * inesperados viram MCP_ERROR genérico. O detalhe real (stack) sempre vai
 * apenas para o log interno.
 */
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
  const typed = error instanceof McpToolError;
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          typed
            ? { ok: false, error: { code: error.code, message: error.message } }
            : { ok: false, error: { code: 'MCP_ERROR', message: GENERIC_ERROR_MESSAGE } },
          null,
          2,
        ),
      },
    ],
  };
}
