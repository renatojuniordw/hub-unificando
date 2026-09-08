import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ENV, type Env } from '../../../shared/config/env';
import { SCAN_EXCLUDED_DIRS } from '../../../shared/constants';
import type { StackEntry } from '../../projects/projects.types';

/**
 * Refreshes the project registry from the real folder layout under
 * HUB_SCAN_ROOT: discovers new sibling projects and enriches known ones with
 * metadata read from their package.json (stack + description + repo + tags).
 * The curated seed fields (enabled, sourceType, metadata) are preserved.
 */
@Injectable()
export class RegistryScanService {
  private readonly logger = new Logger(RegistryScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async discover(): Promise<{ found: number; known: number; enriched: number }> {
    const root = this.env.HUB_SCAN_ROOT;
    let found = 0;
    let known = 0;
    let enriched = 0;

    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Dot-directories (.git, .vercel, caches) are not projects.
      if (entry.name.startsWith('.')) continue;
      if (SCAN_EXCLUDED_DIRS.includes(entry.name)) continue;
      found += 1;

      const existing = await this.prisma.project.findUnique({ where: { slug: entry.name } });
      if (existing) {
        const changed = await this.enrich(entry.name, entry.name);
        if (changed) enriched += 1;
        known += 1;
        continue;
      }

      const pkg = (await this.readPackage(root, entry.name)) ?? { stack: [] };
      await this.prisma.project.upsert({
        where: { slug: entry.name },
        create: {
          slug: entry.name,
          name: pkg.name ?? entry.name,
          description: pkg.description ?? '',
          repoUrl: pkg.repoUrl,
          folderPath: entry.name,
          stack: pkg.stack,
          tags: [pkg.name ?? entry.name],
          sourceType: 'local',
        },
        update: {},
      });
      known += 1;
      this.logger.log(`Registered new project "${entry.name}"`);
    }

    this.logger.log(
      `Registry scan complete: found=${found} known=${known} enriched=${enriched} root=${root}`,
    );
    return { found, known, enriched };
  }

  /** Returns true when an existing record was updated from disk. */
  private async enrich(slug: string, folder: string): Promise<boolean> {
    const pkg = await this.readPackage(this.env.HUB_SCAN_ROOT, folder);
    if (!pkg) return false;
    try {
      await this.prisma.project.update({
        where: { slug },
        data: {
          name: pkg.name ?? undefined,
          description: pkg.description ?? undefined,
          repoUrl: pkg.repoUrl,
          stack: pkg.stack,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  private async readPackage(
    root: string,
    folder: string,
  ): Promise<{
    name?: string;
    description?: string;
    repoUrl?: string;
    stack: StackEntry[];
  } | null> {
    try {
      const raw = await readFile(join(root, folder, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw) as {
        name?: string;
        description?: string;
        repository?: { url?: string } | string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const repoUrl =
        typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url ?? undefined);
      return {
        name: pkg.name,
        description: pkg.description,
        repoUrl,
        stack: resolveStack(pkg.dependencies ?? {}, pkg.devDependencies ?? {}),
      };
    } catch {
      return null;
    }
  }
}

/** Coarse role mapping from dependency names (docs/REGISTRY). */
export function resolveStack(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
): StackEntry[] {
  const stack: StackEntry[] = [];
  const all = { ...dependencies, ...devDependencies };
  for (const [name, version] of Object.entries(all)) {
    if (!version) continue;
    stack.push({
      name,
      version: version.replace(/^[\^~]/, ''),
      role: roleFor(name, name in devDependencies),
    });
  }
  return stack.sort((a, b) => a.name.localeCompare(b.name));
}

function roleFor(name: string, isDev: boolean): string {
  if (/^(next|nuxt|astro|sveltekit)$/.test(name) || name.startsWith('@vitejs')) return 'framework';
  if (['react', 'react-dom', 'vue', 'svelte', 'vite', 'solid-js'].includes(name))
    return 'framework';
  if (
    /(tailwind|mui|emotion|framer-motion|radix|shadcn|styled-components|lucide|recharts|dnd-kit|react-helmet)/.test(
      name,
    )
  )
    return 'ui';
  if (
    /(^prisma$|@prisma|pg$|postgres|knex|typeorm|mongodb|drizzle|ioredis|redis|idb|fake-indexeddb)/.test(
      name,
    )
  )
    return 'data';
  if (/(openai|@ai-sdk|^ai$|transformers|langchain|anthropic|google-genai|gemini)/.test(name))
    return 'ai';
  if (/(pdf|canvas|sharp|docx|@react-pdf|archiver|xlsx|iconv-lite)/.test(name)) return 'native';
  if (
    /(playwright|vitest|jest|eslint|typescript|tsx|prettier|@testing-library|jsdom|eslint-config|@types\/)/.test(
      name,
    )
  )
    return 'dev';
  if (/(modelcontextprotocol|^mcp)/.test(name)) return 'mcp';
  if (isDev) return 'dev';
  return 'runtime';
}
