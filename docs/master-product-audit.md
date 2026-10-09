# EstateFlow master product audit

Written 2026-10-01 from the current repository (Next.js 15 web, NestJS 10 API, Prisma 6, `@estateflow/shared`). Status is Complete / Partial / Missing against this transformation spec. Functioning backend, auth, matching, messaging, reconstruction, and tenant isolation must stay.

How to read status:

- **Complete** — main flow works on stored records and does not fake an external system.
- **Partial** — a real slice exists; UX or coverage is incomplete.
- **Missing** — no working flow for the requested behaviour.

Demo dealer UI uses `localStorage` (`ef_demo_store_v2`). Demo builder uses `ef_builder_workspace_v1`. Live CRM uses Postgres via Nest. They must not mix.

## Product map

| Feature | Route | Status | Existing implementation | UX problem | Backend problem | Preserve | Improve | New work |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public landing | `/` | Partial | Cinematic hero, poster/`NEXT_PUBLIC_HERO_VIDEO_URL`, search → `/explore`, demo listings, 3D/dealer/builder story | English copy; Buy/Rent skip requirement capture; no video bundled | None | Hero contract, no invented URL, demo labels | Hinglish helper copy, link Buy/Rent/Projects to guided flows | Area control, richer search panel |
| Explore | `/explore`, `/explore/[id]` | Partial | `filterListings` (q, purpose, type, beds, min/max price); demo 3D disclaimer | Grid-first; muted gallery | Public listings are demo-only | Demo flag, no fake booking | Result cards with 3D availability from stored fields | Requirement summary from `/buy` `/rent` |
| Buy requirement | `/buy` | Partial | Guided Hinglish wizard then `matchPublicListings` | — | Public listings demo-only | Explore contract | Requirement summary | More live public inventory |
| Rent requirement | `/rent` | Partial | Rent-specific wizard; `/month` display | — | Deposit optional | Purpose filter | Rent extras | Live rentals |
| Public projects | `/projects`, `/projects/[id]` | Partial | Demo builder workspace published projects | — | Org-private live projects | Demo labelling | Dedicated project cards | Live public publish |
| Sign-in role pick | `/auth/sign-in`, `/get-started` | Complete | Role cards; no dealer default | — | — | Demo vs live isolation | — | Cognito adapter |
| Dealer shell | `/dealer/*` | Partial | Auto-hide + pin, grouped nav, Ctrl+K | — | Session cookie/demo | Hrefs, demo badge | Hinglish helpers | Command overlay |
| Leads | `/dealer/leads`, `/dealer/leads/[id]` | Partial | Intent 0–10, filters, journeys, pitch from stored facts | — | API unused by demo UI | CRM + API | Wire live intent | Live feature store |
| Copilot | `/dealer/copilot` | Partial | Site-visit proposal, pitch/stale tools, confirm-gated writes | — | No SQL/files | Allowlist, DEMO/LIVE | More CRM tools | Optional auto-send stays off |
| Follow-ups | `/dealer/follow-ups` | Partial | Simulated drafts, no auto-send | — | Confirm-gated copilot write | No auto-send | — | — |
| Builder leads (dealer) | `/dealer/builder-leads` | Partial | Stage groups, why-you-received | — | Assignment machine | Hidden contact | Timers | — |
| Analytics | `/dealer/performance`, `/dealer/analytics` | Partial | Funnel from stored rows; Delhi rank withheld | — | Honest empty live | No hardcoded live KPIs | Cohort when population exists | — |
| Search / notifications | `/dealer/search` | Partial | Grouped buyers/properties/deals/visits; live GET /search | — | Tenant scoped | Ctrl+K | Overlay palette | — |
| Builder portal | `/builder/*` | Partial | Monthly lead limit, layout editor `/builder/units/[id]/layout` | — | Org isolation | Ranked assignment | Hinglish | Live layoutJson column |
| Dealer overview | `/dealer` | Partial | Daily brief, defined KPIs, attention, matches, pipeline from demo store; live uses `LiveAgencyView` | — | Live path must not use demo store | Metric definitions, demo isolation | — | — |
| Buyers | `/dealer/buyers`, `/dealer/buyers/[id]` | Partial | Derived from demo leads; lead detail has drop-off + pitch | Light buyers list | API buyers module exists | Isolation | Requirement-centric list | — |
| Inventory | `/dealer/inventory` | Partial | My/Network/Builder tabs; stale labels | Builder tab empty by design | Properties API | Source labels, no fake feed | Freshness, match buyers CTA | — |
| Matching | `/dealer/matching` | Partial | Demo locality/beds; API `computeMatch`; public buy/rent uses matcher | Thin vs API matcher | Weighted unknown excluded | Weights, honesty | Wire demo UI to `computeMatch` | — |
| Inbox | `/dealer/inbox` | Partial | Demo simulated; live webhook + Cloud API when connected | Still channel-first | Signature + idempotency | Not connected honesty | Hinglish empty | — |
| Site visits / deals / commissions | `/dealer/site-visits`, `/dealer/deals` | Partial | Demo lists; API overlap + confirm stages | Kanban light | No invented paid cash | Commission statuses | Outcome recording | — |
| Network / passport / coach | `/dealer/network`, `/passport`, `/coach` | Partial | Invite demo; passport self-declared; coach from records; specialization on `/dealer/performance` | Weak collaboration | Passport API is platform events | Demo vs verified split | — | Cohort when population exists |
| Dealer 3D | `/dealer/tours` | Partial | Job SM, S3 presign, sample scene | Sample vs scan mixed in mind | No vendor adapter | Disclaimers | Distinct layout vs scan | Layout editor for authorized dealer inventory |
| Buyer portal | `/buyer/*` | Partial | Discover/save/enquiry demo | CRM-ish | Isolated demo | Amber banner | Discovery language | Requirement reuse from `/buy` |
| Seller | `/seller/*` | Partial | Local listings | Preview only | Not public | Local-only honesty | Hinglish | — |
| Matching engine | shared `matching.ts` | Complete (rules) | Weighted dimensions, unknown excluded | — | Not ML | Weights | Used on public buy/rent | — |
| Lead score | `intent-score.ts` + `dealer-insights.ts` | Partial | 0–10 explainable signals + older 0–100 checklist | Live CRM not yet on 0–10 | No labelled training set | “Not a purchase prediction” | Wire live feature store | Train only after ≥200 labels |
| Assignment | `rankDealers` | Complete (rules) | 100-pt factors, monthly lead cap exclude | — | LLM must not score | Compatibility language | Persist monthly limit live | Future ML ranking stub |
| Messaging | WhatsApp | Partial | Verify, de-dupe, confirm send | Meta not connected | — | Not connected | — | Messenger/IG later |
| Notifications | API + UI | Partial | Local sink, idempotent | No email/SMS | SQS optional | — | Link to records | — |
| Reconstruction | `ReconstructionProvider` | Partial | SM + sample viewer; layout → boxes labelled generated-from-layout | Layout vs scan | Unimplemented vendor throws | Never fake % | — | Vendor adapter |
| Auth | Local + Cognito stub | Partial | Role picker; hashed local; Cognito throws | — | Session cookie | No plaintext | — | Cognito adapter still required |
| Tenant isolation | Guards + tests | Partial | Agency/org from session | RLS not on owner | — | Ignore client org ids | — | — |
| Typography / DS | Tailwind tokens | Partial | Type scale (hero/page/body/kpi), auto-hide nav | — | — | Color tokens | More surfaces on tokens | — |
| Tests | shared/web/api | Partial | Security, matching, copilot, intent, layout, builder | DB tests skipped without `TEST_DATABASE_URL` | — | Existing suites | — | — |

## What must not be rewritten

- Prisma models and existing migrations (additive only)
- `AuthGuard` / `BuilderGuard` identity from session
- Demo vs live stores
- `computeMatch`, `rankDealers`, copilot allowlist
- Reconstruction provider contract
- WhatsApp signature + idempotency
- Sample 3D “not a reconstruction” copy

## External (still not connected)

Cognito, LLM vendor key, S3, SQS, Meta WhatsApp app, reconstruction vendor, terraform apply.

## Block plan used after this audit

1. Design system + auto-hide shell  
2. Landing Hinglish + `/buy` `/rent` `/projects` + sign-in roles  
3. Dealer leads/buyers/intent UI  
4. Builder assignment limits + layout route  
5. Buyer/property 3D honesty  
6. Copilot actions  
7. Intent/performance/specialization  
8. ML registry (no fake training)  
9. Layout editor + generated-from-layout viewer  
10. Search/notifications polish + lint/typecheck/tests/build
