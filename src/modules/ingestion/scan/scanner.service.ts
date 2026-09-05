import { readdir, readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import {
  INDEXABLE_EXTENSIONS,
  INDEXABLE_NAMES,
  SCAN_EXCLUDED_DIRS,
} from '../../../shared/constants';

export interface ScannedFile {
  /** Path relative to the project root (POSIX separators). */
  relativePath: string;
  absolutePath: string;
  content: string;
  size: number;
}

/**
 * Filesystem scanner honoring the exclusion list. Only markdown/txt files and
 * the special CLAUDE.md/AGENTS.md names are indexed (docs/INGESTION.md).
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
        if (SCAN_EXCLUDED_DIRS.includes(entry.name)) continue;
        await this.walk(root, rel, out);
        continue;
      }
      if (!entry.isFile()) continue;
      const segments = rel.split(sep);
      const excluded = segments.some((segment) => SCAN_EXCLUDED_DIRS.includes(segment));
      if (excluded) continue;
      if (!this.isIndexable(entry.name)) continue;
      const relativePath = rel.split(sep).join('/');
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

  private isIndexable(name: string): boolean {
    if (INDEXABLE_NAMES.has(name)) return true;
    const dot = name.lastIndexOf('.');
    if (dot <= 0) return false;
    return INDEXABLE_EXTENSIONS.has(name.slice(dot).toLowerCase());
  }
}
