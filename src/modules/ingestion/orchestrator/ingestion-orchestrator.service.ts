import { join, basename } from 'node:path';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Project } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { upsertChunkEmbeddings } from '../../../infra/vector/vector.sql';
import { ENV, type Env } from '../../../shared/config/env';
import { EmbeddingProvider } from '../../../infra/embedding/embedding.provider';
import { ClassifierService } from '../../classification/classifier.service';
import { ChunkService } from '../chunking/chunk.service';
import { detectLanguage } from '../parsing/sections';
import { ScannerService, type ScannedFile } from '../scan/scanner.service';
import {
  IngestionWriteRepository,
  sha256,
  slugify,
} from '../repository/ingestion-write.repository';
import type { DocumentDraft, IngestOptions, IngestStats, IngestionScope } from '../ingestion.types';

/**
 * End-to-end ingestion pipeline for one or more projects:
 * discover registry → scan files → parse → chunk → classify → embed → persist.
 * Dedupe via sourceSha; re-index deletes + recreates the document.
 */
@Injectable()
export class IngestionOrchestrator {
  private readonly logger = new Logger(IngestionOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: ScannerService,
    private readonly chunkService: ChunkService,
    private readonly writeRepo: IngestionWriteRepository,
    @Inject(EmbeddingProvider) private readonly embedding: EmbeddingProvider,
    private readonly classifier: ClassifierService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async ingest(scope: IngestionScope, options: IngestOptions = {}): Promise<IngestStats> {
    const projects = await this.prisma.project.findMany({
      where: { enabled: true, ...(scope.projectSlug ? { slug: scope.projectSlug } : {}) },
      orderBy: { name: 'asc' },
    });
    if (scope.projectSlug && projects.length === 0) {
      throw new NotFoundException(`Project "${scope.projectSlug}" not found or disabled`);
    }

    const stats: IngestStats = {
      projects: projects.length,
      documents: 0,
      chunks: 0,
      embeddedChunks: 0,
      skipped: 0,
      errors: 0,
      errorsByPath: [],
    };

    for (const project of projects) {
      const projectStats = await this.ingestProject(project, options);
      stats.documents += projectStats.documents;
      stats.chunks += projectStats.chunks;
      stats.embeddedChunks += projectStats.embeddedChunks;
      stats.skipped += projectStats.skipped;
      stats.errors += projectStats.errors;
      stats.errorsByPath.push(...projectStats.errorsByPath);
    }

    this.logger.log(
      `Ingestion complete: ${stats.documents} documents, ${stats.chunks} chunks, ${stats.skipped} skipped, ${stats.errors} errors`,
    );
    return stats;
  }

  private async ingestProject(
    project: Project,
    options: IngestOptions,
  ): Promise<Omit<IngestStats, 'projects'>> {
    // Absolute folderPaths (tests/fixtures) win; relative ones resolve
    // against HUB_SCAN_ROOT (production layout).
    const folderPath = project.folderPath.startsWith('/')
      ? project.folderPath
      : join(this.env.HUB_SCAN_ROOT, project.folderPath);
    const stats = {
      documents: 0,
      chunks: 0,
      embeddedChunks: 0,
      skipped: 0,
      errors: 0,
      errorsByPath: [] as string[],
    };
    let files: ScannedFile[];
    try {
      files = await this.scanner.scanFolder(folderPath);
    } catch (error) {
      this.logger.error(
        `Project "${project.slug}" scan failed`,
        error instanceof Error ? error.stack : undefined,
      );
      return { ...stats, errors: 1, errorsByPath: [project.folderPath] };
    }

    this.logger.log(
      `Ingesting "${project.slug}" (${files.length} files, dryRun=${options.dryRun ?? false})`,
    );
    for (const file of files) {
      try {
        await this.ingestFile(project, file, options, stats);
      } catch (error) {
        stats.errors += 1;
        stats.errorsByPath.push(file.relativePath);
        this.logger.warn(
          `Failed "${project.slug}/${file.relativePath}": ${error instanceof Error ? error.message : 'error'}`,
        );
      }
    }

    if (!options.dryRun && stats.errors === 0) {
      await this.writeRepo.setProjectIngestedAt(project.slug, new Date());
    }
    return stats;
  }

  private async ingestFile(
    project: Project,
    file: ScannedFile,
    options: IngestOptions,
    stats: {
      documents: number;
      chunks: number;
      embeddedChunks: number;
      skipped: number;
      errors: number;
      errorsByPath: string[];
    },
  ): Promise<void> {
    const mode = /\.mdx?$/i.test(file.relativePath) ? ('markdown' as const) : ('txt' as const);
    const chunks = this.chunkService.chunk(mode, file.content);
    if (chunks.length === 0) return;

    const sourceSha = sha256(file.content);
    const existing = await this.writeRepo.findByPath(project.slug, file.relativePath);
    if (existing && !options.force && existing.sourceSha === sourceSha) {
      stats.skipped += 1;
      return;
    }

    const firstHeading = chunks.find((chunk) => chunk.heading)?.heading;
    const title =
      firstHeading ?? basename(file.relativePath).replace(/\.[^.]+$/, '') ?? file.relativePath;

    // The title itself carries category signal (e.g. "SEO — Unificando UI").
    const documentText = `${title}\n\n${chunks.map((chunk) => chunk.content).join('\n\n')}`.slice(
      0,
      3000,
    );
    const classification = options.dryRun
      ? { category: 'general', categories: ['general'] }
      : await this.classifier.classify(documentText);
    const summary = chunks[0]?.content.slice(0, 400) ?? '';
    const docType = mode;
    const named = basename(file.relativePath);
    const contentKind = named.startsWith('README')
      ? 'README'
      : /^(CLAUDE|AGENTS)\.md$/.test(named)
        ? 'AGENT-GUIDE'
        : mode === 'markdown'
          ? 'MARKDOWN'
          : 'TEXT';

    const draft: DocumentDraft = {
      projectSlug: project.slug,
      path: file.relativePath,
      title,
      summary,
      lang: detectLanguage(file.content),
      category: classification.category,
      categories: classification.categories,
      docType,
      contentKind,
      sourceSha,
      charCount: file.content.length,
      tokenEstimate: Math.ceil(file.content.length / 4),
      metadata: {
        headings: chunks
          .map((chunk) => chunk.heading)
          .filter((h): h is string => Boolean(h))
          .slice(0, 10),
      },
    };

    if (options.dryRun) {
      stats.documents += 1;
      stats.chunks += chunks.length;
      return;
    }

    const replaced = await this.writeRepo.replaceDocument(
      draft,
      chunks.map((chunk, index) => ({
        index,
        heading: chunk.heading,
        content: chunk.content,
        anchor: chunk.heading
          ? `${file.relativePath}#${slugify(chunk.heading)}`
          : file.relativePath,
        tokenCount: Math.ceil(chunk.content.length / 4),
        contentHash: sha256(chunk.content),
      })),
    );

    const vectors = await this.embedding.embed(
      replaced.chunks.map((chunk) => chunk.content),
      { prefix: 'passage' },
    );
    await upsertChunkEmbeddings(
      this.prisma,
      replaced.chunks.map((chunk, i) => ({ id: chunk.id, vector: vectors[i] })),
    );

    stats.documents += 1;
    stats.chunks += replaced.chunks.length;
    stats.embeddedChunks += replaced.chunks.length;
  }
}
