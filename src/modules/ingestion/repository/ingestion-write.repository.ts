import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Document } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { ChunkRecord, DocumentDraft } from '../ingestion.types';

export interface ReplacedChunk {
  id: string;
  content: string;
}

/**
 * Write path for ingestion: replaces a document + its chunks transactionally
 * (delete on change, dedupe via sourceSha) and records job lifecycle.
 */
@Injectable()
export class IngestionWriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPath(projectSlug: string, path: string): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { projectSlug_path: { projectSlug, path } },
    });
  }

  /**
   * Removes any previous version of (projectSlug, path) and inserts the new
   * one with all chunks. Returns the new document id and the chunk id/contents
   * (needed to persist embeddings afterwards).
   */
  async replaceDocument(
    draft: DocumentDraft,
    chunks: ChunkRecord[],
  ): Promise<{ documentId: string; chunks: ReplacedChunk[] }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.document.deleteMany({
        where: { projectSlug: draft.projectSlug, path: draft.path },
      });
      const document = await tx.document.create({
        data: {
          projectSlug: draft.projectSlug,
          path: draft.path,
          title: draft.title,
          summary: draft.summary,
          lang: draft.lang,
          category: draft.category,
          categories: draft.categories,
          docType: draft.docType,
          contentKind: draft.contentKind,
          tags: draft.tags,
          publishedAt: draft.publishedAt,
          isDraft: draft.isDraft,
          sourceSha: draft.sourceSha,
          charCount: draft.charCount,
          tokenEstimate: draft.tokenEstimate,
          metadata: draft.metadata as object | undefined,
        },
      });
      const inserted = await tx.chunk.createManyAndReturn({
        data: chunks.map((chunk) => ({
          documentId: document.id,
          index: chunk.index,
          heading: chunk.heading,
          content: chunk.content,
          anchor: chunk.anchor,
          tokenCount: chunk.tokenCount,
          contentHash: chunk.contentHash,
          // index order preserved by callers; store original order explicitly
          // (createManyAndReturn preserves input order for postgres)
        })),
      });
      return {
        documentId: document.id,
        chunks: inserted.map((chunk) => ({ id: chunk.id, content: chunk.content })),
      };
    });
  }

  async setProjectIngestedAt(projectSlug: string, at: Date): Promise<void> {
    await this.prisma.project.update({
      where: { slug: projectSlug },
      data: { lastIngestedAt: at },
    });
  }

  /**
   * Upserts the Decision row backing an ADR file (docs/decisions/*.md).
   * The file is also indexed as a regular document; the Decision is the
   * structured mirror used by /decisions and LLM context packages.
   */
  async replaceDecision(input: {
    projectSlug: string;
    sourcePath: string;
    title: string;
    status: string;
    summary: string;
    content: string;
  }): Promise<void> {
    const { projectSlug, sourcePath } = input;
    await this.prisma.$transaction(async (tx) => {
      await tx.decision.deleteMany({ where: { projectSlug, sourcePath } });
      await tx.decision.create({
        data: {
          projectSlug,
          title: input.title,
          status: input.status,
          summary: input.summary,
          content: input.content,
          sourcePath,
        },
      });
    });
  }

  async createJob(kind: string, scope: object): Promise<{ id: string }> {
    const job = await this.prisma.ingestionJob.create({
      data: { kind, status: 'queued', scope },
    });
    return { id: job.id };
  }

  async markJobStarted(id: string): Promise<void> {
    await this.prisma.ingestionJob.update({
      where: { id },
      data: { status: 'running', startedAt: new Date() },
    });
  }

  async finishJob(
    id: string,
    status: 'done' | 'failed' | 'partial',
    stats: object | null,
    error: string | null,
  ): Promise<void> {
    await this.prisma.ingestionJob.update({
      where: { id },
      data: { status, stats: stats as object | undefined, error, finishedAt: new Date() },
    });
  }
}

export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
