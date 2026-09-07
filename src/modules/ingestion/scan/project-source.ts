import { stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

/** Where a project's content actually lives for ingestion. */
export type ProjectSourceKind = 'absolute' | 'knowledge-lib' | 'scan-root';

export interface ResolvedProjectRoot {
  kind: ProjectSourceKind;
  path: string;
}

export interface ResolveProjectRootOptions {
  /** Root of the committed knowledge lib (KNOWLEDGE_LIB_ROOT). */
  knowledgeLibRoot: string;
  /** Parent folder containing the sibling projects (HUB_SCAN_ROOT). */
  scanRoot: string;
  /** Prefer the knowledge lib over the sibling scan root (default true). */
  preferKnowledgeLib?: boolean;
}

/** Resolves a possibly-relative KNOWLEDGE_LIB_ROOT against the working dir. */
export function resolveKnowledgeLibRoot(value: string): string {
  return isAbsolute(value) ? value : join(process.cwd(), value);
}

/**
 * Three-layer source resolution for a project's files:
 * 1. An absolute `folderPath` (test fixtures) always wins.
 * 2. The committed knowledge lib folder `knowledgeLibRoot/<slug>` when it
 *    exists (preferred source — the Hub is autonomous on the VPS).
 * 3. Fallback to the sibling project folder `scanRoot/<folderPath>` (dev,
 *    before the project has been mirrored into the lib).
 */
export async function resolveProjectRoot(
  project: Pick<{ folderPath: string; slug: string }, 'folderPath' | 'slug'>,
  options: ResolveProjectRootOptions,
): Promise<ResolvedProjectRoot> {
  if (project.folderPath.startsWith('/')) {
    return { kind: 'absolute', path: project.folderPath };
  }
  const preferKnowledgeLib = options.preferKnowledgeLib !== false;
  if (preferKnowledgeLib) {
    const libPath = join(options.knowledgeLibRoot, project.slug);
    try {
      const info = await stat(libPath);
      if (info.isDirectory()) {
        return { kind: 'knowledge-lib', path: libPath };
      }
    } catch {
      // lib folder missing for this project — fall through to the scan root
    }
  }
  return { kind: 'scan-root', path: join(options.scanRoot, project.folderPath) };
}
