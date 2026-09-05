import type { PrismaService } from '../prisma/prisma.service.js';
import { queryRows } from '../prisma/raw.js';

/**
 * Raw SQL access to vector/tsvector/trigram columns (declared as
 * `Unsupported(...)` in the Prisma schema, so they are only ever touched
 * through raw SQL — same pattern as med-unificando).
 *
 * All values are bound as parameters — no user input is ever concatenated
 * into SQL text. Numeric/slug values are validated upstream (DTOs / zod).
 */

export interface VectorSearchFilters {
  projectSlug?: string;
  categories?: string[];
  docType?: string;
  minScore?: number;
  topK: number;
}

export interface ChunkHitRow {
  chunkId: string;
  documentId: string;
  projectSlug: string;
  path: string;
  title: string;
  heading: string | null;
  anchor: string | null;
  content: string;
  tokenCount: number;
  categories: string[];
  docType: string;
  score: number;
}

const CHUNK_SELECT = `
  c.id AS "chunkId",
  c."documentId",
  d."projectSlug",
  d.path,
  d.title,
  c.heading,
  c.anchor,
  c.content,
  c."tokenCount",
  d.categories,
  d."docType"
`;

interface FilterSql {
  where: string;
  minScoreClause: string;
  limitIndex: number;
}

/**
 * Builds the filter WHERE + min-score clause. `params` receives the bound
 * values; numbering starts at `startIndex` (after the search-value param).
 */
function filterSql(
  filters: VectorSearchFilters,
  params: unknown[],
  scoreExpr: string,
  startIndex: number,
): FilterSql {
  const clauses: string[] = [];
  let i = startIndex;
  if (filters.projectSlug) {
    params.push(filters.projectSlug);
    clauses.push(`d."projectSlug" = $${i}`);
    i += 1;
  }
  if (filters.categories && filters.categories.length > 0) {
    params.push(filters.categories);
    clauses.push(`d.categories && $${i}::text[]`);
    i += 1;
  }
  if (filters.docType) {
    params.push(filters.docType);
    clauses.push(`d."docType" = $${i}`);
    i += 1;
  }
  let minScoreClause = '';
  if (filters.minScore !== undefined) {
    params.push(filters.minScore);
    minScoreClause = ` AND ${scoreExpr} >= $${i}`;
    i += 1;
  }
  params.push(filters.topK);
  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    minScoreClause,
    limitIndex: i,
  };
}

/** Semantic search: cosine distance via HNSW index, score = 1 - distance. */
export function vectorSearch(
  prisma: PrismaService,
  embedding: number[],
  filters: VectorSearchFilters,
): Promise<ChunkHitRow[]> {
  const params: unknown[] = [embedding];
  const scoreExpr = '1 - (c.embedding <=> $1::vector)';
  const { where, minScoreClause, limitIndex } = filterSql(filters, params, scoreExpr, 2);
  const query = `
    SELECT ${CHUNK_SELECT}, ${scoreExpr} AS score
    FROM chunks c
    JOIN documents d ON d.id = c."documentId"
    ${where}${minScoreClause}
    ORDER BY c.embedding <=> $1::vector
    LIMIT $${limitIndex}
  `;
  return queryRows<ChunkHitRow[]>(prisma, query, ...params);
}

/** Keyword search: Portuguese tsvector + ts_rank_cd over content. */
export function keywordSearch(
  prisma: PrismaService,
  q: string,
  filters: VectorSearchFilters,
): Promise<ChunkHitRow[]> {
  const params: unknown[] = [q];
  const scoreExpr =
    "ts_rank_cd(to_tsvector('portuguese', c.content), plainto_tsquery('portuguese', $1))";
  const { where, minScoreClause, limitIndex } = filterSql(filters, params, scoreExpr, 2);
  const query = `
    SELECT ${CHUNK_SELECT}, ${scoreExpr} AS score
    FROM chunks c
    JOIN documents d ON d.id = c."documentId"
    ${where}
    AND to_tsvector('portuguese', c.content) @@ plainto_tsquery('portuguese', $1)
    ${minScoreClause}
    ORDER BY score DESC
    LIMIT $${limitIndex}
  `;
  return queryRows<ChunkHitRow[]>(prisma, query, ...params);
}

/** Fuzzy search: pg_trgm similarity over content. */
export function trigramSearch(
  prisma: PrismaService,
  q: string,
  filters: VectorSearchFilters,
): Promise<ChunkHitRow[]> {
  const params: unknown[] = [q];
  const scoreExpr = 'similarity(c.content, $1)';
  const { where, minScoreClause, limitIndex } = filterSql(filters, params, scoreExpr, 2);
  const query = `
    SELECT ${CHUNK_SELECT}, ${scoreExpr} AS score
    FROM chunks c
    JOIN documents d ON d.id = c."documentId"
    ${where}
    AND similarity(c.content, $1) > 0
    ${minScoreClause}
    ORDER BY score DESC
    LIMIT $${limitIndex}
  `;
  return queryRows<ChunkHitRow[]>(prisma, query, ...params);
}

/** Bulk-persist chunk embeddings (batch). $1 = ids, $2 = vector literals. */
export async function upsertChunkEmbeddings(
  prisma: PrismaService,
  rows: Array<{ id: string; vector: number[] }>,
): Promise<void> {
  if (rows.length === 0) return;
  const ids = rows.map((r) => r.id);
  const vectors = rows.map((r) => `[${r.vector.map((v) => v.toFixed(6)).join(',')}]`);
  await prisma.$executeRawUnsafe(
    `UPDATE chunks AS c
     SET embedding = v.vec::vector
     FROM UNNEST($1::text[], $2::text[]) AS v(id, vec)
     WHERE c.id = v.id`,
    ids,
    vectors,
  );
}

/** Bulk-persist category prototype embeddings (same batch pattern). */
export async function upsertCategoryPrototypes(
  prisma: PrismaService,
  rows: Array<{ slug: string; vector: number[] }>,
): Promise<void> {
  if (rows.length === 0) return;
  const slugs = rows.map((r) => r.slug);
  const vectors = rows.map((r) => `[${r.vector.map((v) => v.toFixed(6)).join(',')}]`);
  await prisma.$executeRawUnsafe(
    `UPDATE categories AS c
     SET prototype = v.vec::vector
     FROM UNNEST($1::text[], $2::text[]) AS v(slug, vec)
     WHERE c.slug = v.slug`,
    slugs,
    vectors,
  );
}

/** Clears chunk embeddings for a document (or globally when documentId is null). */
export async function clearDocumentEmbeddings(
  prisma: PrismaService,
  documentId: string | null,
): Promise<void> {
  if (documentId) {
    await prisma.$executeRawUnsafe(
      'UPDATE chunks SET embedding = NULL WHERE "documentId" = $1',
      documentId,
    );
    return;
  }
  await prisma.$executeRawUnsafe('UPDATE chunks SET embedding = NULL');
}

export async function countEmbeddedChunks(prisma: PrismaService): Promise<number> {
  const rows = await queryRows<Array<{ count: number }>>(
    prisma,
    'SELECT COUNT(*)::int AS count FROM chunks WHERE embedding IS NOT NULL',
  );
  return rows[0]?.count ?? 0;
}
