-- Enums
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'active', 'paused', 'sold_rented', 'archived');
CREATE TYPE "FurnishingType" AS ENUM ('unfurnished', 'semi_furnished', 'fully_furnished');
CREATE TYPE "AreaUnit" AS ENUM ('sqft', 'sqm', 'sqyd');
CREATE TYPE "BuyerReadiness" AS ENUM ('exploring', 'shortlisting', 'ready', 'on_hold');
CREATE TYPE "DealPipelineStage" AS ENUM ('new_lead', 'qualified', 'site_visit', 'negotiation', 'booking', 'closed_won', 'closed_lost');
CREATE TYPE "CommissionPaymentStatus" AS ENUM ('pending', 'paid', 'overdue', 'disputed');
CREATE TYPE "CollaborationRole" AS ENUM ('buyer_source', 'inventory_source', 'closing');
CREATE TYPE "ConnectionStatus" AS ENUM ('pending', 'accepted', 'rejected', 'revoked');
CREATE TYPE "ShareResourceType" AS ENUM ('property', 'lead', 'deal_collaboration');
CREATE TYPE "ReportTargetType" AS ENUM ('dealer_profile', 'property_listing');
CREATE TYPE "ReportStatus" AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

-- SiteVisitStatus migration
ALTER TYPE "SiteVisitStatus" RENAME VALUE 'scheduled' TO 'proposed';
ALTER TYPE "SiteVisitStatus" ADD VALUE IF NOT EXISTS 'confirmed';

-- DealerProfile visibility
ALTER TABLE "DealerProfile" ADD COLUMN IF NOT EXISTS "showInDirectory" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DealerProfile" ADD COLUMN IF NOT EXISTS "showLocalities" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DealerProfile" ADD COLUMN IF NOT EXISTS "showPropertyTypes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DealerProfile" ADD COLUMN IF NOT EXISTS "showExperience" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DealerProfile" ADD COLUMN IF NOT EXISTS "showMobile" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "DealerProfile_showInDirectory_idx" ON "DealerProfile"("showInDirectory");

-- BuyerRequirement extend
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "leadId" UUID;
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "bedroomsMin" INTEGER;
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "bedroomsMax" INTEGER;
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "budgetMin" DECIMAL(14,2);
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "budgetMax" DECIMAL(14,2);
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "transactionType" "TransactionType";
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "moveInTimeline" TEXT;
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "readiness" "BuyerReadiness" NOT NULL DEFAULT 'exploring';
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "mustHaveCriteria" TEXT;
ALTER TABLE "BuyerRequirement" ADD COLUMN IF NOT EXISTS "flexibleCriteria" TEXT;
UPDATE "BuyerRequirement" SET "transactionType" = 'sale' WHERE "transactionType" IS NULL;
ALTER TABLE "BuyerRequirement" ALTER COLUMN "transactionType" SET NOT NULL;
ALTER TABLE "BuyerRequirement" ADD CONSTRAINT "BuyerRequirement_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Property extend
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "addressText" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "bedrooms" INTEGER;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "areaValue" DECIMAL(12,2);
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "areaUnit" "AreaUnit";
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "priceAmount" DECIMAL(14,2);
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "furnishing" "FurnishingType";
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "possessionNotes" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "sourceContact" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "listingStatus" "ListingStatus" NOT NULL DEFAULT 'draft';
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "isVerifiedListing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "lastConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "notes" TEXT;
UPDATE "Property" SET "listingStatus" = 'active' WHERE "status" = 'available';
CREATE INDEX IF NOT EXISTS "Property_agencyId_listingStatus_idx" ON "Property"("agencyId", "listingStatus");
CREATE INDEX IF NOT EXISTS "Property_listingStatus_propertyType_locality_idx" ON "Property"("listingStatus", "propertyType", "locality");
CREATE INDEX IF NOT EXISTS "Property_priceAmount_idx" ON "Property"("priceAmount");

-- SiteVisit extend
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "buyerRequirementId" UUID;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "assignedAccountId" UUID;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "meetingPoint" TEXT NOT NULL DEFAULT 'To be confirmed';
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "buyerFeedback" TEXT;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;
CREATE INDEX IF NOT EXISTS "SiteVisit_assignedAccountId_scheduledAt_idx" ON "SiteVisit"("assignedAccountId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_agencyId_status_idx" ON "SiteVisit"("agencyId", "status");

-- Deal extend
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "buyerRequirementId" UUID;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "responsibleAccountId" UUID;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "expectedCloseDate" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "pipelineStage" "DealPipelineStage" NOT NULL DEFAULT 'new_lead';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "notes" TEXT;
CREATE INDEX IF NOT EXISTS "Deal_agencyId_pipelineStage_idx" ON "Deal"("agencyId", "pipelineStage");

-- Commission extend
ALTER TABLE "CommissionAgreement" ADD COLUMN IF NOT EXISTS "payerSource" TEXT;
ALTER TABLE "CommissionAgreement" ADD COLUMN IF NOT EXISTS "paymentStatus" "CommissionPaymentStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "CommissionAgreement" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "CommissionAgreement" ADD COLUMN IF NOT EXISTS "demoLegalAck" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommissionAgreement" ALTER COLUMN "percentage" DROP NOT NULL;

-- New tables (abbreviated - Prisma will sync)
CREATE TABLE IF NOT EXISTS "PropertyNetworkShare" (
  "id" UUID NOT NULL,
  "propertyId" UUID NOT NULL,
  "ownerAgencyId" UUID NOT NULL,
  "sharedWithAgencyId" UUID NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "grantedByAccountId" UUID,
  CONSTRAINT "PropertyNetworkShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DealStageHistory" (
  "id" UUID NOT NULL,
  "dealId" UUID NOT NULL,
  "fromStage" "DealPipelineStage",
  "toStage" "DealPipelineStage" NOT NULL,
  "accountId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealStageHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommissionAgreementHistory" (
  "id" UUID NOT NULL,
  "agreementId" UUID NOT NULL,
  "accountId" UUID,
  "changeSummary" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionAgreementHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommissionSplit" (
  "id" UUID NOT NULL,
  "agreementId" UUID NOT NULL,
  "dealId" UUID NOT NULL,
  "agencyId" UUID NOT NULL,
  "role" "CollaborationRole" NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedByAccountId" UUID,
  "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionSplit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MatchShortlist" (
  "id" UUID NOT NULL,
  "agencyId" UUID NOT NULL,
  "buyerRequirementId" UUID NOT NULL,
  "propertyId" UUID NOT NULL,
  "matchPercent" INTEGER NOT NULL,
  "breakdown" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchShortlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MatchDraftMessage" (
  "id" UUID NOT NULL,
  "agencyId" UUID NOT NULL,
  "buyerRequirementId" UUID NOT NULL,
  "propertyId" UUID NOT NULL,
  "draftText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchDraftMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DealerConnection" (
  "id" UUID NOT NULL,
  "fromAgencyId" UUID NOT NULL,
  "toAgencyId" UUID,
  "inviteeEmail" TEXT,
  "inviteePhone" TEXT,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'pending',
  "invitedByAccountId" UUID NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DealerConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResourceShare" (
  "id" UUID NOT NULL,
  "connectionId" UUID NOT NULL,
  "ownerAgencyId" UUID NOT NULL,
  "sharedWithAgencyId" UUID NOT NULL,
  "resourceType" "ShareResourceType" NOT NULL,
  "resourceId" UUID NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "ResourceShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Report" (
  "id" UUID NOT NULL,
  "reporterAccountId" UUID NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'open',
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
