import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';
import { DocumentController, ProjectDocumentsController } from './documents.controller';

@Module({
  controllers: [DocumentController, ProjectDocumentsController],
  providers: [DocumentsService, DocumentsRepository],
  exports: [DocumentsService, DocumentsRepository],
})
export class DocumentsModule {}
