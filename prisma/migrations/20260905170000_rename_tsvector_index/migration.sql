-- Renames the full-text expression index to the stable `idx_` prefix so that
-- Prisma migrate (which cannot declare expression indexes) never mistakes it
-- for a managed index and drifts it away.
DROP INDEX IF EXISTS "chunks_content_tsv_idx";
CREATE INDEX "idx_chunks_content_tsv" ON "chunks" USING gin (to_tsvector('portuguese', "content"));
