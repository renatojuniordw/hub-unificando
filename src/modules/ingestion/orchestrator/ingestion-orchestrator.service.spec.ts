import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256 } from '../repository/ingestion-write.repository';
import { IngestionOrchestrator } from './ingestion-orchestrator.service';
import type { Env } from '../../../shared/config/env';
import type { Project } from '../../../generated/prisma/client.js';
import type { IngestionScope } from '../ingestion.types';

// upsertChunkEmbeddings é um import de módulo (não DI) — mock para não tocar
// $executeRawUnsafe do prisma fake.
jest.mock('../../../infra/vector/vector.sql', () => ({
  upsertChunkEmbeddings: jest.fn(),
}));

import { upsertChunkEmbeddings } from '../../../infra/vector/vector.sql';
const upsertMock = upsertChunkEmbeddings as jest.Mock;

/** Dependencies falsas — arrow functions para evitar unbound-method no lint. */
function makeDeps() {
  const prisma = {
    project: { findMany: jest.fn() },
    document: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    decision: { deleteMany: jest.fn() },
    chunk: { findMany: jest.fn() },
  };
  const scanner = { scanFolder: jest.fn() };
  const chunkService = { chunk: jest.fn() };
  const writeRepo = {
    findByPath: jest.fn(),
    replaceDocument: jest.fn(),
    setProjectIngestedAt: jest.fn(),
    replaceDecision: jest.fn(),
  };
  const embedding = {
    embed: jest.fn(),
    dims: jest.fn(),
    isReady: jest.fn(),
    ensureLoaded: jest.fn(),
  };
  const classifier = { classify: jest.fn() };
  const env = {
    KNOWLEDGE_LIB_ROOT: '/tmp',
    HUB_SCAN_ROOT: '/tmp',
    EMBEDDING_BATCH_SIZE: 16,
  } as unknown as Env;
  return { prisma, scanner, chunkService, writeRepo, embedding, classifier, env };
}

type Deps = ReturnType<typeof makeDeps>;

function makeOrchestrator(deps: Deps): IngestionOrchestrator {
  return new IngestionOrchestrator(
    deps.prisma as never,
    deps.scanner as never,
    deps.chunkService as never,
    deps.writeRepo as never,
    deps.embedding,
    deps.classifier as never,
    deps.env,
  );
}

