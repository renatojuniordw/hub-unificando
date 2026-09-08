import * as packageJson from '../../../package.json';

export const MCP_SERVER_NAME = packageJson.name;
export const MCP_SERVER_VERSION = packageJson.version;

/** Versão da spec MCP anunciada (Streamable HTTP 2025-06-18). */
export { MCP_PROTOCOL_VERSION } from '../../shared/constants';
/** Caminho HTTP do transporte MCP (vive em shared/constants; re-exportado para consumidores). */
export { MCP_PATH } from '../../shared/constants';

export const MCP_ALLOWED_METHODS = 'GET, POST, DELETE, OPTIONS';
export const MCP_ALLOWED_HEADERS =
  'content-type, authorization, accept, mcp-session-id, mcp-protocol-version';

export const MAX_SESSIONS = 10_000;
export const SESSION_SWEEP_INTERVAL_MS = 60_000;
