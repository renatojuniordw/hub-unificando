import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Category } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { queryRows } from '../../infra/prisma/raw';
import { EmbeddingProvider } from '../../infra/embedding/embedding.provider';
import {
  FALLBACK_CATEGORY,
  MAX_KEYWORD_WEIGHT,
  MAX_LABELS,
  MULTI_LABEL_THRESHOLD,
  RULE_CONFIDENCE_THRESHOLD,
  SEMANTIC_CONFIDENCE_THRESHOLD,
} from './classification.constants';

export type ClassificationMethod = 'rules' | 'semantic' | 'fallback';

export interface ClassificationResult {
  category: string;
  categories: string[];
  confidence: number;
  method: ClassificationMethod;
}

interface PrototypeRow {
  slug: string;
  vector: string | null; // "[0.1,0.2,...]" as text
}

/**
 * Hybrid content classifier (docs/CLASSIFICATION.md):
 * 1. deterministic rule pass over category keywords;
 * 2. semantic pass against category prototype embeddings when rules are
 *    inconclusive (or to enrich multi-label);
 * 3. `general` fallback below confidence.
 */
@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EmbeddingProvider) private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * Classifies a single text. Rules run first (cheap, deterministic); the
   * semantic pass is only triggered when the rule pass is inconclusive.
   */
  async classify(text: string): Promise<ClassificationResult> {
    const categories = await this.prisma.category.findMany();
    const ruleScores = rulePass(text, categories);
    const bestRule = topCategory(ruleScores);

    if (bestRule && ruleScores[bestRule] >= RULE_CONFIDENCE_THRESHOLD) {
      return {
        category: bestRule,
        categories: multiLabel(ruleScores, bestRule),
        confidence: ruleScores[bestRule],
        method: 'rules',
      };
    }

    const semanticScores = await this.semanticPass(text, categories);
    const bestSemantic = topCategory(semanticScores);
    const combined = mergeScores(ruleScores, semanticScores);
    const best = topCategory(combined) ?? FALLBACK_CATEGORY;

    if (bestSemantic && semanticScores[bestSemantic] >= SEMANTIC_CONFIDENCE_THRESHOLD) {
      return {
        category: best,
        categories: multiLabel(combined, best),
        confidence: combined[best] ?? 0,
        method: 'semantic',
      };
    }

    if (bestRule && ruleScores[bestRule] > 0) {
      return {
        category: bestRule,
        categories: multiLabel(ruleScores, bestRule),
        confidence: ruleScores[bestRule],
        method: 'rules',
      };
    }

    return {
      category: FALLBACK_CATEGORY,
      categories: [FALLBACK_CATEGORY],
      confidence: 0,
      method: 'fallback',
    };
  }

  /** Loads/refreshes cached category prototype vectors from the database. */
  private async loadPrototypes(): Promise<PrototypeRow[]> {
    return queryRows<PrototypeRow[]>(
      this.prisma,
      'SELECT slug, prototype::text AS vector FROM categories WHERE prototype IS NOT NULL',
    );
  }

  private async semanticPass(
    text: string,
    categories: Category[],
  ): Promise<Record<string, number>> {
    try {
      const [embedding] = await this.embedding.embed([text.trim()], { prefix: 'passage' });
      if (!embedding) return {};
      const rows = await this.loadPrototypes();
      const bySlug = new Map(categories.map((category) => [category.slug, category] as const));
      const scores: Record<string, number> = {};
      for (const row of rows) {
        if (!bySlug.has(row.slug) || !row.vector) continue;
        const proto = parseVector(row.vector);
        if (proto.length !== embedding.length) {
          this.logger.warn(
            `Prototype dims mismatch for "${row.slug}" (${proto.length} != ${embedding.length})`,
          );
          continue;
        }
        scores[row.slug] = cosineSimilarity(embedding, proto);
      }
      return scores;
    } catch (error) {
      this.logger.warn(
        `Semantic classification failed (${error instanceof Error ? error.message : 'error'}); continuing with rules`,
      );
      return {};
    }
  }
}

/** Deterministic keyword scoring. Exported for unit tests. */
export function rulePass(text: string, categories: Category[]): Record<string, number> {
  const normalized = normalize(text);
  const scores: Record<string, number> = {};
  for (const category of categories) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (keyword.length === 0) continue;
      if (normalized.includes(normalize(keyword))) {
        score += Math.min(MAX_KEYWORD_WEIGHT, keyword.length / 12);
      }
    }
    scores[category.slug] = Math.min(1, score);
  }
  return scores;
}

/** Cosine similarity for l2-normalized vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * (b[i] ?? 0);
  return dot;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function topCategory(scores: Record<string, number>): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const [slug, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = slug;
      bestScore = score;
    }
  }
  return best;
}

/** Primary + co-occurring labels above threshold (capped, general excluded). */
function multiLabel(scores: Record<string, number>, primary: string): string[] {
  const labels = Object.entries(scores)
    .filter(([slug, score]) => slug !== FALLBACK_CATEGORY && score >= MULTI_LABEL_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LABELS)
    .map(([slug]) => slug);
  if (!labels.includes(primary)) labels.unshift(primary);
  return labels.slice(0, MAX_LABELS);
}

function mergeScores(
  rules: Record<string, number>,
  semantic: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...rules };
  for (const [slug, score] of Object.entries(semantic)) {
    const ruleScore = rules[slug] ?? 0;
    merged[slug] = Math.max(ruleScore, score);
  }
  return merged;
}

function parseVector(raw: string): number[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];
  try {
    return JSON.parse(trimmed) as number[];
  } catch {
    return [];
  }
}
