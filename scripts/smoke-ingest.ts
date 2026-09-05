/**
 * Smoke test for CI/local: ingests a project (default: all) with the real
 * model and fails (exit 1) when any file errors. Prints ingestion stats.
 *
 * Usage: node dist/scripts/smoke-ingest.js [projectSlug] [--force]
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IngestionOrchestrator } from '../src/modules/ingestion/orchestrator/ingestion-orchestrator.service';

async function main(): Promise<void> {
  const project =
    process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : undefined;
  const force = process.argv.includes('--force');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: project ? ['log', 'warn', 'error'] : ['warn', 'error'],
  });
  try {
    const orchestrator = app.get(IngestionOrchestrator);
    const stats = await orchestrator.ingest({ projectSlug: project }, { force });
    console.log(JSON.stringify(stats));
    if (stats.errors > 0) {
      console.error('Smoke ingestion FAILED with errors:', stats.errorsByPath.join(', '));
      process.exitCode = 1;
    }
    if (stats.documents === 0 && stats.chunks === 0 && stats.skipped === 0) {
      console.error('Smoke ingestion produced no indexed content');
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('smoke-ingest failed:', error);
  process.exit(1);
});
