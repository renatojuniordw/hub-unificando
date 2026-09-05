-- Renomeia os índices de busca custom para nomes fora do padrão do Prisma
-- (idx_*). O migrate dev reconhece índices com o padrão "<tabela>_<col>_idx"
-- como sendo do schema e, como vector/tsvector/trgm não são declaráveis no
-- schema, geraria DROP desses índices (drift). Com prefixo idx_ o Prisma os
-- trata como índices não gerenciados e o histórico fica estável.
DROP INDEX IF EXISTS "chunks_content_trgm_idx";
DROP INDEX IF EXISTS "chunks_embedding_hnsw_idx";
DROP INDEX IF EXISTS "documents_categories_gin_idx";

CREATE INDEX IF NOT EXISTS "idx_chunks_embedding_hnsw" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "idx_chunks_content_trgm" ON "chunks" USING gin ("content" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_documents_categories_gin" ON "documents" USING gin ("categories");