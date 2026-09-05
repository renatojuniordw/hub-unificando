import { Module } from '@nestjs/common';
import { EmbeddingProvider } from './embedding.provider';
import { TransformersEmbeddingProvider } from './transformers.provider';

@Module({
  providers: [{ provide: EmbeddingProvider, useClass: TransformersEmbeddingProvider }],
  exports: [EmbeddingProvider],
})
export class EmbeddingModule {}
