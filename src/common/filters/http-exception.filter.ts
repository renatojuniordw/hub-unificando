import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from '../api/response.js';

/** Safely renders an unknown value as text; no implicit stringification. */
function text(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function validationMessage(message: unknown): string | undefined {
  if (Array.isArray(message)) {
    const parts: string[] = [];
    for (const rawItem of message) {
      const item: unknown = rawItem;
      if (item != null && typeof item === 'object') {
        const record = item as { constraints?: Record<string, string>; property?: string };
        const constraints = Object.values(record.constraints ?? {});
        if (constraints.length > 0) {
          parts.push(constraints.join('; '));
        } else {
          parts.push(`Invalid value for "${record.property ?? ''}"`);
        }
      } else {
        parts.push(typeof item === 'string' ? item : 'Invalid value');
      }
    }
    return parts.length > 0 ? parts.join(' | ') : undefined;
  }
  return undefined;
}

function mapException(ex: HttpException): { status: number; code: ErrorCode; message: string } {
  const status = ex.getStatus();
  const response = ex.getResponse();
  const message =
    typeof response === 'string' ? response : (response as { message?: unknown }).message;

  if (status === 404) {
    return { status, code: ERROR_CODES.NOT_FOUND, message: text(message, 'Not found') };
  }
  if (status === 409) {
    return { status, code: ERROR_CODES.CONFLICT, message: text(message, 'Conflict') };
  }
  if (status === 429) {
    return { status, code: ERROR_CODES.RATE_LIMITED, message: text(message, 'Too many requests') };
  }
  if (status === 401 || status === 403) {
    return { status, code: ERROR_CODES.UNAUTHORIZED, message: text(message, 'Unauthorized') };
  }
  if (status === 503) {
    return {
      status,
      code: ERROR_CODES.INGESTION_NOT_ENABLED,
      message: text(message, 'Unavailable'),
    };
  }
  const validationMsg = validationMessage(message);
  if (validationMsg || status === 400) {
    return {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: validationMsg ?? 'Invalid request',
    };
  }
  return { status, code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' };
}

/**
 * Turns every exception into the documented error envelope
 * `{ success: false, error: { code, message } }`. Internal details never
 * leak; the full stack is logged with a correlation id.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = randomUUID();

    const mapped =
      exception instanceof HttpException
        ? mapException(exception)
        : {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Internal server error',
          };

    if (mapped.status >= 500) {
      this.logger.error(
        `Unhandled ${exception instanceof Error ? exception.message : 'error'} [rid=${requestId}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorBody = {
      success: false,
      error: { code: mapped.code, message: mapped.message },
    };

    response.status(mapped.status).json(body);
  }
}
