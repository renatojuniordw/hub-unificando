import { Injectable, NotFoundException } from '@nestjs/common';
import type { Chunk, Document } from '../../generated/prisma/client.js';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import { DocumentsRepository, type DocumentWithProject } from './documents.repository';

/** Document reading business logic (used by REST, nested routes and MCP). */
@Injectable()
export class DocumentsService {
  constructor(private readonly repository: DocumentsRepository) {}

  async list(filters: {
    projectSlug?: string;
    category?: string;
    docType?: string;
    q?: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<DocumentWithProject[]>> {
    const { items, total } = await this.repository.list(filters);
    return paginate(items, total, filters.page, filters.pageSize);
  }

  /** Compact list used by project detail (first 100). */
  async listByProject(projectSlug: string): Promise<DocumentWithProject[]> {
    const { items } = await this.repository.list({
      projectSlug,
      page: 1,
      pageSize: 100,
    });
    return items;
  }

  async get(id: string): Promise<DocumentWithProject> {
    const document = await this.repository.findById(id);
    if (!document) {
      throw new NotFoundException(`Document "${id}" not found`);
    }
    return document;
  }

  async getByPath(projectSlug: string, path: string): Promise<Document | null> {
    return this.repository.findByPath(projectSlug, path);
  }

  /** Lookup by path for REST: 404 when the document does not exist. */
  async getByPathOrThrow(projectSlug: string, path: string): Promise<Document> {
    const document = await this.repository.findByPath(projectSlug, path);
    if (!document) {
      throw new NotFoundException(`Document "${path}" not found in project "${projectSlug}"`);
    }
    return document;
  }

  async chunks(documentId: string, page: number, pageSize: number): Promise<Paginated<Chunk[]>> {
    const { items, total } = await this.repository.chunks(documentId, page, pageSize);
    return paginate(items, total, page, pageSize);
  }
}
