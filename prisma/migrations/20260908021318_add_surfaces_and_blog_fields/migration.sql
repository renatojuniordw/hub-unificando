-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'live',
ADD COLUMN     "surfaces" TEXT[];

-- CreateIndex
CREATE INDEX "documents_contentKind_isDraft_idx" ON "documents"("contentKind", "isDraft");
