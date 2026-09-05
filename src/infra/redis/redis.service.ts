import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV, type Env } from '../../shared/config/env.js';

/**
 * Redis wrapper used by BullMQ (ingestion queue) and the optional search
 * cache. Disabled entirely when REDIS_ENABLED=false.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(@Inject(ENV) env: Env) {
    this.client = env.REDIS_ENABLED ? new Redis(env.REDIS_URL) : null;
    if (this.client) {
      this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    }
  }

  get(): Redis | null {
    return this.client;
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
