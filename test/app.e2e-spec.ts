/**
 * Smoke e2e da API REST contra o app Nest completo (Postgres local via .env).
 * O modelo de embeddings é substituído por um fake determinístico para a
 * suíte rodar rápido; Redis fica desligado (fila inerte). Requer o Postgres
 * local de pé (docker compose up -d db).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmbeddingProvider } from '../src/infra/embedding/embedding.provider';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

process.env.REDIS_ENABLED = 'false';

describe('hub-unificando API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmbeddingProvider)
      .useValue(fakeEmbedding(768))
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health responde com sucesso e serviços ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /projects lista o registry com envelope + meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects?pageSize=3')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(7);
  });

  it('GET /projects/:slug retorna detalhe + documentos', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects/med-unificando')
      .expect(200);
    expect(res.body.data.slug).toBe('med-unificando');
    expect(res.body.data.counts.documents).toBeGreaterThan(0);
  });

  it('404 vira envelope de erro { success:false, error.code:NOT_FOUND }', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects/nao-existe')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /categories retorna a taxonomia', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(16);
  });

  it('busca híbrida devolve hits com score (params da spec)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/search')
      .query({ q: 'busca hibrida pgvector', project: 'radar-unificando', pageSize: 3 })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hits.length).toBeGreaterThan(0);
    expect(res.body.data.hits[0].score).toBeGreaterThan(0);
  });

  it('summary (target=project/document) e compare (pathA/pathB) respondem', async () => {
    const summary = await request(app.getHttpServer())
      .get('/api/v1/summary')
      .query({ target: 'project', project: 'radar-unificando' })
      .expect(200);
    expect(summary.body.data.counts.documents).toBeGreaterThan(0);

    const docSummary = await request(app.getHttpServer())
      .get('/api/v1/summary')
      .query({ target: 'document', project: 'med-unificando', path: 'docs/DATABASE.md' })
      .expect(200);
    expect(docSummary.body.data.document.path).toBe('docs/DATABASE.md');

    const compare = await request(app.getHttpServer())
      .get('/api/v1/compare')
      .query({ pathA: 'docs/DATABASE.md', pathB: 'docs/DATABASE.md', project: 'med-unificando' })
      .expect(200);
    expect(compare.body.data.duplicated).toBe(true);
  });

  it('context/export monta o pacote §12 com fontes não vazias', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/context/export')
      .query({ project: 'radar-unificando', topic: 'notificações', maxTokens: 4000 })
      .expect(200);
    const ids = res.body.data.sections.map((section: { id: string }) => section.id);
    expect(ids).toContain('fontes');
    const fontes = res.body.data.sections.find((section: { id: string }) => section.id === 'fontes');
    expect(fontes.content.length).toBeGreaterThan(0);
    expect(res.body.data.meta.totalTokens).toBeLessThan(4200);
  });

  it('POST /ingest/jobs exige admin (401 sem Authorization)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ingest/jobs')
      .send({ projectSlug: 'ui-unificando' })
      .expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

function fakeEmbedding(dims: number): EmbeddingProvider {
  const embed = (texts: string[]): number[][] =>
    texts.map((text) => {
      const vector = new Array<number>(dims).fill(0);
      let seed = 0;
      for (let i = 0; i < text.length; i += 1) seed = (seed * 31 + text.charCodeAt(i)) | 0;
      for (let i = 0; i < dims; i += 1) {
        vector[i] = ((Math.abs(seed) % 1000) / 1000 + i * 0.01) / dims;
      }
      return vector;
    });
  return {
    embed: async (texts) => embed(texts),
    dims: () => dims,
    isReady: () => true,
    ensureLoaded: async () => undefined,
  };
}