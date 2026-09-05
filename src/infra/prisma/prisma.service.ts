import { Injectable, Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ENV, type Env } from '../../shared/config/env.js';

/**
 * Prisma client wired with the PostgreSQL driver adapter (Prisma 7 pattern,
 * same as med-unificando). Vector/tsvector operations go through raw SQL in
 * the dedicated vector helpers — never through the ORM (Unsupported columns).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(ENV) env: Env) {
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
    super({
      adapter,
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
