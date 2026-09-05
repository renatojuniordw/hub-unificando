import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../../infra/embedding/embedding.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [EmbeddingModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
