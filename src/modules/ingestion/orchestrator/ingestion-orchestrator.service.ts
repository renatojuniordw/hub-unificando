import { basename } from 'node:path';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma, Project } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { upsertChunkEmbeddings } from '../../../infra/vector/vector.sql';
import { ENV, type Env } from '../../../shared/config/env';
import { EmbeddingProvider } from '../../../infra/embedding/embedding.provider';
import { ClassifierService } from '../../classification/classifier.service';
import { applyPathSpecialization } from '../../classification/path-specialization';
import { ChunkService } from '../chunking/chunk.service';
import { detectLanguage } from '../parsing/sections';
import { parseFrontmatter } from '../parsing/frontmatter';
import { resolveKnowledgeLibRoot, resolveProjectRoot } from '../scan/project-source';
import { ScannerService, type ScannedFile } from '../scan/scanner.service';

/** Parses a blog frontmatter `date` (YYYY-MM-DD or full ISO); null when invalid. */
function parseBlogDate(raw: string): Date | null {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

const isBlogRelativePath = (path: string): boolean =>
  path.startsWith('src/content/blog/') && path.replace(/\\/g, '/').split('/').length === 4;
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
      // Manual registry entries (portfolio case studies, clients) have no
      // filesystem folder — they are display-only and never ingested.
      where: { enabled: true, ...(scope.projectSlug ? { slug: scope.projectSlug } : {}) },
      orderBy: { name: 'asc' },
    });
    const projectsToIngest = projects.filter((project) => project.sourceType !== 'manual');
    if (scope.projectSlug && projects.length === 0) {
      throw new NotFoundException(`Project "${scope.projectSlug}" not found or disabled`);
    }

    const stats: IngestStats = {
      projects: projectsToIngest.length,
      documents: 0,
      chunks: 0,
      embeddedChunks: 0,
      skipped: 0,
      errors: 0,
      errorsByPath: [],
    };

    for (const project of projectsToIngest) {
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
    // Absolute folderPaths (tests/fixtures) win; relative ones resolve to the
    // committed knowledge lib (KNOWLEDGE_LIB_ROOT/<slug>) when mirrored there,
    // otherwise fall back to the sibling projects under HUB_SCAN_ROOT.
    const source = await resolveProjectRoot(project, {
      knowledgeLibRoot: resolveKnowledgeLibRoot(this.env.KNOWLEDGE_LIB_ROOT),
      scanRoot: this.env.HUB_SCAN_ROOT,
    });
    const stats = {
      documents: 0,
      chunks: 0,
      embeddedChunks: 0,
      skipped: 0,
      errors: 0,
      errorsByPath: [] as string[],
    };
    if (options.reset && !options.dryRun) {
      await this.prisma.document.deleteMany({ where: { projectSlug: project.slug } });
      await this.prisma.decision.deleteMany({ where: { projectSlug: project.slug } });
      this.logger.log(`Reset: purged all indexed documents of "${project.slug}"`);
    }

    let files: ScannedFile[];
    try {
      files = await this.scanner.scanFolder(source.path);
    } catch (error) {
      this.logger.error(
        `Project "${project.slug}" scan failed`,
        error instanceof Error ? error.stack : undefined,
      );
      return { ...stats, errors: 1, errorsByPath: [source.path] };
    }

    this.logger.log(
      `Ingesting "${project.slug}" from ${source.kind} (${files.length} files, dryRun=${options.dryRun ?? false})`,
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

    if (!options.dryRun) {
      // Remove documents (and their Decision mirrors) whose files no longer
      // exist on disk — e.g. after scanner exclusions change.
      await this.pruneStaleDocuments(
        project.slug,
        files.map((file) => file.relativePath),
      );
      if (stats.errors === 0) {
        await this.writeRepo.setProjectIngestedAt(project.slug, new Date());
      }
    }
    return stats;
  }

  private async pruneStaleDocuments(projectSlug: string, livePaths: string[]): Promise<void> {
    if (livePaths.length === 0) return;
    const staleDocuments = await this.prisma.document.findMany({
      where: { projectSlug, path: { notIn: livePaths } },
      select: { id: true },
    });
    if (staleDocuments.length > 0) {
      await this.prisma.document.deleteMany({
        where: { projectSlug, path: { notIn: livePaths } },
      });
      await this.prisma.decision.deleteMany({
        where: { projectSlug, sourcePath: { notIn: livePaths } },
      });
      this.logger.log(`Project "${projectSlug}": purged ${staleDocuments.length} stale documents`);
    }
  }

  /**
   * Removes a previously-published blog document whose file is no longer a
   * publishable post (became a draft, lost title/date frontmatter, or has an
   * unparseable date) — the draft/sketch must stop being served.
   */
  private async purgeUnpublishableBlogFile(
    projectSlug: string,
    path: string,
    options: IngestOptions,
  ): Promise<void> {
    if (options.dryRun) return;
    const existing = await this.prisma.document.findUnique({
      where: { projectSlug_path: { projectSlug, path } },
      select: { id: true, contentKind: true },
    });
    if (existing && existing.contentKind === 'blog-post') {
      await this.prisma.document.deleteMany({ where: { projectSlug, path } });
      this.logger.log(`Removed unpublishable blog document "${projectSlug}/${path}"`);
    }
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

    // Path specialization (spec §8.2.5) wins over the classifier primary label.
    const pathRule = applyPathSpecialization(file.relativePath, documentText);
    const category = pathRule?.category ?? classification.category;
    const categories = pathRule
      ? pathRule.categories && pathRule.categories.length > 0
        ? pathRule.categories
        : pathRule.mergeSemantic
          ? Array.from(new Set([pathRule.category, ...classification.categories]))
          : [pathRule.category]
      : classification.categories;

    const summary = chunks[0]?.content.slice(0, 400) ?? '';
    const docType = mode;
    const named = basename(file.relativePath);

    // Blog posts (portfolio-ui `src/content/blog/*.md`) carry their own title,
    // date, tags and reading time in frontmatter. A file that is not a real
    // post (no title+date) is skipped entirely — drafts are never embedded.
    // A published post that becomes a draft stops being exposed: the existing
    // document is removed (see purgeUnpublishableBlogFile).
    const isBlogPath = isBlogRelativePath(file.relativePath);
    const frontmatter = isBlogPath ? parseFrontmatter(file.content) : null;
    const isBlogPost = frontmatter?.hasFrontmatter === true && isBlogPath;

    // Non-post or draft blog files are never indexed; any previously published
    // document for this path is removed so the draft/sketch stops being served.
    if (isBlogPath && (!isBlogPost || frontmatter?.draft === true || !frontmatter?.date)) {
      await this.purgeUnpublishableBlogFile(project.slug, file.relativePath, options);
      this.logger.log(
        `Skipping "${file.relativePath}": ${isBlogPost ? 'draft' : 'no title+date frontmatter'} post (never embedded/exposed)`,
      );
      stats.skipped += 1;
      return;
    }

    let contentKind = named.startsWith('README')
      ? 'README'
      : /^(CLAUDE|AGENTS)\.md$/.test(named)
        ? 'AGENT-GUIDE'
        : pathRule?.category === 'prompt'
          ? 'PROMPT'
          : mode === 'markdown'
            ? 'MARKDOWN'
            : 'TEXT';
    if (isBlogPost) contentKind = 'blog-post';

    const publishedAt = isBlogPost && frontmatter?.date ? parseBlogDate(frontmatter.date) : null;
    if (isBlogPost && publishedAt === null) {
      this.logger.warn(`Skipping "${file.relativePath}": blog post date is not parseable`);
      stats.skipped += 1;
      return;
    }
    const isDraft = false; // drafts already skipped above

    const metadata = {
      headings: chunks
        .map((chunk) => chunk.heading)
        .filter((h): h is string => Boolean(h))
        .slice(0, 10),
      ...(isBlogPost && frontmatter?.readingTime ? { readingTime: frontmatter.readingTime } : {}),
      ...(pathRule?.metadata ?? {}),
    };

    const draft: DocumentDraft = {
      projectSlug: project.slug,
      path: file.relativePath,
      title: isBlogPost && frontmatter?.title ? frontmatter.title : title,
      summary: isBlogPost && frontmatter?.description ? frontmatter.description : summary,
      lang: detectLanguage(file.content),
      // Category follows the normal classifier; blog-ness is carried by
      // contentKind="blog-post" (the canonical signal for filters/endpoints).
      category,
      categories: isBlogPost
        ? Array.from(new Set([...categories, ...(frontmatter?.tags ?? [])]))
        : categories,
      docType,
      contentKind,
      tags: frontmatter?.tags ?? [],
      publishedAt,
      isDraft,
      sourceSha,
      charCount: file.content.length,
      tokenEstimate: Math.ceil(file.content.length / 4),
      metadata,
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

    // ADR files (docs/decisions/*.md) are also mirrored into Decision rows.
    if (this.isAdrPath(file.relativePath)) {
      const adr = this.parseAdr(file.content, file.relativePath);
      await this.writeRepo.replaceDecision({
        projectSlug: project.slug,
        sourcePath: file.relativePath,
        title: adr.title,
        status: adr.status,
        summary: adr.summary,
        content: file.content,
      });
    }
  }

  /**
   * Re-runs the classifier (+ path rules) over already indexed documents
   * without touching chunk content or embeddings — `hub classify`.
   */
  async reclassify(projectSlug?: string): Promise<{
    projects: number;
    documents: number;
    updated: number;
    unchanged: number;
  }> {
    const where = projectSlug ? { projectSlug } : {};
    const docs = await this.prisma.document.findMany({
      where,
      select: {
        id: true,
        projectSlug: true,
        path: true,
        title: true,
        category: true,
        categories: true,
        metadata: true,
        chunks: { select: { content: true }, orderBy: { index: 'asc' as const } },
      },
    });
    let updated = 0;
    for (const doc of docs) {
      const text = `${doc.title}\n\n${doc.chunks.map((c) => c.content).join('\n\n')}`.slice(
        0,
        3000,
      );
      const classification = await this.classifier.classify(text);
      const pathRule = applyPathSpecialization(doc.path, text);
      const category = pathRule?.category ?? classification.category;
      const categories = pathRule
        ? pathRule.categories && pathRule.categories.length > 0
          ? pathRule.categories
          : pathRule.mergeSemantic
            ? Array.from(new Set([pathRule.category, ...classification.categories]))
            : [pathRule.category]
        : classification.categories;
      const metadata = {
        ...((doc.metadata as Record<string, unknown> | null) ?? {}),
        ...(pathRule?.metadata ?? {}),
      } as Prisma.InputJsonValue;
      if (
        doc.category === category &&
        JSON.stringify(doc.categories) === JSON.stringify(categories) &&
        JSON.stringify(doc.metadata ?? {}) === JSON.stringify(metadata)
      ) {
        continue;
      }
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { category, categories, metadata },
      });
      updated += 1;
    }
    return {
      projects: new Set(docs.map((d) => d.projectSlug)).size,
      documents: docs.length,
      updated,
      unchanged: docs.length - updated,
    };
  }

  /** Recomputes chunk embeddings in place — `hub reindex-embeddings`. */
  async reindexEmbeddings(
    projectSlug?: string,
  ): Promise<{ chunks: number; embeddedChunks: number }> {
    const chunks = await this.prisma.chunk.findMany({
      where: projectSlug ? { document: { projectSlug } } : undefined,
      select: { id: true, content: true },
      orderBy: { documentId: 'asc' as const },
    });
    const batchSize = this.env.EMBEDDING_BATCH_SIZE;
    let embeddedChunks = 0;
    for (let offset = 0; offset < chunks.length; offset += batchSize) {
      const batch = chunks.slice(offset, offset + batchSize);
      const vectors = await this.embedding.embed(
        batch.map((chunk) => chunk.content),
        { prefix: 'passage' },
      );
      await upsertChunkEmbeddings(
        this.prisma,
        batch.map((chunk, i) => ({ id: chunk.id, vector: vectors[i] })),
      );
      embeddedChunks += batch.length;
    }
    return { chunks: chunks.length, embeddedChunks };
  }

  private isAdrPath(relativePath: string): boolean {
    const norm = relativePath.replace(/\\/g, '/').toLowerCase();
    return norm.endsWith('.md') && (norm.includes('/decisions/') || norm.startsWith('decisions/'));
  }

  private parseAdr(
    content: string,
    relativePath: string,
  ): { title: string; status: 'accepted' | 'superseded' | 'proposed'; summary: string } {
    const titleMatch = /^#\s+(.+)$/m.exec(content);
    const title = titleMatch?.[1]?.trim() ?? basename(relativePath).replace(/\.[^.]+$/, '');
    const statusMatch = /^\s*(?:status|estado)\s*[:：-]\s*(\w+)/im.exec(content);
    const raw = statusMatch?.[1]?.toLowerCase() ?? 'accepted';
    const status = raw === 'superseded' || raw === 'proposed' ? raw : 'accepted';
    const body = content.replace(/^#\s+.+$/m, '').trim();
    const summary = body
      .split(/\n{2,}/)
      .slice(0, 2)
      .join('\n\n')
      .slice(0, 400);
    return { title, status, summary };
  }
}
