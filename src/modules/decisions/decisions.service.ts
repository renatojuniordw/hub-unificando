import { Injectable, NotFoundException } from '@nestjs/common';
import type { Decision } from '../../generated/prisma/client.js';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import { DecisionsRepository } from './decisions.repository';

/** ADR reading business logic. */
@Injectable()
export class DecisionsService {
  constructor(private readonly repository: DecisionsRepository) {}

  async list(
    projectSlug: string | undefined,
    status: string | undefined,
    q: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Decision[]>> {
    const { items, total } = await this.repository.list({ projectSlug, status, q, page, pageSize });
    return paginate(items, total, page, pageSize);
  }

  async get(id: string): Promise<Decision & { project: { slug: string; name: string } }> {
    const decision = await this.repository.findById(id);
    if (!decision) {
      throw new NotFoundException(`Decision "${id}" not found`);
    }
    return decision;
  }
}
