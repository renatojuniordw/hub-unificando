import * as packageJson from '../../../package.json';

export const MCP_SERVER_NAME = packageJson.name;
export const MCP_SERVER_VERSION = packageJson.version;

export const MCP_PATH = '/mcp';

export const MCP_ALLOWED_METHODS = 'GET, POST, DELETE, OPTIONS';
export const MCP_ALLOWED_HEADERS =
  'content-type, authorization, accept, mcp-session-id, mcp-protocol-version';

export const DEFAULT_SESSION_TTL_MIN = 60;
export const DEFAULT_MCP_RATE_LIMIT = 120;
export const MAX_SESSIONS = 10_000;
export const SESSION_SWEEP_INTERVAL_MS = 60_000;
