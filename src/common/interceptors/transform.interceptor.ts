import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccess, PaginationMeta } from '../api/response.js';

interface Paginated {
  data: unknown;
  meta: PaginationMeta;
}

function isApiSuccess(payload: unknown): payload is ApiSuccess<unknown> {
  return (
    payload != null &&
    typeof payload === 'object' &&
    'success' in payload &&
    payload.success === true &&
    'data' in payload
  );
}

/**
 * Wraps every controller response in the documented envelope:
 * `{ success: true, data, meta? }`. Already-wrapped payloads and paginated
 * `{ data, meta }` results pass through/normalize accordingly.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (isApiSuccess(payload)) {
          return payload;
        }
        if (
          payload != null &&
          typeof payload === 'object' &&
          'data' in payload &&
          'meta' in payload &&
          !('success' in payload)
        ) {
          const { data, meta } = payload as Paginated;
          return { success: true, data, meta } satisfies ApiSuccess<unknown>;
        }
        return { success: true, data: payload ?? null } satisfies ApiSuccess<unknown>;
      }),
    );
  }
}
