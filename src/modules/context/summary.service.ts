import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { queryRows } from '../../infra/prisma/raw';

export interface ProjectSummary {
  project: {
    slug: string;
    name: string;
    description: string;
    repoUrl: string | null;
    tags: string[];
    lastIngestedAt: Date | null;
  };
  counts: {
    documents: number;
    chunks: number;
    decisions: number;
    embeddedChunks: number;
  };
  categories: Array<{ slug: string; count: number }>;
  recentDocuments: Array<{ title: string; path: string; updatedAt: Date }>;
}

/** Factual project summary: counts, category distribution, recent activity. */
@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Contextual summary of a single document (REST /summary?target=document). */
  async summarizeDocument(input: { id?: string; path?: string; projectSlug?: string }): Promise<{
    document: {
      id: string;
      title: string;
      path: string;
      projectSlug: string;
      category: string;
      categories: string[];
      contentKind: string | null;
      summary: string | null;
    };
    counts: { chunks: number };
    headings: string[];
  }> {
    const document = input.id
      ? await this.prisma.document.findUnique({ where: { id: input.id } })
      : input.path
        ? await this.prisma.document.findFirst({
            where: { path: input.path, projectSlug: input.projectSlug ?? undefined },
          })
        : null;
    if (!document) {
      throw new NotFoundException(
        input.id ? `Document "${input.id}" not found` : `Document "${input.path}" not found`,
      );
    }
    const [chunkCount, chunkHeadings] = await Promise.all([
      this.prisma.chunk.count({ where: { documentId: document.id } }),
      this.prisma.chunk.findMany({
        where: { documentId: document.id, heading: { not: null } },
        orderBy: { index: 'asc' },
        select: { heading: true },
      }),
    ]);
    return {
      document: {
        id: document.id,
        title: document.title,
        path: document.path,
        projectSlug: document.projectSlug,
        category: document.category,
        categories: document.categories,
        contentKind: document.contentKind,
        summary: document.summary,
      },
      counts: { chunks: chunkCount },
      headings: chunkHeadings.map((chunk) => chunk.heading as string),
    };
  }

  async summarize(projectSlug: string): Promise<ProjectSummary> {
    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) {
      throw new NotFoundException(`Project "${projectSlug}" not found`);
    }

    const [documents, chunks, decisions, embeddedChunks, recentDocuments] = await Promise.all([
      this.prisma.document.count({ where: { projectSlug } }),
      this.prisma.chunk.count({ where: { document: { projectSlug } } }),
      this.prisma.decision.count({ where: { projectSlug } }),
      queryRows<Array<{ count: number }>>(
        this.prisma,
        `SELECT COUNT(*)::int AS count
         FROM chunks c JOIN documents d ON d.id = c."documentId"
         WHERE d."projectSlug" = $1 AND c.embedding IS NOT NULL`,
        projectSlug,
      ),
      this.prisma.document.findMany({
        where: { projectSlug },
        orderBy: { updatedAt: 'desc' },
        select: { title: true, path: true, updatedAt: true },
        take: 5,
      }),
    ]);

    const categoryRows = await queryRows<Array<{ category: string; count: number }>>(
      this.prisma,
      `SELECT category, COUNT(*)::int AS count FROM documents WHERE "projectSlug" = $1 GROUP BY category ORDER BY count DESC LIMIT 8`,
      projectSlug,
    );

    return {
      project: {
        slug: project.slug,
        name: project.name,
        description: project.description,
        repoUrl: project.repoUrl,
        tags: project.tags,
        lastIngestedAt: project.lastIngestedAt,
      },
      counts: {
        documents,
        chunks,
        decisions,
        embeddedChunks: embeddedChunks[0]?.count ?? 0,
      },
      categories: categoryRows.map((row) => ({ slug: row.category, count: row.count })),
      recentDocuments,
    };
  }
}
