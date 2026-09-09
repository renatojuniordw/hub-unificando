import type { ErrorCode } from '../../common/api/response.js';

/**
 * Erro de domínio das tools MCP com código estruturado. Tools lançam este
 * erro para sinalizar falhas "esperadas" (ex.: recurso não encontrado) — o
 * `toolError` então devolve o código e a mensagem controlada ao cliente em
 * vez do genérico MCP_ERROR (ver result.utils.ts).
 */
export class McpToolError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}
