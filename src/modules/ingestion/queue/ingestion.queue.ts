import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { RedisService } from '../../../infra/redis/redis.service';
import { ENV, type Env } from '../../../shared/config/env';
import { INGESTION_QUEUE } from '../../../shared/constants';
import type { IngestOptions, IngestionScope } from '../ingestion.types';
import { IngestionOrchestrator } from '../orchestrator/ingestion-orchestrator.service';

export interface EnqueuedJob {
  queueId: string | undefined;
}

/**
 * BullMQ-backed ingestion queue for the write API (POST /ingest/jobs).
 * The worker runs the same orchestrator used by the CLI. BullMQ requires a
 * dedicated ioredis connection with maxRetriesPerRequest=null (blocking).
 * When Redis is disabled the queue stays inert and callers get a 503.
 */
@Injectable()
export class IngestionQueue implements OnModuleDestroy {
  private readonly logger = new Logger(IngestionQueue.name);
  private readonly connection: Redis | null;
  private readonly queue: Queue | null;
  private readonly worker: Worker | null;

  constructor(
    private readonly redis: RedisService,
    orchestrator: IngestionOrchestrator,
    @Inject(ENV) env: Env,
  ) {
    if (!this.redis.get()) {
      this.connection = null;
      this.queue = null;
      this.worker = null;
      return;
    }
    this.connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = new Queue(INGESTION_QUEUE, { connection: this.connection });
    this.worker = new Worker(
      INGESTION_QUEUE,
      async (job) => {
        const data = job.data as { scope: IngestionScope; options: IngestOptions };
        this.logger.log(`Processing ingestion job ${job.id}`);
        return orchestrator.ingest(data.scope, data.options);
      },
      { connection: this.connection, concurrency: 1 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Ingestion job ${job?.id} failed: ${error.message}`);
    });
  }

  async enqueue(scope: IngestionScope, options: IngestOptions): Promise<EnqueuedJob> {
    if (!this.queue) {
      throw new Error('REDIS_DISABLED');
    }
    const job = await this.queue.add('ingest', { scope, options }, { removeOnComplete: true });
    return { queueId: job.id };
  }

  async isEnabled(): Promise<boolean> {
    return this.queue !== null;
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}