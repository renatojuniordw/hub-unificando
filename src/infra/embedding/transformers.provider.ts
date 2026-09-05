import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  env as transformersEnv,
  pipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers';
import { ENV, type Env } from '../../shared/config/env';
import { PASSAGE_PREFIX, QUERY_PREFIX } from '../../shared/constants';
import { EmbeddingProvider } from './embedding.provider';

/**
 * On-device embeddings via Transformers.js (@huggingface/transformers v4).
 * Same model family as med-unificando (Xenova/multilingual-e5-base, 768d);
 * e5 texts must carry the "passage:" / "query:" prefix — applied here.
 *
 * The model is loaded lazily on first use and cached for the lifetime of the
 * process (embedding cache dir is configurable through EMBEDDING_CACHE_DIR).
 */
@Injectable()
export class TransformersEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger(TransformersEmbeddingProvider.name);
  private extractor: FeatureExtractionPipeline | null = null;
  private loading: Promise<void> | null = null;

  constructor(@Inject(ENV) private readonly env: Env) {
    transformersEnv.cacheDir = this.env.EMBEDDING_CACHE_DIR;
    if (this.env.EMBEDDING_DIMS <= 0) {
      throw new Error('EMBEDDING_DIMS must be a positive integer');
    }
  }

  dims(): number {
    return this.env.EMBEDDING_DIMS;
  }

  isReady(): boolean {
    return this.extractor !== null;
  }

  ensureLoaded(): Promise<void> {
    if (this.extractor) return Promise.resolve();
    if (!this.loading) {
      this.loading = this.loadModel().catch((error: unknown) => {
        this.loading = null;
        throw error;
      });
    }
    return this.loading;
  }

  private async loadModel(): Promise<void> {
    this.logger.log(
      `Loading on-device embedding model "${this.env.EMBEDDING_MODEL}" (dims=${this.dims()})...`,
    );
    const start = Date.now();
    this.extractor = await pipeline('feature-extraction', this.env.EMBEDDING_MODEL, {
      dtype: 'q8',
    });
    this.logger.log(`Embedding model ready in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  }

  async embed(
    texts: string[],
    options: { prefix?: 'passage' | 'query' | 'none' } = {},
  ): Promise<number[][]> {
    if (texts.length === 0) return [];
    await this.ensureLoaded();
    const extractor = this.extractor;
    if (!extractor) throw new Error('Embedding model not loaded');

    const results: number[][] = [];
    const batch = Math.max(1, this.env.EMBEDDING_BATCH_SIZE);
    for (let i = 0; i < texts.length; i += batch) {
      const slice = texts.slice(i, i + batch);
      const prefixed = slice.map((text) => {
        if (options.prefix === 'passage') return `${PASSAGE_PREFIX}${text}`;
        if (options.prefix === 'query') return `${QUERY_PREFIX}${text}`;
        return text;
      });
      const tensor = (await extractor(prefixed, {
        pooling: 'mean',
        normalize: true,
      })) as { data: ArrayLike<number>; dims: number[] };
      const dim = tensor.dims[tensor.dims.length - 1] ?? this.dims();
      for (let j = 0; j < slice.length; j++) {
        const start = j * dim;
        results.push(Array.from({ length: dim }, (_, k) => tensor.data[start + k]));
      }
    }
    return results;
  }
}
