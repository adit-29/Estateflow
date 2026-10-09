-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReconstructionStatus" ADD VALUE 'draft';
ALTER TYPE "ReconstructionStatus" ADD VALUE 'uploading';
ALTER TYPE "ReconstructionStatus" ADD VALUE 'queued';
ALTER TYPE "ReconstructionStatus" ADD VALUE 'needs_more_footage';

-- AlterTable
ALTER TABLE "ReconstructionJob" ADD COLUMN     "attachedAt" TIMESTAMP(3),
ADD COLUMN     "captureNotes" TEXT,
ADD COLUMN     "consentAccountId" UUID,
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "createdByAccountId" UUID,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "progress" INTEGER,
ADD COLUMN     "providerMessage" TEXT,
ADD COLUMN     "resultModelKey" TEXT,
ADD COLUMN     "sizeBytes" BIGINT,
ADD COLUMN     "uploadedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TourShareLink" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdByAccountId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourShareLink_tokenHash_key" ON "TourShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "TourShareLink_agencyId_jobId_idx" ON "TourShareLink"("agencyId", "jobId");

-- CreateIndex
CREATE INDEX "ReconstructionJob_providerJobRef_idx" ON "ReconstructionJob"("providerJobRef");

-- AddForeignKey
ALTER TABLE "TourShareLink" ADD CONSTRAINT "TourShareLink_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourShareLink" ADD CONSTRAINT "TourShareLink_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ReconstructionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tenant isolation for share links, matching 20250926120000_row_level_security.
ALTER TABLE "TourShareLink" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TourShareLink";
CREATE POLICY tenant_isolation ON "TourShareLink"
  USING ("agencyId" = estateflow_current_tenant())
  WITH CHECK ("agencyId" = estateflow_current_tenant());
