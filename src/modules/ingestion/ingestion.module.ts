import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../../infra/embedding/embedding.module';
import { ClassificationModule } from '../classification/classification.module';
import { ChunkService } from './chunking/chunk.service';
import { IngestionOrchestrator } from './orchestrator/ingestion-orchestrator.service';
import { IngestionWriteRepository } from './repository/ingestion-write.repository';
import { KnowledgeLibService } from './knowledge/knowledge-lib.service';
import { PromptExtractorService } from './knowledge/prompt-extractor.service';
import { RegistryScanService } from './registry/registry-scan.service';
import { ScannerService } from './scan/scanner.service';
import { IngestionQueue } from './queue/ingestion.queue';
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [EmbeddingModule, ClassificationModule],
  controllers: [IngestionController],
  providers: [
    ScannerService,
    ChunkService,
    RegistryScanService,
    IngestionWriteRepository,
    IngestionOrchestrator,
    IngestionQueue,
    KnowledgeLibService,
    PromptExtractorService,
  ],
  exports: [
    ScannerService,
    ChunkService,
    RegistryScanService,
    IngestionWriteRepository,
    IngestionOrchestrator,
    IngestionQueue,
    KnowledgeLibService,
    PromptExtractorService,
  ],
})
export class IngestionModule {}
