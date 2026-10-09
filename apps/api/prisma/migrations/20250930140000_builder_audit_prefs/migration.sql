-- AlterTable
ALTER TABLE "BuilderOrganization" ADD COLUMN "notificationPrefs" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "BuilderWorkspaceEvent" ADD COLUMN "actor" TEXT;

-- CreateIndex
CREATE INDEX "BuilderUnit_organizationId_availability_idx" ON "BuilderUnit"("organizationId", "availability");

-- CreateIndex
CREATE INDEX "BuilderLead_organizationId_stage_idx" ON "BuilderLead"("organizationId", "stage");
