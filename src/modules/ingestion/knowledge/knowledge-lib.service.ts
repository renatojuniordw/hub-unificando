import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../../../shared/config/env';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  resolveKnowledgeLibRoot,
  resolveProjectRoot,
  type ProjectSourceKind,
} from '../scan/project-source';
import { ScannerService } from '../scan/scanner.service';

export interface KnowledgeLibSyncResult {
  projects: number;
  filesCopied: number;
  filesRemoved: number;
  bytes: number;
  /** Per-project resolved source root (kind + path) used for the mirror. */
  roots: Record<string, { kind: ProjectSourceKind; path: string }>;
}

export interface KnowledgeLibSyncOptions {
  /** When true, only report what would change (no writes, no pruning). */
  dryRun?: boolean;
}

/**
 * Keeps the committed knowledge lib (`KNOWLEDGE_LIB_ROOT/<slug>`, one folder
 * per project slug) in sync with the sibling projects. The lib is what makes
 * the Hub autonomous — ingestion reads it on dev and on the VPS, so the
 * sibling repositories are never required at runtime.
 *
 * The mirror only covers files that pass the scanner's curated knowledge
 * scope, and prunes lib files that left that scope (docs/INGESTION.md).
 */
@Injectable()
export class KnowledgeLibService {
  private readonly logger = new Logger(KnowledgeLibService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: ScannerService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Mirrors each project's indexable files into the knowledge lib, reading
   * from the live sibling folders under HUB_SCAN_ROOT (never from the lib
   * itself). Projects whose source folder is missing are skipped with a
   * warning — a missing source must never trigger pruning.
   */
  async syncDocs(
    projectSlugs?: string[],
    options: KnowledgeLibSyncOptions = {},
  ): Promise<KnowledgeLibSyncResult> {
    const dryRun = options.dryRun ?? false;
    const projects = await this.prisma.project.findMany({
      where: {
        enabled: true,
        ...(projectSlugs && projectSlugs.length > 0 ? { slug: { in: projectSlugs } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    if (projects.length === 0) {
      throw new Error('Nenhum projeto habilitado para sincronizar');
    }

    const knowledgeLibRoot = resolveKnowledgeLibRoot(this.env.KNOWLEDGE_LIB_ROOT);
    const result: KnowledgeLibSyncResult = {
      projects: 0,
      filesCopied: 0,
      filesRemoved: 0,
      bytes: 0,
      roots: {},
    };

    for (const project of projects) {
      // Always read from the live sibling folder — never self-sync the lib.
      const source = await resolveProjectRoot(project, {
        knowledgeLibRoot,
        scanRoot: this.env.HUB_SCAN_ROOT,
        preferKnowledgeLib: false,
      });
      result.roots[project.slug] = { kind: source.kind, path: source.path };

      let sourceOk = true;
      try {
        const info = await stat(source.path);
        sourceOk = info.isDirectory();
      } catch {
        sourceOk = false;
      }
      if (!sourceOk) {
        this.logger.warn(
          `sync-docs: source for "${project.slug}" not found (${source.path}) — skipping (no pruning)`,
        );
        continue;
      }

      const scanned = await this.scanner.scanFolder(source.path);
      const destRoot = join(knowledgeLibRoot, project.slug);
      const livePaths = new Set(scanned.map((file) => file.relativePath));
      const copied = dryRun ? 0 : await this.writeMirror(scanned, destRoot);
      const removed = dryRun
        ? await this.countPrunable(destRoot, livePaths)
        : await this.pruneMirror(destRoot, livePaths);
      const bytes = scanned.reduce((total, file) => total + file.size, 0);

      result.projects += 1;
      result.filesCopied += copied;
      result.filesRemoved += removed;
      result.bytes += bytes;
      this.logger.log(
        `sync-docs${dryRun ? ' (dry-run)' : ''}: "${project.slug}" — ${copied} copied, ${removed} removed, ${scanned.length} files`,
      );
    }

    this.logger.log(
      `Knowledge lib sync complete (${dryRun ? 'dry-run' : 'written'}): ${result.projects} projects, ` +
        `${result.filesCopied} files copied, ${result.filesRemoved} files removed, ${result.bytes} bytes -> ${knowledgeLibRoot}`,
    );
    return result;
  }

  private async writeMirror(
    scanned: Awaited<ReturnType<ScannerService['scanFolder']>>,
    destRoot: string,
  ): Promise<number> {
    let copied = 0;
    for (const file of scanned) {
      const dest = join(destRoot, file.relativePath);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, file.content, 'utf8');
      copied += 1;
    }
    return copied;
  }

  /** Counts files under destRoot whose relative path is no longer live. */
  private async countPrunable(destRoot: string, livePaths: Set<string>): Promise<number> {
    const existing = await this.listFiles(destRoot);
    return existing.filter((relative) => !livePaths.has(relative)).length;
  }

  /** Removes lib files outside the live set and cleans up empty folders. */
  private async pruneMirror(destRoot: string, livePaths: Set<string>): Promise<number> {
    const existing = await this.listFiles(destRoot);
    const stale = existing.filter((relative) => !livePaths.has(relative));
    for (const relative of stale) {
      await rm(join(destRoot, relative), { force: true });
    }
    await this.removeEmptyDirs(destRoot);
    return stale.length;
  }

  /** Recursively lists files under root as POSIX paths relative to root. */
  private async listFiles(root: string): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const absolute = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(absolute);
        } else if (entry.isFile()) {
          out.push(
            absolute
              .slice(root.length + 1)
              .split(sep)
              .join('/'),
          );
        }
      }
    };
    try {
      await walk(root);
    } catch {
      // lib folder does not exist yet for this project — nothing to prune
    }
    return out;
  }

  private async removeEmptyDirs(root: string): Promise<void> {
    const walk = async (dir: string): Promise<boolean> => {
      let empty = true;
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const absolute = join(dir, entry.name);
        if (entry.isDirectory()) {
          const childEmpty = await walk(absolute);
          if (childEmpty) await rm(absolute, { recursive: true });
          else empty = false;
        } else {
          empty = false;
        }
      }
      return empty;
    };
    try {
      await walk(root);
    } catch {
      // root does not exist (nothing was created) — nothing to clean
    }
  }
}
