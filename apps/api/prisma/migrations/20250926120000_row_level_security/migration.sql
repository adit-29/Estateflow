-- Pool-model row-level security.
-- Table owners bypass these policies unless FORCE ROW LEVEL SECURITY is set.
-- Do not FORCE it in this migration: local Postgres and the migration role own the tables.
-- Production applies infra/postgres/runtime-role.sql so the app connects as a non-owner.

CREATE OR REPLACE FUNCTION estateflow_current_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION estateflow_current_account()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_account', true), '')::uuid
$$;

-- Direct agency tables.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'DealerProfile',
    'Lead',
    'BuyerRequirement',
    'Property',
    'SiteVisit',
    'Deal',
    'CommissionSplit',
    'MatchShortlist',
    'MatchDraftMessage',
    'Activity',
    'ChannelConnection',
    'Conversation',
    'Message',
    'MessageAttachment',
    'ConversationAssignment',
    'CommunicationPreference',
    'FollowUpReminder',
    'Notification',
    'ReconstructionJob'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("agencyId" = estateflow_current_tenant()) WITH CHECK ("agencyId" = estateflow_current_tenant())',
      tbl
    );
  END LOOP;
END $$;

ALTER TABLE "DealerMembership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DealerMembership";
CREATE POLICY tenant_isolation ON "DealerMembership"
  USING (
    "agencyId" = estateflow_current_tenant()
    OR "accountId" = estateflow_current_account()
  )
  WITH CHECK ("agencyId" = estateflow_current_tenant());

ALTER TABLE "PropertyNetworkShare" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PropertyNetworkShare";
CREATE POLICY tenant_isolation ON "PropertyNetworkShare"
  USING (
    "ownerAgencyId" = estateflow_current_tenant()
    OR "sharedWithAgencyId" = estateflow_current_tenant()
  )
  WITH CHECK ("ownerAgencyId" = estateflow_current_tenant());

ALTER TABLE "DealerConnection" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DealerConnection";
CREATE POLICY tenant_isolation ON "DealerConnection"
  USING (
    "fromAgencyId" = estateflow_current_tenant()
    OR "toAgencyId" = estateflow_current_tenant()
  )
  WITH CHECK ("fromAgencyId" = estateflow_current_tenant());

ALTER TABLE "ResourceShare" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ResourceShare";
CREATE POLICY tenant_isolation ON "ResourceShare"
  USING (
    "ownerAgencyId" = estateflow_current_tenant()
    OR "sharedWithAgencyId" = estateflow_current_tenant()
  )
  WITH CHECK ("ownerAgencyId" = estateflow_current_tenant());

ALTER TABLE "DealStageHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DealStageHistory";
CREATE POLICY tenant_isolation ON "DealStageHistory"
  USING (
    EXISTS (
      SELECT 1 FROM "Deal" d
      WHERE d.id = "DealStageHistory"."dealId"
        AND d."agencyId" = estateflow_current_tenant()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Deal" d
      WHERE d.id = "DealStageHistory"."dealId"
        AND d."agencyId" = estateflow_current_tenant()
    )
  );

ALTER TABLE "CommissionAgreement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CommissionAgreement";
CREATE POLICY tenant_isolation ON "CommissionAgreement"
  USING (
    EXISTS (
      SELECT 1 FROM "Deal" d
      WHERE d.id = "CommissionAgreement"."dealId"
        AND d."agencyId" = estateflow_current_tenant()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Deal" d
      WHERE d.id = "CommissionAgreement"."dealId"
        AND d."agencyId" = estateflow_current_tenant()
    )
  );
