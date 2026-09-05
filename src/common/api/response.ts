/** API envelope types shared by the REST API (see docs/API.md). */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    status: number;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  MCP_ERROR: 'MCP_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INGESTION_NOT_ENABLED: 'INGESTION_NOT_ENABLED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];