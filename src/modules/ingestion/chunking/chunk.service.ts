import { Injectable } from '@nestjs/common';
import { CHUNK_OVERLAP_CHARS, CHUNK_TARGET_MAX_CHARS } from '../../../shared/constants';
import { parseMarkdownSections, parsePlainText } from '../parsing/sections';

export interface ChunkOutput {
  heading: string | null;
  content: string;
}

export type ChunkMode = 'markdown' | 'txt';

/**
 * Markdown-aware chunker. Sections are assembled into 800-1500 char chunks,
 * preferring heading boundaries. Long sections are split on paragraph
 * boundaries with a configurable overlap.
 */
@Injectable()
export class ChunkService {
  private readonly maxChars = CHUNK_TARGET_MAX_CHARS;
  private readonly overlap = CHUNK_OVERLAP_CHARS;

  chunk(mode: ChunkMode, text: string): ChunkOutput[] {
    const sections = mode === 'markdown' ? parseMarkdownSections(text) : parsePlainText(text);
    const chunks: ChunkOutput[] = [];
    let buffer: string[] = [];
    let bufferHeading: string | null = null;
    let bufferTopHeading: string | null = null;
    let bufferSize = 0;

    const flush = (): void => {
      if (bufferSize === 0) return;
      chunks.push({ heading: bufferHeading, content: buffer.join('\n\n').trim() });
      buffer = [];
      bufferSize = 0;
      bufferHeading = null;
      bufferTopHeading = null;
    };

    for (const section of sections) {
      const heading = section.headingLineage.join(' > ') || null;
      const topHeading = section.headingLineage[0] ?? null;
      const trimmed = section.content;
      if (trimmed.length === 0) continue;

      // Flush first whenever the section would overflow the current buffer.
      if (bufferSize > 0 && bufferSize + trimmed.length > this.maxChars) {
        flush();
      }

      // Never mix two top-level (H1) documents into the same chunk. Sections
      // share a chunk only while their top-level heading is identical.
      if (bufferSize > 0 && topHeading !== bufferTopHeading) {
        flush();
      }

      if (trimmed.length > this.maxChars && bufferSize === 0) {
        // Oversized section: split on paragraph boundaries with overlap.
        const parts = this.splitLongSection(trimmed);
        for (const part of parts) {
          chunks.push({ heading, content: part });
        }
        continue;
      }

      if (bufferSize === 0) {
        bufferHeading = heading;
        bufferTopHeading = topHeading;
      }
      buffer.push(trimmed);
      bufferSize += trimmed.length;
    }
    flush();

    // Post-processing: drop sections smaller than min when the previous chunk
    // has room? Keep as-is: heading-boundary chunks may be short by design.
    return chunks;
  }

  private splitLongSection(content: string): string[] {
    const paragraphs = content.split(/\n{2,}/);
    const parts: string[] = [];
    let buffer = '';
    for (const paragraph of paragraphs) {
      // A single paragraph longer than the ceiling is hard-split by
      // characters (with overlap) — otherwise the chunk would exceed
      // maxChars no matter the paragraph boundaries.
      for (const piece of this.splitOversizedParagraph(paragraph)) {
        if (buffer.length > 0 && buffer.length + piece.length + 2 > this.maxChars) {
          parts.push(buffer.trim());
          // overlap: carry the tail of the previous buffer forward
          const overlap = buffer.slice(-this.overlap);
          buffer = overlap ? `${overlap}\n\n${piece}` : piece;
        } else {
          buffer = buffer ? `${buffer}\n\n${piece}` : piece;
        }
      }
    }
    if (buffer.trim().length > 0) parts.push(buffer.trim());
    return parts;
  }

  private splitOversizedParagraph(paragraph: string): string[] {
    if (paragraph.length <= this.maxChars) return [paragraph];
    const pieces: string[] = [];
    let start = 0;
    while (start < paragraph.length) {
      pieces.push(paragraph.slice(start, start + this.maxChars));
      start += this.maxChars - this.overlap;
    }
    return pieces;
  }
}
