/** Shared ingestion types. */

export interface IngestStats {
  projects: number;
  documents: number;
  chunks: number;
  embeddedChunks: number;
  skipped: number;
  errors: number;
  errorsByPath: string[];
}

export interface IngestOptions {
  force?: boolean;
  dryRun?: boolean;
}

export interface IngestionScope {
  projectSlug?: string;
}

export interface ChunkRecord {
  index: number;
  heading: string | null;
  content: string;
  anchor: string | null;
  tokenCount: number;
  contentHash: string;
}

export interface DocumentDraft {
  projectSlug: string;
  path: string;
  title: string;
  summary: string;
  lang: string | null;
  category: string;
  categories: string[];
  docType: string;
  contentKind: string | null;
  sourceSha: string;
  charCount: number;
  tokenEstimate: number;
  metadata: Record<string, unknown> | null;
}
