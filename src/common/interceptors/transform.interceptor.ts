import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccess, PaginationMeta } from '../api/response.js';

function isApiSuccess(payload: unknown): payload is ApiSuccess<unknown> {
  return (
    payload != null &&
    typeof payload === 'object' &&
    'data' in payload &&
    'requestId' in payload
  );
}

/**
 * Wraps every controller response in the documented envelope:
 * `{ data, meta?, requestId, timestamp }`. Routes that return a raw
 * ApiSuccess (already wrapped) pass through untouched.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    return next.handle().pipe(
      map((payload: unknown) => {
        if (isApiSuccess(payload)) {
          return payload;
        }
        const result: ApiSuccess<unknown> = {
          data: payload ?? null,
          requestId,
          timestamp: new Date().toISOString(),
        };
        if (payload && typeof payload === 'object' && 'meta' in payload) {
          const meta = (payload as { meta?: PaginationMeta }).meta;
          if (meta) result.meta = meta;
        }
        return result;
      }),
    );
  }
}