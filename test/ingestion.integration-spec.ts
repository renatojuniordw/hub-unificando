/**
 * End-to-end integration test with a real PostgreSQL+pgvector container
 * (Testcontainers): migrations -> seed -> ingest (scanner/parser/chunker/
 * classifier/embeddings persistence) -> hybrid search.
 *
 * The embedding model is overridden by a deterministic fake so the suite is
 * hermetic and fast; the real model path is covered by `seed-categories` and
 * `hub ingest` smoke runs. Redis is disabled here to keep the queue inert.
 */
import { execSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';

import { AppModule } from '../src/app.module';
import { EmbeddingProvider } from '../src/infra/embedding/embedding.provider';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { IngestionOrchestrator } from '../src/modules/ingestion/orchestrator/ingestion-orchestrator.service';
import { SearchService } from '../src/modules/search/search.service';

describe('ingestion + search integration (pgvector)', () => {
  let container: StartedTestContainer;
  let prisma: PrismaService;
  let orchestrator: IngestionOrchestrator;
  let search: SearchService;
  let tempProject: string;

  beforeAll(async () => {
    container = await new GenericContainer('pgvector/pgvector:pg16')
      .withEnvironment({
        POSTGRES_USER: 'hub',
        POSTGRES_PASSWORD: 'hub',
        POSTGRES_DB: 'hub_unificando',
      })
      .withExposedPorts(5432)
      .start();
    const databaseUrl = `postgresql://hub:hub@${container.getHost()}:${container.getMappedPort(5432)}/hub_unificando`;

    // Wait for PostgreSQL to accept connections.
    const pool = new Pool({ connectionString: databaseUrl });
    for (let i = 0; i < 30; i += 1) {
      try {
        await pool.query('SELECT 1');
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    await pool.end();

    // Apply migrations against the container database.
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });

    // Fixture folder shaped like a sibling project.
    tempProject = await mkdtemp(join(tmpdir(), 'hub-test-'));
    await mkdir(join(tempProject, 'docs'), { recursive: true });
    await writeFile(
      join(tempProject, 'README.md'),
      '# Projeto Teste\n\nNeste documento falamos de arquitetura, endpoints REST e segurança.',
      'utf8',
    );
    await writeFile(
      join(tempProject, 'docs', 'database.md'),
      '# Banco de Dados\n\nAqui tratamos de postgresql, prisma, migrations e índices.\n\n'.repeat(12),
      'utf8',
    );

    // Point the app at disposable infra before DI builds the providers.
    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmbeddingProvider)
      .useValue(fakeEmbedding(768))
      .compile();

    prisma = moduleRef.get(PrismaService);
    orchestrator = moduleRef.get(IngestionOrchestrator);
    search = moduleRef.get(SearchService);

    // Minimal taxonomy + project targeting the temp folder.
    await prisma.category.upsert({
      where: { slug: 'database' },
      create: {
        slug: 'database',
        name: 'Banco de Dados',
        description: 'Schema e SQL',
        keywords: ['postgresql', 'prisma', 'migration'],
      },
      update: {},
    });
    await prisma.category.upsert({
      where: { slug: 'general' },
      create: { slug: 'general', name: 'Geral', description: 'Fallback', keywords: [] },
      update: {},
    });
    await prisma.project.upsert({
      where: { slug: 'test-project' },
      create: {
        slug: 'test-project',
        name: 'Test Project',
        description: '',
        folderPath: tempProject,
        tags: [],
        sourceType: 'local',
      },
      update: { folderPath: tempProject },
    });
  }, 180000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
    if (tempProject) await rm(tempProject, { recursive: true, force: true });
  });

  it('ingests files, persists chunks and embeddings, and searches them', async () => {
    const stats = await orchestrator.ingest({ projectSlug: 'test-project' }, {});
    expect(stats.documents).toBe(2);
    expect(stats.chunks).toBeGreaterThanOrEqual(2);
    expect(stats.embeddedChunks).toBe(stats.chunks);

    const docs = await prisma.document.count({ where: { projectSlug: 'test-project' } });
    expect(docs).toBe(2);

    const result = await search.search({ q: 'prisma migrations e índices', limit: 5 });
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits[0]?.projectSlug).toBe('test-project');

    // Idempotency: re-ingesting without force skips everything.
    const again = await orchestrator.ingest({ projectSlug: 'test-project' }, {});
    expect(again.skipped).toBe(2);
  });
});

/** Deterministic dims-dim fake embeddings (stable per text). */
function fakeEmbedding(dims: number): EmbeddingProvider {
  const embed = (texts: string[]): number[][] =>
    texts.map((text) => {
      const vector = new Array<number>(dims).fill(0);
      let seed = 0;
      for (let i = 0; i < text.length; i += 1) seed = (seed * 31 + text.charCodeAt(i)) | 0;
      const sign = seed % 2 === 0 ? 1 : -1;
      for (let i = 0; i < dims; i += 1) {
        vector[i] = ((i + 1) * 0.001 + (Math.abs(seed) % 100) / 100) * sign;
      }
      return normalize(vector);
    });
  return {
    embed: async (texts, options = {}) => {
      const prefixed = texts.map((text) => {
        if (options.prefix === 'query') return `query: ${text}`;
        if (options.prefix === 'passage') return `passage: ${text}`;
        return text;
      });
      return embed(prefixed);
    },
    dims: () => dims,
    isReady: () => true,
    ensureLoaded: async () => undefined,
  };
}

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}