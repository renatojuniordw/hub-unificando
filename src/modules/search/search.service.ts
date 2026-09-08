import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { EmbeddingProvider } from '../../infra/embedding/embedding.provider';
import {
  keywordSearch,
  trigramSearch,
  vectorSearch,
  type ChunkHitRow,
  type VectorSearchFilters,
} from '../../infra/vector/vector.sql';
import { ENV, type Env } from '../../shared/config/env';
import type { SearchStrategy } from './search.dto';

/** Internal search input (REST/MCP/CLI all map into this shape). */
export interface SearchInput {
  q: string;
  projectSlug?: string;
  category?: string;
  docType?: string;
  contentKind?: string;
  /** Max results to return (REST pageSize; MCP topK; CLI --top). */
  limit: number;
  /** Pagination offset for REST (page-1)*pageSize. */
  skip?: number;
  /** Minimum fused score (RRF) — applied before limit/skip, so `total`
   * reflects the qualifying pool, not the returned page. */
  minScore?: number;
  strategy?: SearchStrategy;
}

/** Fusion weights per strategy (docs/SEARCH.md, same family as med). */
const FUSION = {
  balanced: { vector: 0.4, keyword: 0.35, trigram: 0.25 },
  recall: { vector: 0.35, keyword: 0.4, trigram: 0.25 },
  precision: { vector: 0.45, keyword: 0.4, trigram: 0.15 },
} as const;

const RRF_K = 60;
const FUSION_TOP_K = 60;

export interface SearchHit {
  chunkId: string;
  documentId: string;
  projectSlug: string;
  path: string;
  title: string;
  heading: string | null;
  anchor: string | null;
  content: string;
  tokenCount: number;
  categories: string[];
  docType: string;
  contentKind: string | null;
  tags: string[];
  publishedAt: Date | null;
  score: number;
  vectorScore: number | null;
  keywordScore: number | null;
  trigramScore: number | null;
}

export interface SearchResponse {
  query: string;
  strategy: SearchStrategy;
  hits: SearchHit[];
  total: number;
}

interface Ranked {
  hit: ChunkHitRow;
  rrf: number;
  vectorScore: number | null;
  keywordScore: number | null;
  trigramScore: number | null;
}

/** Hybrid semantic + keyword + fuzzy search (docs/SEARCH.md). */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(EmbeddingProvider) private readonly embedding: EmbeddingProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async search(query: SearchInput): Promise<SearchResponse> {
    const limit = query.limit;
    const skip = query.skip ?? 0;
    const strategy = query.strategy ?? 'balanced';
    const cacheKey = this.cacheKey(query);
    const cached = await this.readCache(cacheKey);
    if (cached) {
      this.logger.debug(`search cache hit for "${query.q}"`);
      return cached;
    }

    const [embedding] = await this.embedding.embed([query.q], { prefix: 'query' });
    if (!embedding) {
      return { query: query.q, strategy, hits: [], total: 0 };
    }

    const filters: VectorSearchFilters = {
      projectSlug: query.projectSlug,
      categories: query.category ? [query.category] : undefined,
      docType: query.docType,
      contentKind: query.contentKind,
      topK: FUSION_TOP_K,
    };

    const [vectorHits, keywordHits, trigramHits] = await Promise.all([
      vectorSearch(this.prisma, embedding, filters),
      keywordSearch(this.prisma, query.q, filters),
      trigramSearch(this.prisma, query.q, filters),
    ]);

    const weights = FUSION[strategy];
    const ranked = this.fuse(vectorHits, keywordHits, trigramHits, weights);
    // minScore corta ANTES do limit/skip: filtrar depois do slice esconderia
    // hits qualificados fora da página e inflaria o total com o subconjunto.
    const qualifying =
      query.minScore !== undefined
        ? ranked.filter((entry) => entry.rrf >= query.minScore!)
        : ranked;
    const hits = qualifying.slice(skip, skip + limit).map((entry) => this.toHit(entry));

    const response: SearchResponse = { query: query.q, strategy, hits, total: qualifying.length };
    await this.writeCache(cacheKey, response);
    return response;
  }

  /** Reciprocal Rank Fusion (k=60, weighted per strategy). */
  private fuse(
    vectorHits: ChunkHitRow[],
    keywordHits: ChunkHitRow[],
    trigramHits: ChunkHitRow[],
    weights: { vector: number; keyword: number; trigram: number },
  ): Ranked[] {
    const rrf = new Map<string, Ranked>();
    const add = (
      rows: ChunkHitRow[],
      weight: number,
      field: 'vectorScore' | 'keywordScore' | 'trigramScore',
    ): void => {
      rows.forEach((hit, index) => {
        const contribution = weight / (RRF_K + index + 1);
        const entry = rrf.get(hit.chunkId);
        if (entry) {
          entry.rrf += contribution;
          entry[field] = hit.score;
        } else {
          rrf.set(hit.chunkId, {
            hit,
            rrf: contribution,
            vectorScore: null,
            keywordScore: null,
            trigramScore: null,
            [field]: hit.score,
          });
        }
      });
    };
    add(vectorHits, weights.vector, 'vectorScore');
    add(keywordHits, weights.keyword, 'keywordScore');
    add(trigramHits, weights.trigram, 'trigramScore');
    return [...rrf.values()].sort((a, b) => b.rrf - a.rrf);
  }

  private toHit(entry: Ranked): SearchHit {
    const { hit } = entry;
    return {
      chunkId: hit.chunkId,
      documentId: hit.documentId,
      projectSlug: hit.projectSlug,
      path: hit.path,
      title: hit.title,
      heading: hit.heading,
      anchor: hit.anchor,
      content: hit.content,
      tokenCount: hit.tokenCount,
      categories: hit.categories,
      docType: hit.docType,
      contentKind: hit.contentKind,
      tags: hit.tags,
      publishedAt: hit.publishedAt,
      score: entry.rrf,
      vectorScore: entry.vectorScore,
      keywordScore: entry.keywordScore,
      trigramScore: entry.trigramScore,
    };
  }

  private cacheKey(query: SearchInput): string {
    const parts = [
      query.q.trim().toLowerCase(),
      query.projectSlug ?? '',
      query.category ?? '',
      query.docType ?? '',
      query.contentKind ?? '',
      String(query.limit),
      String(query.skip ?? 0),
      query.minScore !== undefined ? String(query.minScore) : '',
      query.strategy ?? 'balanced',
    ];
    return `search:v1:${parts.join('|')}`;
  }

  private async readCache(key: string): Promise<SearchResponse | null> {
    const client = this.redis.get();
    if (!client) return null;
    try {
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as SearchResponse) : null;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, value: SearchResponse): Promise<void> {
    const client = this.redis.get();
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), 'EX', this.env.SEARCH_CACHE_TTL_SECONDS);
    } catch {
      // cache is best-effort
    }
  }
}
