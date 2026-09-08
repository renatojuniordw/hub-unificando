/** Shared constants for the Hub. */

export const PASSAGE_PREFIX = 'passage: ';
export const QUERY_PREFIX = 'query: ';

/** Markdown chunking bounds (characters) — see docs/INGESTION.md. */
export const CHUNK_TARGET_MAX_CHARS = 1500;
export const CHUNK_OVERLAP_CHARS = 150;

/** Rough heuristic: ~4 characters per token (limitation documented). */
export const TOKEN_CHARS_DIVISOR = 4;

/** MCP protocol version implemented by this server (spec 2025-06-18). */
export const MCP_PROTOCOL_VERSION = '2025-06-18';

export const API_PREFIX = '/api/v1';
export const MCP_PATH = '/mcp';

/** Folder names that are never scanned as projects or files. */
export const SCAN_EXCLUDED_DIRS = [
  'hub-unificando',
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
  '.refactor',
  '.verboo',
  '.claude',
  'playwright-report',
  'test-results',
  '.turbo',
  '.cache',
];

/** Id of the default ingestion queue in BullMQ. */
export const INGESTION_QUEUE = 'ingestion';
