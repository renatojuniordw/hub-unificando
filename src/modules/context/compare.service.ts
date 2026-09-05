import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { Chunk } from '../../generated/prisma/client.js';
import { estimateTokens } from './token';

export interface CompareDocumentInfo {
  path: string;
  title: string;
  projectSlug: string;
  chars: number;
  tokens: number;
  headings: string[];
}

export interface CompareResult {
  a: CompareDocumentInfo;
  b: CompareDocumentInfo;
  similarity: {
    headingOverlap: number;
    contentOverlap: number;
    combined: number;
  };
  commonSections: Array<{ heading: string; aSnippet: string; bSnippet: string }>;
  duplicated: boolean;
}

/**
 * Compares two indexed documents by structure (headings) and content overlap.
 * Used by agents/CI to detect duplication across the ecosystem.
 */
@Injectable()
export class CompareService {
  constructor(private readonly prisma: PrismaService) {}

  async compare(aPath: string, bPath: string, projectSlug?: string): Promise<CompareResult> {
    const a = await this.findDocument(aPath, projectSlug);
    const b = await this.findDocument(bPath, projectSlug);
    if (!a) throw new NotFoundException(`Document "${aPath}" not found`);
    if (!b) throw new NotFoundException(`Document "${bPath}" not found`);

    const [aChunks, bChunks] = await Promise.all([this.chunksOf(a.id), this.chunksOf(b.id)]);

    const aHeadings = uniqueHeadings(aChunks);
    const bHeadings = uniqueHeadings(bChunks);
    const headingOverlap = overlapRatio(aHeadings, bHeadings);

    const aText = aChunks.map((chunk) => chunk.content).join(' ');
    const bText = bChunks.map((chunk) => chunk.content).join(' ');
    const contentOverlap = wordOverlap(aText, bText);

    const commonSections = commonHeadings(aChunks, bChunks);
    const combined = Math.round(headingOverlap * 0.4 + contentOverlap * 0.6 * 1000) / 1000;

    return {
      a: info(a, aChunks),
      b: info(b, bChunks),
      similarity: { headingOverlap, contentOverlap, combined },
      commonSections,
      duplicated: combined > 0.75,
    };
  }

  private findDocument(path: string, projectSlug?: string) {
    const where: Prisma.DocumentWhereInput = { path };
    if (projectSlug) where.projectSlug = projectSlug;
    return this.prisma.document.findFirst({ where });
  }

  private chunksOf(documentId: string): Promise<Chunk[]> {
    return this.prisma.chunk.findMany({
      where: { documentId },
      orderBy: { index: 'asc' },
    });
  }
}

function info(
  doc: { id: string; path: string; title: string; projectSlug: string },
  chunks: Chunk[],
) {
  const text = chunks.map((chunk) => chunk.content).join('');
  return {
    path: doc.path,
    title: doc.title,
    projectSlug: doc.projectSlug,
    chars: text.length,
    tokens: estimateTokens(text),
    headings: uniqueHeadings(chunks),
  };
}

function uniqueHeadings(chunks: Chunk[]): string[] {
  return [...new Set(chunks.map((chunk) => chunk.heading).filter((h): h is string => Boolean(h)))];
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setB = new Set(b);
  const common = a.filter((heading) => setB.has(heading)).length;
  return Math.round((common / Math.max(1, Math.max(a.length, b.length))) * 1000) / 1000;
}

function wordOverlap(a: string, b: string): number {
  const words = (text: string): Set<string> =>
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9à-ÿ]+/)
        .filter((word) => word.length > 2),
    );
  const setA = words(a);
  const setB = words(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let common = 0;
  for (const word of setA) if (setB.has(word)) common += 1;
  return Math.round((common / Math.max(setA.size, setB.size)) * 1000) / 1000;
}

function commonHeadings(
  aChunks: Chunk[],
  bChunks: Chunk[],
): Array<{ heading: string; aSnippet: string; bSnippet: string }> {
  const withHeading = (chunks: Chunk[]): Chunk[] =>
    chunks.filter((chunk) => chunk.heading !== null);
  const mapA = new Map(withHeading(aChunks).map((chunk) => [chunk.heading as string, chunk]));
  const mapB = new Map(withHeading(bChunks).map((chunk) => [chunk.heading as string, chunk]));
  const common: Array<{ heading: string; aSnippet: string; bSnippet: string }> = [];
  for (const [heading, chunkA] of mapA) {
    const chunkB = mapB.get(heading);
    if (chunkB) {
      common.push({
        heading,
        aSnippet: chunkA.content.slice(0, 200),
        bSnippet: chunkB.content.slice(0, 200),
      });
    }
  }
  return common;
}
