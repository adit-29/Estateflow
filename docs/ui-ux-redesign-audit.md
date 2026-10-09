# EstateFlow UI/UX redesign audit

Written from the current routes and components before the Phase 5 visual pass. Functionality listed here must stay.

## Public

| Route | Current problem | Redesign | Must keep |
| --- | --- | --- | --- |
| `/` | Centered SaaS hero, fake-looking dashboard mock, four generic cards, unused whitespace | Cinematic hero, explore search, featured demo listings, 3D, dealer/builder/buyer story | `/explore`, `/auth/sign-in`, `/get-started`, no invented stats |
| `/explore` | Functional filters, muted image blocks | Keep filter contract (`q`, `purpose`, `beds`, `maxPrice`); richer cards | `filterListings`, demo flag |
| `/explore/[id]` | Works; gallery is a muted block | Keep sample 3D disclaimer and demo enquiry | Listing not found, no fake booking |

## Dealer

| Route | Current problem | Redesign | Must keep |
| --- | --- | --- | --- |
| `/dealer` | KPI grid without definitions or next step | Daily brief from stored demo/live records, click-through KPIs | Demo store vs `LiveAgencyView`; no invented live numbers |
| `/dealer/leads` | Admin table | Page purpose, Add lead, card on mobile | Demo CRM + API path |
| `/dealer/copilot` | Chat-first | Prompt cards + record answers | Confirm-gated writes, demo label |
| Sidebar | Flat ungrouped list | Grouped WORK / NETWORK / BUSINESS / TOOLS / SYSTEM | Existing hrefs, builder-leads |

## Builder

| Route | Current problem | Redesign | Must keep |
| --- | --- | --- | --- |
| `/builder` | KPI grid only | Sales health, routing, inventory alerts | `builderKpis`, DEMO DATA banner |
| `/builder/projects/[id]` | Tabs exist | Primary actions: Add unit, Upload media, Create 3D tour | Existing actions |
| `/builder/leads/[id]` | Assign works | “Assign this buyer” language | Ranked dealers, no close prediction |
| `/builder/3d-tours` | Wizard works | Visual stepper | Demo reconstruction wording |

## Buyer / seller

Keep demo isolation and amber demo banners. Buyer home should read as discovery, not CRM. Seller stays a listing + enquiry preview.

## Reusable components

`PageHeader`, grouped `AppShell` nav, `EmptyState`, `ErrorState`, `MetricCard` with definition, public `HeroVideo`. Do not duplicate property or lead cards per role unless the data shape differs.

## Unchanged

Auth, Prisma, matching, reconstruction providers, WhatsApp, tenant isolation, demo vs live stores.
