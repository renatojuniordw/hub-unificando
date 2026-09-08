import { Injectable, NotFoundException } from '@nestjs/common';
import type { Category } from '../../generated/prisma/client.js';
import { CategoriesRepository, type CategoryWithCount } from './categories.repository';

/** Taxonomy business logic (read-only in v1; writes happen via seed/ADRs). */
@Injectable()
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  async list(): Promise<CategoryWithCount[]> {
    return this.repository.listWithCounts();
  }

  async get(slug: string): Promise<Category> {
    const category = await this.repository.findBySlug(slug);
    if (!category) {
      throw new NotFoundException(`Category "${slug}" not found`);
    }
    return category;
  }
}
