-- Run manually as the database owner after reviewing docs/aws/isolation.md.
-- Do not run this against local Docker until API requests set app.current_tenant
-- inside the same transaction as their queries. Until then the app user would see no rows.
--
-- Replace the password through Secrets Manager. Do not commit a real password.

-- CREATE ROLE estateflow_app LOGIN PASSWORD '<from Secrets Manager>';
-- GRANT CONNECT ON DATABASE estateflow TO estateflow_app;
-- GRANT USAGE ON SCHEMA public TO estateflow_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO estateflow_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO estateflow_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO estateflow_app;

-- The app role is not the table owner, so ENABLE ROW LEVEL SECURITY applies to it
-- without FORCE. Keep prisma migrate on the owner role, which bypasses RLS.
-- Never grant estateflow_app BYPASSRLS or superuser.
