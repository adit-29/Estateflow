# EstateFlow codebase audit

Inspected: 9 Oct 2026. Stack taken from the repository, not assumed.

**Git:** branch `main` has **no commits**; almost the entire tree is untracked. One file is staged (`apps/api/prisma/migrations/20250925000000_init/migration.sql`). Preserve all working-tree files.

## Stack (from the repo)

| Layer | Actual |
| --- | --- |
| Monorepo | npm workspaces (`apps/web`, `apps/api`, `packages/shared`) |
| Web | Next.js 15 App Router, React 19, Tailwind |
| API | NestJS 10, Express, Prisma 6, PostgreSQL 16 |
| Auth | Local JWT + httpOnly `ef_session`; Cognito class is a stub |
| Package manager | npm (`package-lock.json`), Node engines `>=20` (CI/Docker: 22) |
| Deploy | Terraform + ECS Fargate + RDS + S3 (`infra/terraform`). **Never applied.** |
| Demo isolation | `ef_workspace_mode`, `ef_demo_store_v2`, `ef_demo_session`, `ef_builder_workspace_v1` |

## Classification key

- **Implemented** — route, validation, authz, persistence, and a real UI path exist.
- **Partial** — some of those layers missing or demo-only.
- **Mock/demo** — browser store or labelled demo catalogue only.
- **Broken** — present but incorrect or insecure.
- **Missing** — requested capability with no backend (and usually no UI).

## Feature matrix

| Area | Status | Notes |
| --- | --- | --- |
| Dealer register/login/logout | Implemented (local) | `POST /auth/signup|signin|signout`. Production requires Cognito, which is **not implemented**. |
| Email verify | Partial | API exists; `/auth/verify` UI was a stub (wired in this pass). |
| Password reset | Missing → implemented this pass | Local hashed reset token; Cognito still N/A. |
| Buyer/seller live accounts | Mock/demo | Sign-in writes `ef_demo_session` only. API `getSessionFromToken` rejects non-dealer/non-builder. |
| Tenant role | Missing by design | Public rent flow uses `buyer` + `purpose=rent`. No `UserRole.tenant`. |
| Administrator | Partial | Agency `MembershipRole.admin` exists. Platform admin was missing; `Account.platformAdmin` added this pass. No full admin product UI. |
| Property CRUD | Partial | Create/list/get/patch + pagination. Archive added this pass. No dedicated photo upload (URLs on the row). `scope=builder` returns empty with a notice. |
| Public listings | Mock/demo | `PUBLIC_LISTINGS` compiled out when `NEXT_PUBLIC_APP_ENV=production`. |
| Leads CRM | Implemented | List/create/patch/archive, filters, activities. UI no longer exposes Archive (API still does). |
| Buyers | Partial | List/create/patch. `/dealer/buyers/[id]` and `/new` are stubs. |
| Matching | Implemented | `computeMatch` in `@estateflow/shared`; weights read-only (`GET /matching/weights`). Live dealer page calls `matchForBuyer`. |
| Site visits | Partial | Create/list/feedback + overlap window. Reschedule/cancel added this pass. `leadId`/`assignedAccountId` were not agency-scoped (fixed). |
| Deals | Partial | Create + stage patch. No get-by-id/pagination. Create did not check FK agency (fixed). |
| Commissions | Partial | Summary + splits; monetary fields are JS numbers, not decimal types. |
| Builder portal | Implemented | Large live API + demo workspace. |
| Buyer/seller portals | Mock/demo | localStorage only. |
| Copilot (dealer) | Implemented | Tools + confirm-before-write. Demo vs live gated. Missing LLM → setup state. |
| Copilot (builder) | Mock/demo | Client Q&A, no confirm-write, no live LLM. |
| WhatsApp inbox | Partial | Credentials + signed webhook. FB/IG record-only. |
| 3D tours | Partial | S3 presign + job machine. Vendor adapter not implemented. Real S3 E2E never run. |
| Admin reports queue | Broken → fixed | Any agency member could `GET /network/reports/admin-queue`. Now platform-admin only. |
| Network invites | Broken → fixed | Accept did not check `inviteeEmail`. |
| Health | Implemented | `/health` liveness (no DB); `/health/ready` DB + migrations. |
| CSRF | Partial | SameSite=Lax. Origin check added this pass for cookie mutations. |
| RLS | Partial | Policies exist; runtime still table owner; not all queries use `withTenant`. |

## Critical / High issues (as found)

### Critical

1. **Cognito adapter is a stub** while production boot **requires** `AUTH_PROVIDER=cognito`. Production cannot authenticate anyone.
2. **No git history / nothing committed.** Loss risk; do not `git add` `.env` files.

### High

3. **Platform report queue** readable by any dealer with an agency (fixed: `platformAdmin`).
4. **Deal create** accepted foreign UUIDs from other agencies (fixed).
5. **Site visit create** did not verify `leadId` or `assignedAccountId` (fixed).
6. **Invite accept** bound any pending invite to the caller’s agency (fixed: must match `inviteeEmail`).
7. **Password reset missing** (local flow added; no email provider, so codes only in `APP_ENV=local`).
8. **npm audit** (last run): 2 critical (tinypool/vitest), 22 high. CI continues on audit failure.
9. **Buyer/seller “live” dashboards** would be empty or demo-only in production builds — do not present them as live CRM.

### Medium

10. Deals list has no pagination. Notifications preferences PATCH had no Zod schema.
11. AgencyGuard `findFirst` membership is non-deterministic if an account has two agencies.
12. Local JWT is not revoked on sign-out.
13. Property photos are URL strings, not validated uploads.
14. `/auth/verify` UI did not call `POST /auth/verify` (fixed).
15. Dealer onboarding is skippable (`AppShell` does not force `/dealer/onboarding`).

### Low

16. Duplicate builder routes under `/builder` and `/api/builder`.
17. `NEXT_PUBLIC_AUTH_MODE` unused.
18. Dead components: `DealerShell`, `LiveAgencyView`, `AuthForm`.
19. `package.json` `test:e2e` points at a missing vitest e2e config.

## Demo vs live (do not mix)

| Store | Key | What it is |
| --- | --- | --- |
| Browser demo CRM | `ef_demo_store_v2` | Fictional dealer records. Not Postgres. |
| Browser demo session | `ef_demo_session` | Demo user. |
| Mode | `ef_workspace_mode` | `demo` \| `live`. |
| Builder demo | `ef_builder_workspace_v1` | Fictional builder workspace. |
| Public cards | `PUBLIC_LISTINGS` | Fictional catalogue; empty in production web builds. |
| API seed | `npm run db:seed` | `demo.dealer@estateflow.local` in Postgres. Local `APP_ENV` only. |

Live dealer/builder UI must call `/backend/*` with the session cookie. If the API is down, show an error — never fill the dashboard from the demo store.

## Tests observed

Last full run after this pass (local Postgres 16, `TEST_DATABASE_URL` set): **215 passed** (96 api, 11 web, 108 shared). Typecheck of all workspaces exited 0. Authorization “tests” in `apps/api/test/authorization.test.ts` are still contract assertions, not HTTP tests. `test:e2e` still points at a missing vitest e2e config.
