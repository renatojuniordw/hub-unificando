/** API envelope types shared by the REST API (see docs/API.md). */

import type { PaginationMeta } from '../dto/pagination.dto.js';

export type { PaginationMeta };

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  MCP_ERROR: 'MCP_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INGESTION_NOT_ENABLED: 'INGESTION_NOT_ENABLED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
