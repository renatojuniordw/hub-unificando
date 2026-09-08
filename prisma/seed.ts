/**
 * Database seed: categories (taxonomy) + projects (registry).
 * Run with `npm run prisma:seed` (tsx) or on Docker first boot.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CATEGORY_SEEDS } from './seed/categories.js';
import { FINAL_REGISTRY_SEEDS as REGISTRY_SEEDS } from './seed/registry.js';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://hub:hub@localhost:11022/hub_unificando';

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  for (const category of CATEGORY_SEEDS) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        keywords: category.keywords,
      },
    });
  }

  for (const { slug, metadata, ...data } of REGISTRY_SEEDS) {
    const record = { slug, ...data, metadata: metadata as object | undefined };
    await prisma.project.upsert({
      where: { slug },
      create: record,
      update: {
        name: data.name,
        description: data.description,
        repoUrl: data.repoUrl,
        folderPath: data.folderPath,
        stack: data.stack as unknown as object,
        tags: data.tags,
        sourceType: data.sourceType,
        enabled: data.enabled ?? true,
        surfaces: data.surfaces,
        status: data.status,
        featured: data.featured,
        metadata: metadata as object | undefined,
      },
    });
  }

  console.log(
    `Seed complete: ${CATEGORY_SEEDS.length} categories, ${REGISTRY_SEEDS.length} projects.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
