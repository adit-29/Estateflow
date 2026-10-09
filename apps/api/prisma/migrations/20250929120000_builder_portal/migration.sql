-- CreateTable
CREATE TABLE "BuilderOrganization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "assignmentMode" TEXT NOT NULL DEFAULT 'recommended',
    "responseWindowMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxReassignments" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderMembership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuilderMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderProject" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "developerName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "reraNumber" TEXT,
    "constructionStatus" TEXT NOT NULL,
    "possessionDate" TEXT,
    "amenities" TEXT[],
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderTower" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BuilderTower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderFloor" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "towerId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "BuilderFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderUnit" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "towerId" UUID NOT NULL,
    "floorId" UUID NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "configuration" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "carpetAreaSqft" DOUBLE PRECISION NOT NULL,
    "saleableAreaSqft" DOUBLE PRECISION NOT NULL,
    "facing" TEXT NOT NULL DEFAULT '',
    "balcony" BOOLEAN NOT NULL DEFAULT false,
    "parking" TEXT NOT NULL DEFAULT '',
    "basePrice" INTEGER NOT NULL,
    "additionalCharges" INTEGER NOT NULL DEFAULT 0,
    "plc" INTEGER NOT NULL DEFAULT 0,
    "otherCharges" INTEGER NOT NULL DEFAULT 0,
    "availability" TEXT NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "bookingStatus" TEXT,
    "lastConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderMedia" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "unitId" TEXT,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "storage" TEXT NOT NULL,
    "objectKey" TEXT,
    "visibility" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "processingStatus" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuilderMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderTourJob" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "unitId" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "durationSeconds" INTEGER,
    "consentAt" TIMESTAMP(3),
    "demoSimulation" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'none',
    "providerJobRef" TEXT,
    "progress" INTEGER,
    "providerMessage" TEXT,
    "resultKind" TEXT,
    "resultAssetKey" TEXT,
    "resultVersion" TEXT,
    "resultCreatedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderTourJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderNetworkDealer" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "localities" TEXT[],
    "nearbyLocalities" TEXT[],
    "propertyTypes" TEXT[],
    "configurations" TEXT[],
    "transactionTypes" TEXT[],
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "optedOutLeadTypes" TEXT[],
    "openLeads" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 5,
    "responsesInWindow" INTEGER NOT NULL DEFAULT 0,
    "assignmentsInWindow" INTEGER NOT NULL DEFAULT 0,
    "responseWindowDays" INTEGER NOT NULL DEFAULT 30,
    "preferredProjectIds" TEXT[],
    "lastActivityAt" TIMESTAMP(3),
    "platformDealerId" TEXT,
    "agencyId" UUID,

    CONSTRAINT "BuilderNetworkDealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderDealerGroup" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "campaignName" TEXT,
    "dealerIds" TEXT[],

    CONSTRAINT "BuilderDealerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerProjectAccess" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "dealerId" TEXT NOT NULL,
    "towerId" TEXT,
    "unitId" TEXT,
    "campaignName" TEXT,
    "permissions" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerProjectAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderLead" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "unitId" TEXT,
    "buyerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "budgetMin" INTEGER NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "configuration" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "requirementNote" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL,
    "visitAt" TIMESTAMP(3),
    "visitOutcome" TEXT,
    "firstContactAt" TIMESTAMP(3),
    "bookingStatus" TEXT,
    "commissionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderAssignment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "dealerId" TEXT NOT NULL,
    "dealerName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "weights" JSONB NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseWindowMinutes" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,

    CONSTRAINT "BuilderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderWorkspaceEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leadId" UUID,
    "at" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "BuilderWorkspaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuilderMembership_accountId_key" ON "BuilderMembership"("accountId");

-- CreateIndex
CREATE INDEX "BuilderMembership_organizationId_idx" ON "BuilderMembership"("organizationId");

-- CreateIndex
CREATE INDEX "BuilderProject_organizationId_idx" ON "BuilderProject"("organizationId");

-- CreateIndex
CREATE INDEX "BuilderTower_organizationId_projectId_idx" ON "BuilderTower"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "BuilderFloor_organizationId_towerId_idx" ON "BuilderFloor"("organizationId", "towerId");

-- CreateIndex
CREATE INDEX "BuilderUnit_organizationId_projectId_idx" ON "BuilderUnit"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderUnit_projectId_unitNumber_key" ON "BuilderUnit"("projectId", "unitNumber");

