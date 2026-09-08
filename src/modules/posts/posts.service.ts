import { Injectable, NotFoundException } from '@nestjs/common';
import type { Document } from '../../generated/prisma/client.js';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface PostListItem {
  slug: string;
  title: string;
  summary: string;
  date: Date | null;
  tags: string[];
  projectSlug: string;
  path: string;
}

export interface PostDetail extends PostListItem {
  content: string;
  readingTime?: string;
  category: string;
  categories: string[];
}

/** Public read model for blog posts (documents with contentKind=blog-post). */
@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    tag?: string;
    project?: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<PostListItem[]>> {
    const where = {
      contentKind: 'blog-post',
      isDraft: false,
      ...(query.project ? { projectSlug: query.project } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { ingestedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          projectSlug: true,
          path: true,
          title: true,
          summary: true,
          publishedAt: true,
          tags: true,
        },
      }),
      this.prisma.document.count({ where }),
    ]);
    const data = items.map((post) => this.toListItem(post));
    return paginate(data, total, query.page, query.pageSize);
  }

  /**
   * Resolves a post by its slug (basename without extension). Any published
   * blog-post across projects can match; the slug is the file basename.
   */
  async detail(slug: string): Promise<PostDetail> {
    const document = await this.prisma.document.findFirst({
      where: {
        contentKind: 'blog-post',
        isDraft: false,
        path: this.pathForSlug(slug),
      },
    });
    if (!document) {
      throw new NotFoundException(`Post "${slug}" not found`);
    }
    const content = await this.contentFor(document);
    const metadata = (document.metadata ?? {}) as Record<string, unknown>;
    return {
      slug,
      title: document.title,
      summary: document.summary ?? '',
      date: document.publishedAt,
      tags: document.tags,
      projectSlug: document.projectSlug,
      path: document.path,
      content,
      readingTime: typeof metadata.readingTime === 'string' ? metadata.readingTime : undefined,
      category: document.category,
      categories: document.categories,
    };
  }

  private toListItem(post: {
    projectSlug: string;
    path: string;
    title: string;
    summary: string | null;
    publishedAt: Date | null;
    tags: string[];
  }): PostListItem {
    return {
      slug: this.slugFromPath(post.path),
      title: post.title,
      summary: post.summary ?? '',
      date: post.publishedAt,
      tags: post.tags,
      projectSlug: post.projectSlug,
      path: post.path,
    };
  }

  /** The document path is `src/content/blog/<slug>.md` — derive the path. */
  private pathForSlug(slug: string): string {
    // Slug may already contain the .md or be a full path fragment.
    const safe = slug.replace(/\.md$/, '');
    return `src/content/blog/${safe}.md`;
  }

  private slugFromPath(path: string): string {
    const segments = path.split('/');
    const file = segments[segments.length - 1] ?? path;
    return file.replace(/\.md$/, '');
  }

  /** Loads the raw markdown body (chunks joined by the first chunk content is
   *  not enough — reconstruct from the file chunk sequence). */
  private async contentFor(document: Document): Promise<string> {
    const chunks = await this.prisma.chunk.findMany({
      where: { documentId: document.id },
      orderBy: { index: 'asc' },
      select: { content: true },
    });
    // The document body is the chunk stream; without separators it is a fair
    // reconstruction for consumption (each chunk carries contiguous text).
    return chunks.map((chunk) => chunk.content).join('\n\n');
  }
}
