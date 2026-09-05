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
    let bufferSize = 0;

    const flush = (): void => {
      if (bufferSize === 0) return;
      chunks.push({ heading: bufferHeading, content: buffer.join('\n\n').trim() });
      buffer = [];
      bufferSize = 0;
      bufferHeading = null;
    };

    for (const section of sections) {
      const heading = section.headingLineage.join(' > ') || null;
      const trimmed = section.content;
      if (trimmed.length === 0) continue;

      if (trimmed.length > this.maxChars && bufferSize === 0) {
        // Single oversized section: split by paragraphs with overlap.
        const parts = this.splitLongSection(trimmed);
        for (const part of parts) {
          chunks.push({ heading, content: part });
        }
        continue;
      }

      if (bufferSize > 0 && bufferSize + trimmed.length > this.maxChars) {
        flush();
      }

      if (bufferSize === 0) {
        bufferHeading = heading;
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
      if (buffer.length > 0 && buffer.length + paragraph.length + 2 > this.maxChars) {
        parts.push(buffer.trim());
        // overlap: carry the tail of the previous buffer forward
        const overlap = buffer.slice(-this.overlap);
        buffer = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
      } else {
        buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      }
    }
    if (buffer.trim().length > 0) parts.push(buffer.trim());
    return parts;
  }
}