-- CreateIndex
CREATE INDEX "BuilderMedia_organizationId_projectId_idx" ON "BuilderMedia"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "BuilderTourJob_organizationId_status_idx" ON "BuilderTourJob"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BuilderNetworkDealer_organizationId_idx" ON "BuilderNetworkDealer"("organizationId");

-- CreateIndex
CREATE INDEX "BuilderNetworkDealer_agencyId_idx" ON "BuilderNetworkDealer"("agencyId");

-- CreateIndex
CREATE INDEX "BuilderDealerGroup_organizationId_idx" ON "BuilderDealerGroup"("organizationId");

-- CreateIndex
CREATE INDEX "DealerProjectAccess_organizationId_projectId_idx" ON "DealerProjectAccess"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "DealerProjectAccess_dealerId_idx" ON "DealerProjectAccess"("dealerId");

-- CreateIndex
CREATE INDEX "BuilderLead_organizationId_createdAt_idx" ON "BuilderLead"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "BuilderAssignment_organizationId_status_idx" ON "BuilderAssignment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BuilderAssignment_leadId_assignedAt_idx" ON "BuilderAssignment"("leadId", "assignedAt");

-- CreateIndex
CREATE INDEX "BuilderWorkspaceEvent_organizationId_at_idx" ON "BuilderWorkspaceEvent"("organizationId", "at");

-- AddForeignKey
ALTER TABLE "BuilderMembership" ADD CONSTRAINT "BuilderMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderMembership" ADD CONSTRAINT "BuilderMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderProject" ADD CONSTRAINT "BuilderProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderTower" ADD CONSTRAINT "BuilderTower_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderTower" ADD CONSTRAINT "BuilderTower_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderFloor" ADD CONSTRAINT "BuilderFloor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderFloor" ADD CONSTRAINT "BuilderFloor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderFloor" ADD CONSTRAINT "BuilderFloor_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "BuilderTower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "BuilderTower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "BuilderFloor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderMedia" ADD CONSTRAINT "BuilderMedia_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderMedia" ADD CONSTRAINT "BuilderMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderTourJob" ADD CONSTRAINT "BuilderTourJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderTourJob" ADD CONSTRAINT "BuilderTourJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderNetworkDealer" ADD CONSTRAINT "BuilderNetworkDealer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderDealerGroup" ADD CONSTRAINT "BuilderDealerGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerProjectAccess" ADD CONSTRAINT "DealerProjectAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerProjectAccess" ADD CONSTRAINT "DealerProjectAccess_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderLead" ADD CONSTRAINT "BuilderLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderLead" ADD CONSTRAINT "BuilderLead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderAssignment" ADD CONSTRAINT "BuilderAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderAssignment" ADD CONSTRAINT "BuilderAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BuilderLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderWorkspaceEvent" ADD CONSTRAINT "BuilderWorkspaceEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BuilderOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderWorkspaceEvent" ADD CONSTRAINT "BuilderWorkspaceEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BuilderLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Tenant isolation. Table owners bypass these policies unless FORCE ROW LEVEL SECURITY is set.
ALTER TABLE "BuilderOrganization" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "BuilderOrganization";
CREATE POLICY tenant_isolation ON "BuilderOrganization"
  USING (
    "id" = estateflow_current_tenant()
    OR EXISTS (
      SELECT 1 FROM "BuilderMembership" m
      WHERE m."organizationId" = "BuilderOrganization"."id"
        AND m."accountId" = estateflow_current_account()
    )
  )
  WITH CHECK (true);

ALTER TABLE "BuilderMembership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "BuilderMembership";
CREATE POLICY tenant_isolation ON "BuilderMembership"
  USING (
    "organizationId" = estateflow_current_tenant()
    OR "accountId" = estateflow_current_account()
  )
  WITH CHECK (
    "organizationId" = estateflow_current_tenant()
    OR "accountId" = estateflow_current_account()
  );

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'BuilderProject',
    'BuilderTower',
    'BuilderFloor',
    'BuilderUnit',
    'BuilderMedia',
    'BuilderTourJob',
    'BuilderNetworkDealer',
    'BuilderDealerGroup',
    'DealerProjectAccess',
    'BuilderLead',
    'BuilderAssignment',
    'BuilderWorkspaceEvent'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("organizationId" = estateflow_current_tenant()) WITH CHECK ("organizationId" = estateflow_current_tenant())',
      tbl
    );
  END LOOP;
END $$;
