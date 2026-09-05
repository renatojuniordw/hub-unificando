import { Test } from '@nestjs/testing';
import type { Category } from '../../generated/prisma/client.js';
import { EmbeddingProvider } from '../../infra/embedding/embedding.provider';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ClassificationModule } from './classification.module';
import { ClassifierService, cosineSimilarity, rulePass } from './classifier.service';

const CATEGORIES: Category[] = [
  {
    slug: 'api',
    name: 'API',
    description: 'Endpoints',
    keywords: ['endpoint', 'rest', 'http', 'swagger'],
    parentSlug: null,
    metadata: null,
    createdAt: new Date(),
  },
  {
    slug: 'database',
    name: 'Banco de Dados',
    description: 'Schema',
    keywords: ['postgresql', 'prisma', 'migration'],
    parentSlug: null,
    metadata: null,
    createdAt: new Date(),
  },
  {
    slug: 'seguranca',
    name: 'Segurança',
    description: 'Security',
    keywords: ['seguranca', 'authentication'],
    parentSlug: null,
    metadata: null,
    createdAt: new Date(),
  },
  {
    slug: 'general',
    name: 'Geral',
    description: 'Fallback',
    keywords: [],
    parentSlug: null,
    metadata: null,
    createdAt: new Date(),
  },
];

interface PrototypeRow {
  slug: string;
  vector: string | null;
}

function buildModule(embedding: number[], prototypes: PrototypeRow[]) {
  const prismaMock = {
    category: { findMany: jest.fn().mockResolvedValue(CATEGORIES) },
    $queryRawUnsafe: jest.fn().mockResolvedValue(prototypes),
  };
  const embeddingMock: EmbeddingProvider = {
    embed: jest.fn().mockResolvedValue(prototypes.map(() => embedding)),
    dims: () => embedding.length,
    isReady: () => true,
    ensureLoaded: jest.fn().mockResolvedValue(undefined),
  };
  return Test.createTestingModule({ imports: [ClassificationModule, PrismaModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .overrideProvider(EmbeddingProvider)
    .useValue(embeddingMock)
    .compile();
}

describe('ClassifierService', () => {
  it('classifies via deterministic rules when a keyword matches strongly', async () => {
    const moduleRef = await buildModule([], []);
    const service = moduleRef.get(ClassifierService);
    const result = await service.classify('REST endpoint with rate limiting (swagger docs)');
    expect(result.category).toBe('api');
    expect(result.method).toBe('rules');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.categories).toContain('api');
  });

  it('normalizes accents so rules match "segurança"', async () => {
    const moduleRef = await buildModule([], []);
    const service = moduleRef.get(ClassifierService);
    const result = await service.classify('Política de segurança e autenticação da API');
    expect(result.category).toBe('seguranca');
  });

  it('falls back to semantics when rules are inconclusive', async () => {
    // No keyword hit; semantic embedding points at database prototype (cos=1).
    const moduleRef = await buildModule(
      [1, 0],
      [
        { slug: 'database', vector: '[1,0]' },
        { slug: 'general', vector: '[0,0]' },
      ],
    );
    const service = moduleRef.get(ClassifierService);
    const result = await service.classify('ferramenta de banco relacional com índices e schemas');
    expect(result.method).toBe('semantic');
    expect(result.category).toBe('database');
  });

  it('returns the general fallback below confidence', async () => {
    // Zero embeddings + non-matching prototypes => cosine 0 everywhere.
    const moduleRef = await buildModule(
      [0, 0],
      [
        { slug: 'database', vector: '[0,0]' },
        { slug: 'api', vector: '[0,0]' },
      ],
    );
    const service = moduleRef.get(ClassifierService);
    const result = await service.classify('qualquer texto sem contexto');
    expect(result.method).toBe('fallback');
    expect(result.category).toBe('general');
  });
});

describe('rulePass', () => {
  it('scores 0 for unrelated text', () => {
    const scores = rulePass('hello world', CATEGORIES);
    expect(scores.api).toBe(0);
  });

  it('weights longer keywords higher', () => {
    const scores = rulePass('prisma migration', CATEGORIES);
    expect(scores.database).toBeGreaterThan(0);
  });
});

describe('cosineSimilarity', () => {
  it('computes similarity for unit vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });
});
