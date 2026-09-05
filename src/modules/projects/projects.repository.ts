import { Injectable } from '@nestjs/common';
import type { Project } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { queryRows } from '../../infra/prisma/raw';
import type { ProjectCounts } from './projects.types';

interface DocumentCountRow {
  projectSlug: string;
  documents: number;
  chunks: number;
}

interface DecisionCountRow {
  projectSlug: string;
  decisions: number;
}

export interface ProjectListQuery {
  search?: string;
  page: number;
  pageSize: number;
}

export interface ProjectListResult {
  items: Project[];
  total: number;
}

/** Data access for the project registry (read-only in v1). */
@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProjectListQuery): Promise<ProjectListResult> {
    const where =
      query.search != null && query.search.length > 0
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
              { slug: { contains: query.search, mode: 'insensitive' as const } },
              { tags: { has: query.search } },
            ],
          }
        : undefined;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total };
  }

  async findBySlug(slug: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { slug } });
  }

  /** Aggregated content counts per project slug (documents/chunks/decisions). */
  async countsByProject(slugs: string[]): Promise<Map<string, ProjectCounts>> {
    const counts = new Map<string, ProjectCounts>();
    for (const slug of slugs) {
      counts.set(slug, { documents: 0, chunks: 0, decisions: 0 });
    }
    if (slugs.length === 0) return counts;

    const docRows = await queryRows<DocumentCountRow[]>(
      this.prisma,
      `SELECT d."projectSlug",
              COUNT(DISTINCT d.id)::int AS documents,
              COUNT(c.id)::int AS chunks
       FROM documents d
       LEFT JOIN chunks c ON c."documentId" = d.id
       WHERE d."projectSlug" = ANY($1::text[])
       GROUP BY d."projectSlug"`,
      slugs,
    );

    const decisionRows = await queryRows<DecisionCountRow[]>(
      this.prisma,
      `SELECT "projectSlug", COUNT(*)::int AS decisions
       FROM decisions
       WHERE "projectSlug" = ANY($1::text[])
       GROUP BY "projectSlug"`,
      slugs,
    );

    for (const row of docRows) {
      const entry = counts.get(row.projectSlug);
      if (entry) {
        entry.documents = row.documents;
        entry.chunks = row.chunks;
      }
    }
    for (const row of decisionRows) {
      const entry = counts.get(row.projectSlug);
      if (entry) entry.decisions = row.decisions;
    }
    return counts;
  }
}
