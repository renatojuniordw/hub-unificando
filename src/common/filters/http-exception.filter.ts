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

interface ValidationFailure {
  property: string;
  constraints?: string[];
}

function extractValidationDetails(message: unknown): ValidationFailure[] | undefined {
  if (Array.isArray(message)) {
    return message
      .map((item) => {
        if (item && typeof item === 'object' && 'property' in item) {
          const constraints = Object.values((item.constraints ?? {}) as Record<string, string>);
          return { property: item.property as string, constraints };
        }
        return { property: String(item), constraints: [] };
      })
      .filter((failure) => failure.property !== '');
  }
  return undefined;
}

function mapException(ex: HttpException): {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
} {
  const status = ex.getStatus();
  const response = ex.getResponse();
  const message =
    typeof response === 'string' ? response : ((response as { message?: unknown }).message as unknown);

  if (status === HttpStatus.NOT_FOUND) {
    return { status, code: ERROR_CODES.NOT_FOUND, message: String(message ?? 'Not found') };
  }
  if (status === HttpStatus.CONFLICT) {
    return { status, code: ERROR_CODES.CONFLICT, message: String(message ?? 'Conflict') };
  }
  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return { status, code: ERROR_CODES.RATE_LIMITED, message: String(message ?? 'Too many requests') };
  }
  const details = extractValidationDetails(message);
  if (details || status === HttpStatus.BAD_REQUEST) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid request',
      details,
    };
  }
  return { status, code: ERROR_CODES.INTERNAL_ERROR, message: String(message ?? 'Unexpected error') };
}

/** Turns every exception into the documented error envelope (docs/API.md). */
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
        `Unhandled ${exception instanceof Error ? exception.message : 'error'} [${requestId}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorBody = {
      error: {
        code: mapped.code,
        status: mapped.status,
        message: mapped.message,
        ...(mapped.details !== undefined ? { details: mapped.details } : {}),
      },
      requestId,
      timestamp: new Date().toISOString(),
    };

    response.status(mapped.status).json(body);
  }
}