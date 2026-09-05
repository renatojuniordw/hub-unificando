-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "projects" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "repoUrl" TEXT,
    "folderPath" TEXT NOT NULL,
    "stack" JSONB,
    "tags" TEXT[],
    "sourceType" TEXT NOT NULL DEFAULT 'local',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastIngestedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "lang" TEXT,
    "category" TEXT NOT NULL,
    "categories" TEXT[],
    "docType" TEXT NOT NULL DEFAULT 'markdown',
    "contentKind" TEXT,
    "sourceSha" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "tokenEstimate" INTEGER,
    "metadata" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "heading" TEXT,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "anchor" TEXT,
    "metadata" JSONB,
    "embedding" vector(768),

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[],
    "prototype" vector(768),
    "parentSlug" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourcePath" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "scope" JSONB,
    "stats" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_projectSlug_category_idx" ON "documents"("projectSlug", "category");

-- CreateIndex
CREATE UNIQUE INDEX "documents_projectSlug_path_key" ON "documents"("projectSlug", "path");

-- CreateIndex
CREATE INDEX "chunks_documentId_idx" ON "chunks"("documentId");

-- CreateIndex
CREATE INDEX "chunks_contentHash_idx" ON "chunks"("contentHash");

-- CreateIndex
CREATE INDEX "categories_parentSlug_idx" ON "categories"("parentSlug");

-- CreateIndex
CREATE INDEX "decisions_projectSlug_status_idx" ON "decisions"("projectSlug", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_status_createdAt_idx" ON "ingestion_jobs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "projects"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "projects"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- Search indexes (vector/tsvector/trigram) — see docs/SEARCH.md
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- HNSW cosine index for semantic search
CREATE INDEX "chunks_embedding_hnsw_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);

-- Portuguese full-text search over chunk content (expression index)
CREATE INDEX "chunks_content_tsv_idx" ON "chunks" USING gin (to_tsvector('portuguese', "content"));

-- Trigram fuzzy search over chunk content
CREATE INDEX "chunks_content_trgm_idx" ON "chunks" USING gin ("content" gin_trgm_ops);

-- Multi-label category filtering
CREATE INDEX "documents_categories_gin_idx" ON "documents" USING gin ("categories");
