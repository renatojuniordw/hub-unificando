import { Injectable } from '@nestjs/common';
import type { Decision, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface DecisionListQuery {
  projectSlug?: string;
  status?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export interface DecisionListResult {
  items: Decision[];
  total: number;
}

/** Data access for ADRs / decisions (read-only in v1). */
@Injectable()
export class DecisionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: DecisionListQuery): Promise<DecisionListResult> {
    const where: Prisma.DecisionWhereInput = {};
    if (query.projectSlug) where.projectSlug = query.projectSlug;
    if (query.status) where.status = query.status;
    if (query.q && query.q.length > 0) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.decision.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { project: { select: { slug: true, name: true } } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.decision.count({ where }),
    ]);
    return { items, total };
  }

  async findById(
    id: string,
  ): Promise<(Decision & { project: { slug: string; name: string } }) | null> {
    return this.prisma.decision.findUnique({
      where: { id },
      include: { project: { select: { slug: true, name: true } } },
    });
  }
}
