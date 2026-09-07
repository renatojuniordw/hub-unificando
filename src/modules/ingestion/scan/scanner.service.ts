import { access, readdir, readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { SCAN_EXCLUDED_DIRS } from '../../../shared/constants';
import { isKnowledgePath } from './knowledge-path';

export interface ScannedFile {
  /** Path relative to the project root (POSIX separators). */
  relativePath: string;
  absolutePath: string;
  content: string;
  size: number;
}

/**
 * Filesystem scanner honoring the exclusion list. Only curated "knowledge"
 * files are indexed — docs/documentation folders at any depth, README/CLAUDE/
 * AGENTS at the project root and root `prompts/`, always `.md/.mdx/.txt`
 * (see knowledge-path.ts and docs/INGESTION.md).
 */
@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  async scanFolder(folderPath: string): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    await this.walk(folderPath, '', files);
    this.logger.log(`Scanned ${files.length} indexable files in ${folderPath}`);
    return files;
  }

  private async walk(root: string, relativeDir: string, out: ScannedFile[]): Promise<void> {
    const dir = relativeDir.length === 0 ? root : join(root, relativeDir);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      this.logger.warn(
        `Skipping unreadable dir ${dir}: ${error instanceof Error ? error.message : 'error'}`,
      );
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const rel = join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        // Fixed blocklist (spec §7.2) — node_modules, builds, VCS, the Hub
        // itself and other never-indexed folders.
        if (SCAN_EXCLUDED_DIRS.includes(entry.name)) continue;
        // Any other dot-directory (e.g. .agents, .github, .vscode) is skipped.
        if (entry.name.startsWith('.')) continue;
        // Spec: `public` is only indexed when it hosts documentation
        // (a `docs`/`documentation` subfolder, e.g. a static docs site).
        if (entry.name === 'public' && !(await this.hasDocsSubdir(join(root, rel)))) {
          continue;
        }
        // Nested git repositories are separate codebases, not project docs
        // (e.g. a cloned vendor repo inside radar-unificando).
        if (await this.isNestedGitRepository(join(root, rel))) continue;
        await this.walk(root, rel, out);
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name.startsWith('.')) continue;
      const segments = rel.split(sep);
      const excluded = segments.some((segment) => SCAN_EXCLUDED_DIRS.includes(segment));
      if (excluded) continue;
      const relativePath = rel.split(sep).join('/');
      if (!isKnowledgePath(relativePath)) continue;
      const absolutePath = join(root, relativePath);
      try {
        const content = await readFile(absolutePath, 'utf8');
        out.push({ relativePath, absolutePath, content, size: content.length });
      } catch (error) {
        this.logger.warn(
          `Skipping unreadable file ${absolutePath}: ${error instanceof Error ? error.message : 'error'}`,
        );
      }
    }
  }

  /** True when a directory is a nested git checkout (contains its own .git). */
  private async isNestedGitRepository(dir: string): Promise<boolean> {
    try {
      await access(join(dir, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  /** True when a `public` dir hosts a documentation subfolder. */
  private async hasDocsSubdir(dir: string): Promise<boolean> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    return entries.some(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === 'docs' || entry.name === 'documentation' || entry.name === 'documentacao'),
    );
  }
}
