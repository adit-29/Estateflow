# Tenant isolation

EstateFlow uses one PostgreSQL database and one schema. Each dealer agency is a tenant. This is the AWS **pool** model: shared instance, shared schema, tenant column on each row.

AWS describes three partitioning models for PostgreSQL SaaS ([partitioning models](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/partitioning-models.html), [pool model](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/pool.html)):

| Model | Fit for this stage |
| --- | --- |
| Pool | Chosen. One RDS instance, one schema, `agencyId` on tenant rows, row-level security as the database backstop. Lowest cost and one migration path while the product is early. |
| Bridge | A database or schema per agency on one instance. Consider it when a customer needs a restore boundary or a clearer compliance story, and the agency count is still small enough to operate. |
| Silo | One instance per agency. Consider it when a contract requires dedicated compute, a private networking boundary, or tenant-level availability. It costs more and slows onboarding. |

Pool risks that remain: a noisy neighbour can load the shared instance, a missed filter can expose rows if the application connects as the table owner, and one database outage affects every agency. AWS notes that row-level security is required for a pool model because there is no separate schema per tenant ([best practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/best-practices.html), [RLS recommendations](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html)).

## How a request is scoped

1. `AuthGuard` reads the httpOnly `ef_session` cookie (or an `Authorization: Bearer` header for API clients), verifies it, and loads `Account` by subject id.
2. `AgencyGuard` loads `DealerMembership` for that account.
3. `agencyFromSession` returns that membership id. `x-agency-id` and `?agencyId=` are ignored.
4. Services pass `req.agencyId` into Prisma `where` clauses.

The browser cannot choose the tenant.

Tour objects follow the same rule. S3 keys are built on the server as `agencies/<agencyId>/tours/<jobId>/…` from the session agency. Presigned URLs are issued only after an agency-scoped job lookup. Public share links resolve through a hashed token to one job, and return only that job's media. `TourShareLink` has the same RLS policy as the other tenant tables.

## Row-level security

Migration `20250926120000_row_level_security` enables RLS and adds policies that compare `agencyId` with `estateflow_current_tenant()`. That function reads `app.current_tenant` with `missing_ok`. An empty setting hides rows instead of returning every row.

PostgreSQL table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set. This migration does not force it. Local Docker and `prisma migrate` use the owner, so existing local queries keep working.

`withTenant` sets the tenant with `set_config(..., true)`, which lasts for one transaction. Do not use a session-level `SET`. Prisma checks connections out of a pool, and a session variable would leak to the next request on that connection.

The runtime role script in `infra/postgres/runtime-role.sql` is commented out on purpose. Applying it before every query runs inside `withTenant` would make the API return no rows.

## Migration approach

1. Apply the RLS migration with the owner role (`prisma migrate deploy`).
2. Move data access through `withTenant` so each transaction sets the tenant and then queries on that same client.
3. Create `estateflow_app` without `BYPASSRLS`. Point only the running tasks at that login.
4. Keep migrations on the owner role.

## Tests

`packages/shared/src/tenant-scope.test.ts` checks that a client-supplied agency id is not used. API authorization tests still check that a lead’s `agencyId` must match the request agency.
