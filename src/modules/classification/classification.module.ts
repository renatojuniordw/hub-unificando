import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../../infra/embedding/embedding.module';
import { ClassifierService } from './classifier.service';
import { CategoryPrototypeSeeder } from './prototype-seeder.service';

@Module({
  imports: [EmbeddingModule],
  providers: [ClassifierService, CategoryPrototypeSeeder],
  exports: [ClassifierService, CategoryPrototypeSeeder],
})
export class ClassificationModule {}
