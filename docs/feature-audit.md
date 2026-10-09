# EstateFlow feature audit

Audit date: 2026-09-26. Status is based on reading routes, schema, API controllers, and the browser demo store. A page is not marked Complete unless the main flow uses stored records and does not pretend an external system is connected.

The dealer UI the browser opens is a **demo workspace** in `localStorage` (`ef_demo_store_v2`). The Nest API and Prisma database are a separate live path. They are not what the one-click “Explore demo” button writes to.

## How to read status

| Status | Meaning |
| --- | --- |
| Complete | Main flow works on the path named in the files column, with the limits in “What is missing”. |
| Partial | A real slice exists, but the full product behaviour is not end to end. |
| Missing | No working flow. |
| Not safely verifiable | Needs Postgres, AWS, Meta, or an LLM key that is not configured here. |

## Audit table

| Feature | Status | Existing files / routes | What is missing | Phase |
| --- | --- | --- | --- | --- |
| Project shell, scripts, Postgres schema | Partial | `package.json`, `apps/api/prisma/schema.prisma`, `README.md` | Phase 13/14: all migrations replayed on a throwaway local Postgres 17; the messaging migration was completed (tables were missing, which broke the RLS migration) and a reconcile migration makes `prisma migrate diff` report zero drift. CI now checks this. | 1 |
| Public landing and role selection | Complete | `/`, `/get-started` | Buyer, builder, and seller are labelled demo previews, not “coming soon” only. They have small working preview pages. | 3 |
| Explore demo sign-in | Complete | `/auth/sign-in`, `apps/web/src/lib/demo-auth.ts` | Demo password is `Demo123!` and lives in the client for the local demo only. Real Cognito sign-in is not wired. | 2 |
| Demo identity Raj Mehta | Complete | `demo-auth.ts`, `demo-seed.ts`, app shell badge | Fictional. Badge says “Demo workspace” and “EstateFlow Demo Realty”. | 2 |
| Demo records: leads, properties, visits, deals, commissions, network | Complete for demo | `apps/web/src/lib/demo-seed.ts` | 16 leads, 18 properties, 6 visits, 8 deals, 5 commission rows, 4 network dealers. All fictional Delhi/NCR. Not written to Postgres. | 2 |
| Reset demo data | Complete | `/dealer/settings` | Confirms with a second click, then clears `ef_demo_store_v2`. Does not touch the API database. | 2 |
| Real account empty state | Partial | API auth + CRM modules | API sign-up does not seed demo rows. The dealer UI still opens the browser demo, not an empty API tenant, unless a bearer token is used on analytics, search, and notifications. | 2 |
| Server auth and tenant scope | Partial | `apps/api/src/auth`, `AgencyGuard`, `packages/shared/src/tenant-scope.ts` | Local provider hashes passwords in `LocalAuthCredential`. Cognito provider throws. Client agency id is ignored. RLS SQL exists but is not enforced on the owner role yet. | 2, 10 |
| Dealer navigation | Complete | `apps/web/src/app/dealer/layout.tsx` | Includes overview, copilot, leads, buyers, properties, matching, follow-ups, WhatsApp inbox, visits, deals, network, passport, coach, analytics, settings, plus search, notifications, and 3D tours. | 3 |
| Leads CRM | Partial | `/dealer/leads`, API `LeadsController` | Demo list filters and archives in the browser. Detail shows the stored lead. Duplicate merge is not implemented. API CRUD exists but is not the demo UI. | 4 |
| Lead score | Partial | `packages/shared/src/dealer-insights.ts`, lead detail | Rule-based reasons only. Not a purchase prediction. Not shown as the only way to hide a lead. | 4 |
| Buyers | Partial | `/dealer/buyers`, API buyers module | Demo and API models exist. Demo buyer records are lighter than the lead seed. | 4 |
| My / network / builder inventory | Partial | `/dealer/inventory`, `/dealer/network`, property `source` on demo rows | Demo properties carry source labels. Network page is the collaboration directory, not a second inventory grid. Stale dates are stored and flagged on the property page. | 5 |
| Matching | Partial | `/dealer/matching`, `packages/shared/src/matching.ts` | Weighted rules with unknown dimensions excluded. Demo page is thinner than the API matcher. | 5 |
| Copilot | Partial | `/dealer/copilot`, `copilot-mock.ts`, `copilot-tools.ts`, API `/copilot/*`, `docs/copilot.md` | Demo stays deterministic and labelled Demo. Real accounts: `LlmProvider` interface + OpenAI-compatible adapter, 10 allowlisted Zod-validated tools scoped to the session agency, records/missing data/links on every answer, figure check, confirm-gated follow-up write with audit, rate + daily limits, content-free usage log. Verified end to end with a local stand-in model; no real vendor key was used. | 13 |
| WhatsApp inbox | Partial | `/dealer/inbox`, `features/inbox/live-inbox.tsx`, `webhooks.controller.ts`, `inbox.service.ts`, `docs/whatsapp.md` | Demo replies marked simulated. Real accounts: raw-body signature check, DB idempotency, phone-number-id → agency mapping, status merge, opt-out, reviewable extraction without overwrite, confirmed Cloud API send within the 24 h window. No Meta app exists, so it shows Not connected. Templates, media, Messenger/Instagram processing not done. | 14 |
| Follow-ups | Partial | `/dealer/follow-ups`, `POST /copilot/actions/confirm` | Demo reminders stay in the browser with no implied SMS/WhatsApp/push/email. Real follow-ups save on the lead through the API. | 14 |
| Site visits | Partial | `/dealer/site-visits`, API overlap check | Demo list is readable. API blocks overlapping visits in a transaction when the database is used. | 8 |
| Deals and commissions | Partial | `/dealer/deals`, commissions page, API | Demo stages and commission statuses are stored. API requires confirmation for important stage changes. No legal protection claim. | 8 |
| Dealer Passport | Partial | `/dealer/passport`, API `/network/passport` | Demo page is self-declared and badged “Demo profile”. API passport uses platform events only when the database is connected. | 9 |
| Sales Coach | Partial | `/dealer/coach`, `GET /copilot/visit-brief/:id`, `POST /copilot/visit-summary` | Demo labelled Demo. Real accounts: pre-visit brief from saved buyer, lead, property, and activities (no AI); post-visit summary of dealer notes needs a provider and is not auto-saved. No intent or probability claims. | 13 |
| Listing warnings | Partial | `listingWarnings`, property detail | Possible duplicate, missing fields, and stale confirmation. Wording is “Needs verification”, not fraud. | 9 |
| Marketing kit | Partial | Property detail | Copyable drafts from stored facts. Publishing stays off. | 7 |
| Analytics | Partial | `/dealer/analytics`, `GET /analytics/summary` | API aggregates database rows. Demo session shows an empty chart state so sample totals are not drawn as agency analytics. Demo overview counts do come from the seeded store. | 10 |
| Search | Partial | `/dealer/search`, `GET /search` | Demo search is in-memory for this browser. API uses PostgreSQL full text when a token and database exist. | 10 |
| Notifications and jobs | Partial | `/dealer/notifications`, `notification-delivery.ts`, `NotificationDeliveryService` | Notifications persist directly (no in-memory queue). `NotificationDelivery` rows with bounded inline retries, failed list, retry/dismiss. Only a local dev sink exists; no email/SMS/push adapter. No SQS worker, so background delivery is reported unavailable. | 14 |
| 3D tours | Partial | `/dealer/tours`, `/explore/[id]`, `/tours/shared/[token]`, `apps/api/src/reconstruction/tour.service.ts` | Guided upload wizard with validation and consent. Private S3 presigned upload with a server-side `HeadObject` check. Job state machine, a signed provider callback route, attach to property, and hashed, expiring, revocable share links. A secure viewer with video fallback. Without S3, live uploads show a setup state. Demo uploads are a labelled local simulation. The three.js sample scene (orbit, zoom, hotspots, rooms, fullscreen) is labelled "not a reconstruction". No vendor adapter (`docs/reconstruction-provider.md`), so no real 3D output. Real S3 is not exercised. | 15 |
| Public explore | Partial | `/explore` | Fictional listings, labelled demo. | Later |
| AWS deployment | Partial | `infra/terraform`, `docs/aws`, `.github/workflows/ci.yml`, `apps/api/src/config/runtime-env.ts` | Terraform validates without credentials, and CI runs it. Separate local, staging, and production settings with boot-time safety checks. Demo mode is compiled out of production builds. Readiness includes migrations. JSON logs with request ids and an error-reporter hook. Deploy, rollback, cost, and teardown checklists. Never applied, and nothing deployed. Production also needs the Cognito adapter. | 16 |
| Builder workspace | Partial | `/builder`, `/builder/projects/[id]`, `/builder/leads/routing`, `/builder/copilot`, `/builder/audit`, `/builder/3d-tours`, `/dealer/builder-leads`, `packages/shared/src/builder-ops.ts`, `apps/api/src/builder` | Project page has the eleven workspace tabs. Demo account is EstateFlow Developments with fictional inventory, leads, and dealers, labelled DEMO DATA. Matching and copilot read those records; a language model is not called. Live builders see only their organization, with empty states when it has no projects or dealers. 3D processing stays unsent until a real reconstruction adapter exists. Assignment scores stay rule-based. Audit events record the actor. Quality checks say Needs verification or Possible duplicate. List endpoints paginate. Live workspace polls every 20 seconds. No email or SMS is sent. | Builder |

## Empty, loading, and error behaviour

- Dealer overview shows skeletons until the demo store loads, then counts from that store.
- Analytics and notifications show an empty explanation when there is no API token.
- Lead and property detail say the record was not found instead of inventing one.
- Integrations and AI settings say not connected / not configured.
- 3D tours show separate setup cards for storage and provider. The job list polls only while a job is active. The viewer falls back to the walkthrough video when a model is missing or fails to load.

## What this pass changed

- Added this audit.
- Replaced the small Bengaluru demo seed with a fictional Delhi/NCR set under a new storage key so old browser data is left untouched.
- Set the demo dealer name to Raj Mehta and showed the demo agency in the shell.
- Added follow-ups, passport, and sales coach pages.
- Added rule-based lead score, listing warnings, and marketing drafts. Tests cover score wording, duplicate wording, and the “not published” caption.

## Still external

Amazon Cognito, a verified Meta/WhatsApp app, an LLM key, S3, SQS, a reconstruction vendor, and `terraform apply` are not configured. Do not describe those as connected.
