CREATE TYPE "NotificationKind" AS ENUM ('reminder', 'visit_change', 'shared_inventory', 'collaboration_request');
CREATE TYPE "ReconstructionStatus" AS ENUM ('no_tour', 'video_required', 'video_uploaded', 'processing_requested', 'processing', 'ready', 'failed', 'unavailable');

CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "agencyId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "reminders" BOOLEAN NOT NULL DEFAULT true,
  "visitChanges" BOOLEAN NOT NULL DEFAULT true,
  "sharedInventory" BOOLEAN NOT NULL DEFAULT true,
  "collaborationRequests" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReconstructionJob" (
  "id" UUID NOT NULL,
  "agencyId" UUID NOT NULL,
  "propertyId" UUID NOT NULL,
  "uploadObjectKey" TEXT,
  "provider" TEXT NOT NULL,
  "providerJobRef" TEXT,
  "status" "ReconstructionStatus" NOT NULL,
  "errorCategory" TEXT,
  "resultAssetUrl" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "retentionUntil" TIMESTAMP(3),
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconstructionJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_agencyId_dedupeKey_key" ON "Notification"("agencyId", "dedupeKey");
CREATE INDEX "Notification_accountId_createdAt_idx" ON "Notification"("accountId", "createdAt");
CREATE INDEX "Notification_accountId_readAt_idx" ON "Notification"("accountId", "readAt");
CREATE UNIQUE INDEX "NotificationPreference_accountId_key" ON "NotificationPreference"("accountId");
CREATE UNIQUE INDEX "ReconstructionJob_agencyId_idempotencyKey_key" ON "ReconstructionJob"("agencyId", "idempotencyKey");
CREATE INDEX "ReconstructionJob_agencyId_propertyId_createdAt_idx" ON "ReconstructionJob"("agencyId", "propertyId", "createdAt");
CREATE INDEX "ReconstructionJob_agencyId_status_idx" ON "ReconstructionJob"("agencyId", "status");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReconstructionJob" ADD CONSTRAINT "ReconstructionJob_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReconstructionJob" ADD CONSTRAINT "ReconstructionJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Property_fts_idx" ON "Property" USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(locality, '') || ' ' || coalesce("addressText", '')));
CREATE INDEX "Lead_fts_idx" ON "Lead" USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce("requirementSummary", '')));
