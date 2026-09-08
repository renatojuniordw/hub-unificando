import { Injectable } from '@nestjs/common';
import type { Category } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { queryRows } from '../../infra/prisma/raw';

export interface CategoryWithCount extends Category {
  documentCount: number;
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All categories ordered by name, with primary-category document counts. */
  async listWithCounts(): Promise<CategoryWithCount[]> {
    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    const rows = await queryRows<Array<{ category: string; count: number }>>(
      this.prisma,
      `SELECT category, COUNT(*)::int AS count
       FROM documents
       GROUP BY category`,
    );
    const counts = new Map(rows.map((r) => [r.category, r.count]));
    return categories.map((category) => ({
      ...category,
      documentCount: counts.get(category.slug) ?? 0,
    }));
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }
}
