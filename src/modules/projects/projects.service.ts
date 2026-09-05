import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project } from '../../generated/prisma/client.js';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import type { DocumentWithProject } from '../documents/documents.repository';
import { DocumentsService } from '../documents/documents.service';
import { DecisionsService } from '../decisions/decisions.service';
import { ProjectsRepository } from './projects.repository';
import type { ProjectCounts } from './projects.types';

export interface ProjectListItem {
  slug: string;
  name: string;
  description: string;
  repoUrl: string | null;
  stack: unknown;
  tags: string[];
  enabled: boolean;
  lastIngestedAt: Date | null;
  sourceType: string;
  metadata: unknown;
  counts: ProjectCounts;
}

export interface ProjectDetail extends Project {
  counts: ProjectCounts;
  documents: DocumentWithProject[];
}

/** Registry business logic: list/detail with aggregated counts. */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly documentsService: DocumentsService,
    private readonly decisionsService: DecisionsService,
  ) {}

  async list(
    search: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<Paginated<ProjectListItem[]>> {
    const { items, total } = await this.repository.list({ search, page, pageSize });
    const counts = await this.repository.countsByProject(items.map((p) => p.slug));
    const data = items.map((project) => ({
      slug: project.slug,
      name: project.name,
      description: project.description,
      repoUrl: project.repoUrl,
      stack: project.stack,
      tags: project.tags,
      enabled: project.enabled,
      lastIngestedAt: project.lastIngestedAt,
      sourceType: project.sourceType,
      metadata: project.metadata,
      counts: counts.get(project.slug) ?? { documents: 0, chunks: 0, decisions: 0 },
    }));
    return paginate(data, total, page, pageSize);
  }

  async detail(slug: string): Promise<ProjectDetail> {
    const project = await this.repository.findBySlug(slug);
    if (!project) {
      throw new NotFoundException(`Project "${slug}" not found`);
    }
    const counts = await this.repository.countsByProject([slug]);
    const documents = await this.documentsService.listByProject(slug);
    return {
      ...project,
      counts: counts.get(slug) ?? { documents: 0, chunks: 0, decisions: 0 },
      documents,
    };
  }

  /** Convenience for other modules needing a validated project slug. */
  async getOrThrow(slug: string): Promise<Project> {
    const project = await this.repository.findBySlug(slug);
    if (!project) {
      throw new NotFoundException(`Project "${slug}" not found`);
    }
    return project;
  }

  /** Delegation used by nested routes (decisions count is part of detail). */
  getDecisionsByProject(
    projectSlug: string,
    status: string | undefined,
    page: number,
    pageSize: number,
  ) {
    return this.decisionsService.list(projectSlug, status, undefined, page, pageSize);
  }
}
