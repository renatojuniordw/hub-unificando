/**
 * Standalone runner for `hub seed-categories` (also called by the CLI):
 * computes + persists category prototype embeddings.
 *
 * Usage: npm run hub -- seed-categories [--force]
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CategoryPrototypeSeeder } from '../src/modules/classification/prototype-seeder.service';

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const seeder = app.get(CategoryPrototypeSeeder);
    const result = await seeder.run(force);
    console.log(`seed-categories: ${JSON.stringify(result)}`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('seed-categories failed:', error);
  process.exit(1);
});
