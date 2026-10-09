-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('dealer', 'buyer', 'builder', 'seller');
CREATE TYPE "OnboardingStatus" AS ENUM ('not_started', 'pending', 'verified', 'rejected');
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'visit_scheduled', 'negotiation', 'won', 'lost', 'archived');
CREATE TYPE "LeadSource" AS ENUM ('referral', 'portal', 'walk_in', 'social', 'builder_tie_up', 'other');
CREATE TYPE "PropertyType" AS ENUM ('flat', 'builder_floor', 'plot', 'independent_house', 'commercial', 'land', 'other');
CREATE TYPE "TransactionType" AS ENUM ('sale', 'rent', 'resale', 'new_project', 'investment');
CREATE TYPE "DealStatus" AS ENUM ('draft', 'active', 'closed_won', 'closed_lost', 'cancelled');
CREATE TYPE "SiteVisitStatus" AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE "ActivityType" AS ENUM ('note', 'call', 'email', 'status_change', 'visit', 'deal_update', 'system');
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'member');

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "subjectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'dealer',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'not_started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Agency" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealerMembership" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealerProfile" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "operatingLocalities" TEXT[],
    "propertyTypes" "PropertyType"[],
    "transactionTypes" "TransactionType"[],
    "budgetBands" TEXT[],
    "experienceBand" TEXT NOT NULL,
    "activeBuyerCount" INTEGER NOT NULL DEFAULT 0,
    "activePropertyCount" INTEGER NOT NULL DEFAULT 0,
    "reraNumber" TEXT,
    "reraRegistered" BOOLEAN NOT NULL DEFAULT false,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DealerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "requirementSummary" TEXT,
    "budgetBand" TEXT,
    "preferredLocalities" TEXT[],
    "propertyType" "PropertyType",
    "transactionType" "TransactionType",
    "timeline" TEXT,
    "financingNotes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "nextFollowUpAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyerRequirement" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "budgetBand" TEXT,
    "localities" TEXT[],
    "propertyTypes" "PropertyType"[],
    "transactionTypes" "TransactionType"[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BuyerRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "budgetBand" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteVisit" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "leadId" UUID,
    "propertyId" UUID,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "SiteVisitStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deal" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "leadId" UUID,
    "propertyId" UUID,
    "title" TEXT NOT NULL,
    "value" DECIMAL(14,2),
    "status" "DealStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionAgreement" (
    "id" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "fixedAmount" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "leadId" UUID,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "accountId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocalAuthCredential" (
    "subjectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "verifyCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalAuthCredential_pkey" PRIMARY KEY ("subjectId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_subjectId_key" ON "Account"("subjectId");
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE INDEX "Account_role_idx" ON "Account"("role");

CREATE UNIQUE INDEX "DealerMembership_agencyId_accountId_key" ON "DealerMembership"("agencyId", "accountId");
CREATE INDEX "DealerMembership_accountId_idx" ON "DealerMembership"("accountId");

CREATE UNIQUE INDEX "DealerProfile_accountId_key" ON "DealerProfile"("accountId");
CREATE UNIQUE INDEX "DealerProfile_mobile_key" ON "DealerProfile"("mobile");
CREATE INDEX "DealerProfile_agencyId_idx" ON "DealerProfile"("agencyId");
CREATE INDEX "DealerProfile_email_idx" ON "DealerProfile"("email");

CREATE INDEX "Lead_agencyId_status_idx" ON "Lead"("agencyId", "status");
CREATE INDEX "Lead_agencyId_nextFollowUpAt_idx" ON "Lead"("agencyId", "nextFollowUpAt");
CREATE INDEX "Lead_agencyId_createdAt_idx" ON "Lead"("agencyId", "createdAt");

CREATE INDEX "BuyerRequirement_agencyId_idx" ON "BuyerRequirement"("agencyId");
CREATE INDEX "Property_agencyId_idx" ON "Property"("agencyId");
CREATE INDEX "SiteVisit_agencyId_scheduledAt_idx" ON "SiteVisit"("agencyId", "scheduledAt");
CREATE INDEX "Deal_agencyId_status_idx" ON "Deal"("agencyId", "status");
CREATE UNIQUE INDEX "CommissionAgreement_dealId_key" ON "CommissionAgreement"("dealId");
CREATE INDEX "Activity_agencyId_leadId_createdAt_idx" ON "Activity"("agencyId", "leadId", "createdAt");
CREATE INDEX "AuditEvent_accountId_createdAt_idx" ON "AuditEvent"("accountId", "createdAt");
CREATE UNIQUE INDEX "LocalAuthCredential_email_key" ON "LocalAuthCredential"("email");

-- AddForeignKey
ALTER TABLE "DealerMembership" ADD CONSTRAINT "DealerMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealerMembership" ADD CONSTRAINT "DealerMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealerProfile" ADD CONSTRAINT "DealerProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealerProfile" ADD CONSTRAINT "DealerProfile_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BuyerRequirement" ADD CONSTRAINT "BuyerRequirement_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionAgreement" ADD CONSTRAINT "CommissionAgreement_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
