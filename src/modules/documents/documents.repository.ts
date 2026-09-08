import { Injectable } from '@nestjs/common';
import type { Chunk, Document, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface DocumentWithProject extends Document {
  project: { slug: string; name: string };
  _count?: { chunks: number };
}

export interface DocumentListQuery {
  projectSlug?: string;
  category?: string;
  docType?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export interface DocumentListResult {
  items: DocumentWithProject[];
  total: number;
}

/** Data access for documents and their chunks (read-only in v1). */
@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: DocumentListQuery): Promise<DocumentListResult> {
    const where: Prisma.DocumentWhereInput = {};
    if (query.projectSlug) where.projectSlug = query.projectSlug;
    if (query.category) where.categories = { has: query.category };
    if (query.docType) where.docType = query.docType;
    if (query.q && query.q.length > 0) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: { project: { select: { slug: true, name: true } } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<DocumentWithProject | null> {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        project: { select: { slug: true, name: true } },
        _count: { select: { chunks: true } },
      },
    });
  }

  async findByPath(projectSlug: string, path: string): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { projectSlug_path: { projectSlug, path } },
    });
  }

  async chunks(
    documentId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Chunk[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chunk.findMany({
        where: { documentId },
        orderBy: { index: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.chunk.count({ where: { documentId } }),
    ]);
    return { items, total };
  }
}
