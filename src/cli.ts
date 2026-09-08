import 'reflect-metadata';
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import * as packageJson from '../package.json';
import { AppModule } from './app.module';
import { ClassifierService } from './modules/classification/classifier.service';
import { CategoryPrototypeSeeder } from './modules/classification/prototype-seeder.service';
import { RegistryScanService } from './modules/ingestion/registry/registry-scan.service';
import { IngestionOrchestrator } from './modules/ingestion/orchestrator/ingestion-orchestrator.service';
import { countEmbeddedChunks } from './infra/vector/vector.sql';
import { RedisService } from './infra/redis/redis.service';
import { PrismaService } from './infra/prisma/prisma.service';
import { SearchService } from './modules/search/search.service';
import { ContextAssemblerService } from './modules/context/context-assembler.service';
import { CompareService } from './modules/context/compare.service';
import { SummaryService } from './modules/context/summary.service';
import { KnowledgeLibService } from './modules/ingestion/knowledge/knowledge-lib.service';

async function createContext() {
  return NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name('hub')
    .description('Unificando Hub CLI — ingest, search, context, compare, classify')
    .version(packageJson.version);

  program
    .command('status')
    .description('Registry/content overview (projects, documents, chunks, embeddings)')
    .action(async () => {
      const app = await createContext();
      try {
        const prisma = app.get(PrismaService);
        const [projects, documents, chunks, embedded] = await Promise.all([
          prisma.project.count(),
          prisma.document.count(),
          prisma.chunk.count(),
          countEmbeddedChunks(prisma),
        ]);
        console.log(
          JSON.stringify({ projects, documents, chunks, embeddedChunks: embedded }, null, 2),
        );
      } finally {
        await app.close();
      }
    });

  program
    .command('scan')
    .description('Discover sibling projects under HUB_SCAN_ROOT and refresh the registry')
    .action(async () => {
      const app = await createContext();
      try {
        const registry = app.get(RegistryScanService);
        const result = await registry.discover();
        console.log(JSON.stringify(result, null, 2));
      } finally {
        await app.close();
      }
    });

  program
    .command('list-projects')
    .description('List the project registry (slug, name, enabled, counts)')
    .action(async () => {
      const app = await createContext();
      try {
        const prisma = app.get(PrismaService);
        const projects = await prisma.project.findMany({
          orderBy: { name: 'asc' },
          select: {
            slug: true,
            name: true,
            description: true,
            repoUrl: true,
            enabled: true,
            lastIngestedAt: true,
            _count: { select: { documents: true } },
          },
        });
        console.log(JSON.stringify(projects, null, 2));
      } finally {
        await app.close();
      }
    });

  program
    .command('health')
    .description('Liveness/readiness of the local dependencies (db, redis)')
    .action(async () => {
      const app = await createContext();
      try {
        const prisma = app.get(PrismaService);
        const dbOk = await prisma
          .$queryRawUnsafe('SELECT 1')
          .then(() => true)
          .catch(() => false);
        const redisClient = app.get(RedisService).get();
        const redisOk = redisClient
          ? await redisClient
              .ping()
              .then((pong) => pong === 'PONG')
              .catch(() => false)
          : true;
        console.log(
          JSON.stringify(
            {
              status: dbOk && redisOk ? 'ok' : 'degraded',
              checks: { db: dbOk, redis: redisOk },
            },
            null,
            2,
          ),
        );
      } finally {
        await app.close();
      }
    });

  program
    .command('ingest')
    .description('Ingest one project (slug) or all enabled projects')
    .argument('[project]', 'project slug (default: all enabled)')
    .option('--force', 're-index even when the file hash is unchanged')
    .option('--dry-run', 'scan + parse only, no writes, no embeddings')
    .option('--reset', 'delete indexed docs of the target project(s) first')
    .action(
      async (
        project: string | undefined,
        opts: { force?: boolean; dryRun?: boolean; reset?: boolean },
      ) => {
        const app = await createContext();
        try {
          const orchestrator = app.get(IngestionOrchestrator);
          const stats = await orchestrator.ingest(
            { projectSlug: project },
            {
              force: opts.force ?? false,
              dryRun: opts.dryRun ?? false,
              reset: opts.reset ?? false,
            },
          );
          console.log(JSON.stringify(stats, null, 2));
        } finally {
          await app.close();
        }
      },
    );

  program
    .command('seed-categories')
    .description('Compute + persist category prototype embeddings (idempotent)')
    .option('--force', 'recompute prototypes even when already present')
    .action(async (opts: { force?: boolean }) => {
      const app = await createContext();
      try {
        const seeder = app.get(CategoryPrototypeSeeder);
        const result = await seeder.run(opts.force ?? false);
        console.log(JSON.stringify(result, null, 2));
      } finally {
        await app.close();
      }
    });

  program
    .command('reindex-embeddings')
    .description('Recompute chunk embeddings in place (model change)')
    .option('--project <slug>', 'project slug (default: all)')
    .action(async (opts: { project?: string }) => {
      const app = await createContext();
      try {
        const orchestrator = app.get(IngestionOrchestrator);
        const result = await orchestrator.reindexEmbeddings(opts.project);
        console.log(JSON.stringify(result, null, 2));
      } finally {
        await app.close();
      }
    });

  program
    .command('search')
    .description('Hybrid search (vector + keyword + fuzzy, RRF)')
    .argument('<query>', 'search query')
    .option('--project <slug>', 'restrict to a project')
    .option('--category <slug>', 'restrict to a category')
    .option('--top <n>', 'number of hits (default 10)')
    .option('--limit <n>', 'alias for --top')
    .option('--strategy <name>', 'balanced | recall | precision', 'balanced')
    .action(
      async (
        query: string,
        opts: {
          project?: string;
          category?: string;
          top?: string;
          limit?: string;
          strategy?: 'balanced' | 'recall' | 'precision';
        },
      ) => {
        const app = await createContext();
        try {
          const search = app.get(SearchService);
          const limit = Number(opts.top ?? opts.limit ?? 10);
          const result = await search.search({
            q: query,
            projectSlug: opts.project,
            category: opts.category,
            limit,
            strategy: opts.strategy ?? 'balanced',
          });
          for (const hit of result.hits) {
            console.log(
              `[${hit.projectSlug}] ${hit.title} — ${hit.path}${hit.heading ? ` (#${hit.heading})` : ''} (score ${hit.score.toFixed(4)})`,
            );
          }
          console.log(JSON.stringify({ total: result.total, hits: result.hits.length }));
        } finally {
          await app.close();
        }
      },
    );

  program
    .command('context')
    .description('Export an LLM context package for a project')
    .requiredOption('--project <slug>', 'project slug')
    .option('--topic <text>', 'focused topic')
    .option('--maxTokens <n>', 'token budget (default 6000)', '6000')
    .option('--save <file>', 'write the package to a markdown file')
    .action(
      async (opts: { project: string; topic?: string; maxTokens?: string; save?: string }) => {
        const app = await createContext();
        try {
          const assembler = app.get(ContextAssemblerService);
          const pkg = await assembler.export({
            projectSlug: opts.project,
            topic: opts.topic,
            maxTokens: Number(opts.maxTokens ?? 6000),
          });
          if (opts.save) {
            const { writeFile } = await import('node:fs/promises');
            const markdown = pkg.sections
              .map((section) => `# ${section.title}\n\n${section.content}`)
              .join('\n\n---\n\n');
            await writeFile(
              opts.save,
              `# Contexto — ${pkg.meta.projectSlug}\n\n${markdown}\n`,
              'utf8',
            );
            console.log(JSON.stringify({ saved: opts.save, totalTokens: pkg.meta.totalTokens }));
          } else {
            console.log(JSON.stringify(pkg, null, 2));
          }
        } finally {
          await app.close();
        }
      },
    );

  program
    .command('summary')
    .description('Factual summary of a project or a single document')
    .option('--project <slug>', 'project slug')
    .option('--target <project|document>', 'summary target (default: project)', 'project')
    .option('--id <id>', 'document id (target=document)')
    .option('--path <path>', 'document path (target=document)')
    .action(async (opts: { project?: string; target?: string; id?: string; path?: string }) => {
      const app = await createContext();
      try {
        const summary = app.get(SummaryService);
        const result =
          opts.target === 'document'
            ? await summary.summarizeDocument({
                id: opts.id,
                path: opts.path,
                projectSlug: opts.project,
              })
            : await summary.summarize(opts.project ?? '');
        console.log(JSON.stringify(result, null, 2));
      } finally {
        await app.close();
      }
    });

  program
    .command('compare')
    .description('Compare two documents by structure and content overlap')
    .requiredOption('--path-a <path>', 'document A path')
    .requiredOption('--path-b <path>', 'document B path')
    .option('--project <slug>', 'project scope')
    .action(async (opts: { pathA: string; pathB: string; project?: string }) => {
      const app = await createContext();
      try {
        const compare = app.get(CompareService);
        console.log(
          JSON.stringify(await compare.compare(opts.pathA, opts.pathB, opts.project), null, 2),
        );
      } finally {
        await app.close();
      }
    });

  program
    .command('classify')
    .description('Reclassify indexed documents (--project) or classify a text sample')
    .argument('[text]', 'text sample to classify (optional)')
    .option('--project <slug>', 'reclassify documents of a project (no re-embedding)')
    .action(async (text: string | undefined, opts: { project?: string }) => {
      const app = await createContext();
      try {
        const orchestrator = app.get(IngestionOrchestrator);
        if (text && !opts.project) {
          const classifier = app.get(ClassifierService);
          const result = await classifier.classify(text);
          console.log(JSON.stringify(result, null, 2));
        } else {
          // --project <slug> limits the pass; no args reclassifies everything.
          const result = await orchestrator.reclassify(opts.project);
          console.log(JSON.stringify(result, null, 2));
        }
      } finally {
        await app.close();
      }
    });

  program
    .command('sync-docs')
    .description(
      'Dev: espelha os arquivos indexáveis dos projetos irmãos para a knowledge lib (knowledge/<slug>), incluindo prompts extraídos de fontes TS mapeadas (ADR 0010). Depois rode hub ingest e commite a lib.',
    )
    .option('--project <slug>', 'sincroniza apenas um projeto')
    .option('--dry-run', 'apenas reporta o que seria copiado/removido, sem escrever')
    .action(async (opts: { project?: string; dryRun?: boolean }) => {
      const app = await createContext();
      try {
        const lib = app.get(KnowledgeLibService);
        const result = await lib.syncDocs(opts.project ? [opts.project] : undefined, {
          dryRun: opts.dryRun ?? false,
        });
        console.log(JSON.stringify(result, null, 2));
      } finally {
        await app.close();
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  console.error('hub CLI failed:', error);
  process.exit(1);
});
