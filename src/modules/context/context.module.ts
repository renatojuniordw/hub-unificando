import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { SearchModule } from '../search/search.module';
import { CompareService } from './compare.service';
import { ContextAssemblerService } from './context-assembler.service';
import { SummaryService } from './summary.service';
import { ContextController } from './context.controller';

@Module({
  imports: [DocumentsModule, DecisionsModule, SearchModule],
  controllers: [ContextController],
  providers: [ContextAssemblerService, CompareService, SummaryService],
  exports: [ContextAssemblerService, CompareService, SummaryService],
})
export class ContextModule {}
