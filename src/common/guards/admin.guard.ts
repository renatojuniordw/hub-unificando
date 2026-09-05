import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ENV, type Env } from '../../shared/config/env.js';

/**
 * Guards write endpoints (POST /ingest/jobs and the MCP executar_ingestao
 * tool). Requires `Authorization: Bearer <ADMIN_API_KEY>`; constant-time
 * comparison. Fails with 503 when ADMIN_API_KEY is not configured.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const configuredKey = this.env.ADMIN_API_KEY;
    if (!configuredKey) {
      throw new ServiceUnavailableException(
        'Ingestion endpoints are disabled: ADMIN_API_KEY is not configured',
      );
    }

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization bearer token');
    }

    const provided = Buffer.from(header.slice('Bearer '.length));
    const expected = Buffer.from(configuredKey);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