describe('IngestionOrchestrator', () => {
  let deps: Deps;
  let projectRoot: string;
  let project: Project;
  const content = '# Arquitetura\n\nCamadas do hub.';
  const relativePath = 'docs/arquitetura.md';

  const makeScannedFiles = () => [
    { relativePath, absolutePath: join(projectRoot, relativePath), content, size: content.length },
  ];

  beforeEach(async () => {
    deps = makeDeps();
    upsertMock.mockReset();
    projectRoot = await mkdtemp(join(tmpdir(), 'hub-orchestrator-'));
    await mkdir(join(projectRoot, 'docs'), { recursive: true });
    await writeFile(join(projectRoot, relativePath), content);
    project = {
      slug: 'test-project',
      name: 'Test Project',
      description: 'Fixture',
      repoUrl: null,
      folderPath: projectRoot,
      stack: null,
      tags: [],
      sourceType: 'local',
      enabled: true,
      surfaces: ['internal'],
      status: 'live',
      featured: false,
      lastIngestedAt: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Defaults saudáveis — os testes sobrescrevem o necessário.
    deps.scanner.scanFolder.mockResolvedValue(makeScannedFiles());
    deps.chunkService.chunk.mockReturnValue([{ heading: 'Arquitetura', content }]);
    deps.classifier.classify.mockResolvedValue({
      category: 'architecture',
      categories: ['architecture'],
    });
    deps.writeRepo.findByPath.mockResolvedValue(null);
    deps.writeRepo.replaceDocument.mockResolvedValue({
      documentId: 'doc-1',
      chunks: [{ id: 'chunk-1', content }],
    });
    deps.embedding.embed.mockResolvedValue([[0.1, 0.2, 0.3]]);
    deps.prisma.project.findMany.mockResolvedValue([project]);
    // pruneStaleDocuments roda em todo ingest não-dryRun: sem docs obsoletos.
    deps.prisma.document.findMany.mockResolvedValue([]);
  });

  describe('ingest — happy path (persist)', () => {
    it('ingesta arquivo md, gera draft, embute e persiste embeddings', async () => {
      const orchestrator = makeOrchestrator(deps);
      const scope: IngestionScope = {};
      const stats = await orchestrator.ingest(scope);

      expect(deps.prisma.project.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
        orderBy: { name: 'asc' },
      });
      expect(deps.scanner.scanFolder).toHaveBeenCalledWith(projectRoot);
      // replaceDocument chamado com draft coerente.
      const [draft] = deps.writeRepo.replaceDocument.mock.calls[0] as never as [
        Record<string, unknown>,
      ];
      expect(draft).toMatchObject({
        projectSlug: 'test-project',
        path: relativePath,
        title: 'Arquitetura',
        sourceSha: sha256(content),
        contentKind: 'MARKDOWN',
        docType: 'markdown',
      });
      expect(draft.tokenEstimate).toBe(Math.ceil(content.length / 4));
      // Embeddings gerados e persistidos via upsertChunkEmbeddings.
      expect(deps.embedding.embed).toHaveBeenCalledWith([content], { prefix: 'passage' });
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([{ id: 'chunk-1', vector: [0.1, 0.2, 0.3] }]),
      );
      expect(deps.writeRepo.setProjectIngestedAt).toHaveBeenCalledWith(
        'test-project',
        expect.any(Date),
      );

      expect(stats).toMatchObject({
        projects: 1,
        documents: 1,
        chunks: 1,
        embeddedChunks: 1,
        skipped: 0,
        errors: 0,
      });
    });

    it('não ingesta projetos sourceType manual', async () => {
      deps.prisma.project.findMany.mockResolvedValue([
        { ...project, sourceType: 'manual' as const },
      ]);
      const stats = await makeOrchestrator(deps).ingest({});
      expect(deps.scanner.scanFolder).not.toHaveBeenCalled();
      expect(stats.projects).toBe(0);
    });

    it('scope com slug filtra findMany por slug', async () => {
      await makeOrchestrator(deps).ingest({ projectSlug: 'test-project' });
      expect(deps.prisma.project.findMany).toHaveBeenCalledWith({
        where: { enabled: true, slug: 'test-project' },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('ingestFile — dedupe e forçagem', () => {
    it('pula arquivo inalterado (sourceSha igual, sem force)', async () => {
      deps.writeRepo.findByPath.mockResolvedValue({
        id: 'doc-existing',
        sourceSha: sha256(content),
      });
      const stats = await makeOrchestrator(deps).ingest({});
      expect(deps.writeRepo.replaceDocument).not.toHaveBeenCalled();
      expect(deps.embedding.embed).not.toHaveBeenCalled();
      expect(stats.skipped).toBe(1);
      expect(stats.documents).toBe(0);
    });

    it('force=true reingesta mesmo com sourceSha igual', async () => {
      deps.writeRepo.findByPath.mockResolvedValue({
        id: 'doc-existing',
        sourceSha: sha256(content),
      });
      const stats = await makeOrchestrator(deps).ingest({}, { force: true });
      expect(deps.writeRepo.replaceDocument).toHaveBeenCalled();
      expect(stats.documents).toBe(1);
    });

    it('dryRun não classifica nem persiste', async () => {
      const stats = await makeOrchestrator(deps).ingest({}, { dryRun: true });
      expect(deps.classifier.classify).not.toHaveBeenCalled();
      expect(deps.writeRepo.replaceDocument).not.toHaveBeenCalled();
      expect(upsertMock).not.toHaveBeenCalled();
      expect(deps.writeRepo.setProjectIngestedAt).not.toHaveBeenCalled();
      expect(stats.documents).toBe(1);
      expect(stats.embeddedChunks).toBe(0);
    });

    it('reset sem dryRun purga documentos e decisões antes de escanear', async () => {
      const stats = await makeOrchestrator(deps).ingest({}, { reset: true });
      expect(deps.prisma.document.deleteMany).toHaveBeenCalledWith({
        where: { projectSlug: 'test-project' },
      });
      expect(deps.prisma.decision.deleteMany).toHaveBeenCalledWith({
        where: { projectSlug: 'test-project' },
      });
      expect(stats.documents).toBe(1);
    });

    it('pruneStaleDocuments remove documentos sem arquivo correspondente', async () => {
      // scanner devolve só docs/a.md; o banco tem outro doc obsoleto.
      deps.prisma.document.findMany.mockResolvedValue([{ id: 'doc-stale' }]);
      const stats = await makeOrchestrator(deps).ingest({});
      expect(deps.prisma.document.deleteMany).toHaveBeenCalledWith({
        where: { projectSlug: 'test-project', path: { notIn: [relativePath] } },
      });
      expect(stats.errors).toBe(0);
    });
  });

  describe('falha de scan', () => {
    it('registra erro e não persiste quando scanFolder lança', async () => {
      deps.scanner.scanFolder.mockRejectedValue(new Error('permissão'));
      const stats = await makeOrchestrator(deps).ingest({});
      expect(stats).toMatchObject({ errors: 1, errorsByPath: [projectRoot] });
      expect(deps.writeRepo.replaceDocument).not.toHaveBeenCalled();
      expect(deps.writeRepo.setProjectIngestedAt).not.toHaveBeenCalled();
    });
  });
});
