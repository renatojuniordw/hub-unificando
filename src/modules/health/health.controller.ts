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
    const redis = await this.redis.ping();
    const embeddedChunks = db ? await countEmbeddedChunks(this.prisma) : 0;
    return {
      status: db ? 'ok' : 'degraded',
      service: 'hub-unificando',
      version,
      checks: { db, redis },
      data: { embeddedChunks },
      timestamp: new Date().toISOString(),
    };
  }
}
