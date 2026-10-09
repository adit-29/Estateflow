-- Adds Copilot usage logging, notification delivery tracking, and WhatsApp account mapping.
-- Also reconciles earlier hand-written migrations with schema.prisma (verified with prisma migrate diff).

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('email', 'sms', 'push');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed', 'dismissed');

-- DropIndex
DROP INDEX "Property_agencyId_idx";

-- AlterTable
ALTER TABLE "BuyerRequirement" DROP COLUMN "budgetBand",
DROP COLUMN "transactionTypes";

-- AlterTable
ALTER TABLE "ChannelConnection" ADD COLUMN     "externalAccountId" TEXT;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "status",
ALTER COLUMN "photoUrls" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SiteVisit" ALTER COLUMN "assignedAccountId" SET NOT NULL,
ALTER COLUMN "meetingPoint" DROP DEFAULT;

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotUsage" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "tool" TEXT,
    "outcome" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "promptChars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationDelivery_agencyId_status_idx" ON "NotificationDelivery"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_agencyId_idempotencyKey_key" ON "NotificationDelivery"("agencyId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CopilotUsage_agencyId_createdAt_idx" ON "CopilotUsage"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotUsage_accountId_createdAt_idx" ON "CopilotUsage"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerRequirement_agencyId_createdAt_idx" ON "BuyerRequirement"("agencyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_channel_externalAccountId_key" ON "ChannelConnection"("channel", "externalAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionSplit_agreementId_agencyId_role_key" ON "CommissionSplit"("agreementId", "agencyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationPreference_conversationId_key" ON "CommunicationPreference"("conversationId");

-- CreateIndex
CREATE INDEX "CommunicationPreference_agencyId_idx" ON "CommunicationPreference"("agencyId");

-- CreateIndex
CREATE INDEX "DealStageHistory_dealId_createdAt_idx" ON "DealStageHistory"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "DealerConnection_fromAgencyId_status_idx" ON "DealerConnection"("fromAgencyId", "status");

-- CreateIndex
CREATE INDEX "DealerConnection_toAgencyId_status_idx" ON "DealerConnection"("toAgencyId", "status");

-- CreateIndex
CREATE INDEX "DealerConnection_inviteeEmail_idx" ON "DealerConnection"("inviteeEmail");

-- CreateIndex
CREATE INDEX "FollowUpReminder_agencyId_dueAt_idx" ON "FollowUpReminder"("agencyId", "dueAt");

-- CreateIndex
CREATE INDEX "MatchShortlist_agencyId_matchPercent_idx" ON "MatchShortlist"("agencyId", "matchPercent");

-- CreateIndex
CREATE UNIQUE INDEX "MatchShortlist_agencyId_buyerRequirementId_propertyId_key" ON "MatchShortlist"("agencyId", "buyerRequirementId", "propertyId");

-- CreateIndex
CREATE INDEX "Property_agencyId_propertyType_idx" ON "Property"("agencyId", "propertyType");

-- CreateIndex
CREATE INDEX "Property_agencyId_locality_idx" ON "Property"("agencyId", "locality");

-- CreateIndex
CREATE INDEX "PropertyNetworkShare_sharedWithAgencyId_revokedAt_idx" ON "PropertyNetworkShare"("sharedWithAgencyId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyNetworkShare_propertyId_sharedWithAgencyId_key" ON "PropertyNetworkShare"("propertyId", "sharedWithAgencyId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceShare_sharedWithAgencyId_resourceType_resourceId_idx" ON "ResourceShare"("sharedWithAgencyId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ResourceShare_ownerAgencyId_idx" ON "ResourceShare"("ownerAgencyId");

-- AddForeignKey
ALTER TABLE "PropertyNetworkShare" ADD CONSTRAINT "PropertyNetworkShare_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyNetworkShare" ADD CONSTRAINT "PropertyNetworkShare_ownerAgencyId_fkey" FOREIGN KEY ("ownerAgencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyNetworkShare" ADD CONSTRAINT "PropertyNetworkShare_sharedWithAgencyId_fkey" FOREIGN KEY ("sharedWithAgencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_buyerRequirementId_fkey" FOREIGN KEY ("buyerRequirementId") REFERENCES "BuyerRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_assignedAccountId_fkey" FOREIGN KEY ("assignedAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_buyerRequirementId_fkey" FOREIGN KEY ("buyerRequirementId") REFERENCES "BuyerRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_responsibleAccountId_fkey" FOREIGN KEY ("responsibleAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAgreementHistory" ADD CONSTRAINT "CommissionAgreementHistory_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommissionAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAgreementHistory" ADD CONSTRAINT "CommissionAgreementHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSplit" ADD CONSTRAINT "CommissionSplit_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommissionAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSplit" ADD CONSTRAINT "CommissionSplit_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSplit" ADD CONSTRAINT "CommissionSplit_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSplit" ADD CONSTRAINT "CommissionSplit_acceptedByAccountId_fkey" FOREIGN KEY ("acceptedByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchShortlist" ADD CONSTRAINT "MatchShortlist_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchShortlist" ADD CONSTRAINT "MatchShortlist_buyerRequirementId_fkey" FOREIGN KEY ("buyerRequirementId") REFERENCES "BuyerRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchShortlist" ADD CONSTRAINT "MatchShortlist_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDraftMessage" ADD CONSTRAINT "MatchDraftMessage_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDraftMessage" ADD CONSTRAINT "MatchDraftMessage_buyerRequirementId_fkey" FOREIGN KEY ("buyerRequirementId") REFERENCES "BuyerRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDraftMessage" ADD CONSTRAINT "MatchDraftMessage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerConnection" ADD CONSTRAINT "DealerConnection_fromAgencyId_fkey" FOREIGN KEY ("fromAgencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerConnection" ADD CONSTRAINT "DealerConnection_toAgencyId_fkey" FOREIGN KEY ("toAgencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerConnection" ADD CONSTRAINT "DealerConnection_invitedByAccountId_fkey" FOREIGN KEY ("invitedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceShare" ADD CONSTRAINT "ResourceShare_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DealerConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceShare" ADD CONSTRAINT "ResourceShare_ownerAgencyId_fkey" FOREIGN KEY ("ownerAgencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceShare" ADD CONSTRAINT "ResourceShare_sharedWithAgencyId_fkey" FOREIGN KEY ("sharedWithAgencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterAccountId_fkey" FOREIGN KEY ("reporterAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Tenant isolation for the Phase 13/14 tables, matching 20250926120000_row_level_security.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['NotificationDelivery', 'CopilotUsage']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("agencyId" = estateflow_current_tenant()) WITH CHECK ("agencyId" = estateflow_current_tenant())',
      tbl
    );
  END LOOP;
END $$;
