import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { IngestionQueue } from './queue/ingestion.queue';
import { IngestionWriteRepository } from './repository/ingestion-write.repository';

export class CreateIngestionJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectSlug?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

// THROTTLE_WRITE do env (default 30/min) — avaliado no load do módulo,
// antes do validateEnv do bootstrap (decorators rodam no import).
const WRITE_THROTTLE = {
  default: { limit: Number(process.env.THROTTLE_WRITE ?? 30), ttl: 60_000 },
} as const;

@ApiTags('ingestion')
@ApiBearerAuth()
@Controller('ingest')
export class IngestionController {
  constructor(
    private readonly queue: IngestionQueue,
    private readonly writeRepo: IngestionWriteRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Post('jobs')
  @UseGuards(AdminGuard)
  @Throttle(WRITE_THROTTLE)
  @ApiOperation({ summary: 'Enqueue an ingestion job (admin, async via BullMQ)' })
  async createJob(@Body() dto: CreateIngestionJobDto) {
    const enabled = this.queue.isEnabled();
    if (!enabled) {
      throw new BadRequestException('Ingestion queue is disabled (REDIS_ENABLED=false)');
    }
    const job = await this.writeRepo.createJob('ingest', {
      projectSlug: dto.projectSlug ?? null,
      force: dto.force ?? false,
    });
    const enqueued = await this.queue.enqueue(
      { projectSlug: dto.projectSlug },
      { force: dto.force ?? false, dryRun: false },
      job.id,
    );
    return { jobId: job.id, queueId: enqueued.queueId, status: 'queued' };
  }

  @Get('jobs/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get ingestion job status + stats (admin)' })
  async getJob(@Param('id') id: string) {
    const row = await this.prisma.ingestionJob.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Ingestion job "${id}" not found`);
    }
    return row;
  }
}
