# Implementation plan

Order matches the execution rules. Checkboxes update as work lands in this repository.

## 1. Inventory and architecture

- [x] Map stack from package manifests and Prisma
- [x] Inventory API controllers and web routes
- [x] Classify demo vs live
- [x] Write `CODEBASE_AUDIT.md` and `ARCHITECTURE.md`

## 2. Critical runtime / security

- [x] API liveness without eager Prisma `$connect` (earlier pass)
- [x] Restrict `GET /network/reports/admin-queue` to `platformAdmin`
- [x] Deal create: agency-scope lead/buyer/property/responsible account
- [x] Site visit create: agency-scope lead + assignee membership
- [x] Invite accept: require `inviteeEmail` match
- [x] Origin check on cookie-authenticated mutations
- [x] Exception `code` values (e.g. EMAIL_NOT_VERIFIED) reach the client
- [ ] Cognito JWT verification (blocked: no pool, adapter still stub)
- [ ] Review/fix npm audit high/critical without `--force` breaking Nest/Vitest

## 3. Auth foundations

- [x] Local password forgot/reset (hashed token; code returned only when `APP_ENV=local`)
- [x] Wire `/auth/verify` to `POST /auth/verify`
- [x] Session includes `platformAdmin`
- [ ] Live buyer/seller/tenant accounts (out of scope this pass: API still dealer|builder only)
- [ ] Email/SMS delivery of verify/reset codes (no adapter ships)

## 4. Backend completeness

- [x] Property archive
- [x] Site visit reschedule (`PATCH /site-visits/:id`)
- [ ] Deals pagination + GET by id
- [ ] Matching weight PATCH
- [ ] Property media upload (beyond URL array)
- [ ] Notifications preferences Zod
- [ ] Builder inventory `scope=builder` feed

## 5. Frontend / API

- [x] Verify page submits code
- [x] Forgot/reset password pages
- [ ] Force dealer onboarding in `AppShell`
- [ ] Buyer detail page live
- [ ] Connect remaining stub dealer pages (documents/tasks)

## 6. AI

- [x] Existing dealer Copilot confirm-before-write (already present; do not bypass)
- [ ] Builder Copilot live tools
- [ ] Cognito/Hugging Face production credentials (operator)

## 7. Tests

- [x] Add tests for invite email match, deal FK guard, password reset hashing, origin check
- [x] Re-run full workspace tests after this pass: **215 passed** (108 shared, 96 api, 11 web); `npm run typecheck` exit 0
- [ ] HTTP e2e (script exists, config file missing)

## 8. Docs / deploy

- [x] `docs/SETUP.md`
- [x] `docs/DEPLOYMENT.md`
- [x] `docs/ENVIRONMENT_VARIABLES.md`
- [x] `docs/PRODUCTION_CHECKLIST.md`
- [x] `.env.example` placeholders only
- [ ] `terraform apply` — **your approval required**
- [ ] Production go-live — blocked on Cognito

## Explicitly not doing

- Resetting or dropping databases.
- Committing `.env` or secrets.
- Claiming AWS is live.
- Filling live dashboards from `ef_demo_store_v2`.
- Adding `UserRole.tenant` (rent is a transaction type / public filter).
- Rewriting Nest or Next.
