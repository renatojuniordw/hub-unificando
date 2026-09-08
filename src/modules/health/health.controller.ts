import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { version } from '../../../package.json';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { countEmbeddedChunks } from '../../infra/vector/vector.sql';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Service health (readiness plus data overview)' })
  async check() {
    let db = false;
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      db = true;
    } catch {
      db = false;
    }
    // Disabled Redis is intentional, not a failure (same semantics as the CLI).
    const redis = this.redis.get() === null ? true : await this.redis.ping();
    // A failing embeddings count must degrade the endpoint, never throw —
    // this is the readiness probe.
    let embeddedChunks: number | null = null;
    if (db) {
      try {
        embeddedChunks = await countEmbeddedChunks(this.prisma);
      } catch {
        embeddedChunks = null;
      }
    }
    return {
      status: db && redis && embeddedChunks !== null ? 'ok' : 'degraded',
      service: 'hub-unificando',
      version,
      checks: { db, redis },
      data: { embeddedChunks },
      timestamp: new Date().toISOString(),
    };
  }
}
