import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { queryRows } from '../../infra/prisma/raw';
import { upsertCategoryPrototypes } from '../../infra/vector/vector.sql';
import { EmbeddingProvider } from '../../infra/embedding/embedding.provider';

/**
 * Computes and persists category prototype embeddings from the seeded
 * taxonomy (anchor = metadata.anchor, or name + description). Idempotent;
 * run via `npm run hub -- seed-categories` (or `scripts/seed-categories.ts`).
 */
@Injectable()
export class CategoryPrototypeSeeder {
  private readonly logger = new Logger(CategoryPrototypeSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EmbeddingProvider) private readonly embedding: EmbeddingProvider,
  ) {}

  async run(force = false): Promise<{ seeded: number }> {
    const categories = await this.prisma.category.findMany();
    if (categories.length === 0) {
      throw new Error('No categories found — run prisma:seed first');
    }

    if (!force) {
      const rows = await queryRows<Array<{ count: number }>>(
        this.prisma,
        'SELECT COUNT(*)::int AS count FROM categories WHERE prototype IS NOT NULL',
      );
      const existing = rows[0]?.count ?? 0;
      if (existing > 0) {
        this.logger.log(`Skipping prototype seeding (${existing} prototypes already present)`);
        return { seeded: 0 };
      }
    }

    const texts = categories.map((category) => {
      const anchor =
        category.metadata && typeof category.metadata === 'object' && 'anchor' in category.metadata
          ? (category.metadata as { anchor?: unknown }).anchor
          : undefined;
      return typeof anchor === 'string' ? anchor : `${category.name}. ${category.description}`;
    });
    const vectors = await this.embedding.embed(texts, { prefix: 'passage' });
    await upsertCategoryPrototypes(
      this.prisma,
      categories.map((category, i) => ({ slug: category.slug, vector: vectors[i] })),
    );
    this.logger.log(`Seeded ${categories.length} category prototype embeddings`);
    return { seeded: categories.length };
  }
}
