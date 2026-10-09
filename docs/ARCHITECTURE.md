# EstateFlow architecture

## Runtime shape

```
Browser (Next.js :3000)
  ├─ Public pages: static demo catalogue / builder seed (labelled)
  ├─ Demo workspace: localStorage only (ef_demo_*)
  └─ Live workspace: fetch('/backend/...', credentials: 'include')
        │
        ▼  Next rewrite (API_URL baked at web image build)
Nest API (:4000)
  ├─ AuthGuard → Account.subjectId (never a client-supplied role)
  ├─ AgencyGuard → DealerMembership.agencyId (ignores x-agency-id)
  ├─ BuilderGuard → BuilderMembership.organizationId
  └─ Prisma → PostgreSQL (one schema, agencyId / organizationId tenant columns)
```

There is **no** Next.js `middleware.ts`. Shells (`AppShell`) enforce role on the client; **every mutation must still be authorized on the API**.

## Modules (API)

| Nest module | Persistence | Tenant key |
| --- | --- | --- |
| Auth | `Account`, `LocalAuthCredential` | n/a |
| Dealer onboarding | `DealerProfile`, `DealerMembership` | agencyId |
| Leads, properties, buyers, matching, visits, deals, commissions | matching tables | agencyId |
| Dashboard, search, analytics, notifications, network | | agencyId |
| Copilot | CRM reads + confirm mutations | agencyId + dealer role |
| Inbox / webhooks | conversations, messages | agencyId |
| Reconstruction / tours | tour jobs, S3 keys `agencies/<agencyId>/tours/...` | agencyId |
| Builder | organization, projects, units, assignments | organizationId |

Shared contracts live in `packages/shared` (Zod). The API does **not** use a global `ValidationPipe`; services call `.parse()`.

## Matching

`computeMatch` (`packages/shared/src/matching.ts`) scores locality, budget, property type, bedrooms, readiness. Missing dimensions are `unknown` and dropped; remaining weights are renormalized. Default weights: locality 0.3, budget 0.3, type 0.2, bedrooms 0.1, readiness 0.1 (`matching-config.ts`). Percentages are explanations of stored records, not a market index.

## Auth

- **Local:** bcrypt password, 6-digit verify code, JWT in `ef_session` (httpOnly, SameSite=Lax, Secure when `APP_ENV !== local`).
- **Cognito:** class throws `NotImplementedException`. Production `assertSafeRuntime()` refuses to start without Cognito.
- Session user role comes from **`Account.role` in Postgres**, not from the login form after sign-in.
- `platformAdmin` on `Account` gates platform report review. It is not a workspace role.

## Roles (actual enum)

`UserRole`: `dealer` | `buyer` | `builder` | `seller`.

| Requested name | Mapped to |
| --- | --- |
| Dealer/Agent | `dealer` |
| Builder/Developer | `builder` |
| Property owner / Seller | `seller` (live API not enabled) |
| Buyer | `buyer` (live API not enabled) |
| Tenant | Same as buyer + rent filters on public pages |
| Administrator | `Account.platformAdmin` (platform) and/or `MembershipRole.admin` (agency WhatsApp link) |

Do not trust `?role=` on the query string for authorization.

## Deployed topology (Terraform, not applied)

ALB HTTPS → Fargate `web` + `api` (private subnets) → RDS PostgreSQL 16 (private, TLS). S3 private media. Secrets Manager. Optional SQS (off; no worker). One-off migrate task; API never migrates on boot. `/health/ready` keeps tasks out of the load balancer until migrations match.

## Data isolation

Application filters on `agencyId` / `organizationId` are the enforced boundary. RLS migration exists but is not forced for the table owner. Do not switch the runtime DB user to `estateflow_app` until every query runs inside `withTenant`.
