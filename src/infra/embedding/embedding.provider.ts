/** Embedding provider contract (on-device in v1). */
export abstract class EmbeddingProvider {
  /** Embed a batch of texts; vectors are l2-normalized. */
  abstract embed(
    texts: string[],
    options?: { prefix?: 'passage' | 'query' | 'none' },
  ): Promise<number[][]>;

  /** Expected vector dimensionality (from env). */
  abstract dims(): number;

  /** Whether the model is loaded and ready to embed. */
  abstract isReady(): boolean;

  /** Load the model if not loaded yet (idempotent, concurrent-safe). */
  abstract ensureLoaded(): Promise<void>;
}
