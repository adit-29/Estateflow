# Copilot agent audit

Date: 2026-10-04. Scope: existing Dealer Copilot before the operating-agent phase.

## Existing functionality

| Surface | Behaviour |
| --- | --- |
| Demo `/dealer/copilot` | Browser `answerDemoCopilot` over `ef_demo_store_v2`. Badge `DEMO MODE · Mock AI`. No network. `?q=` auto-asks. |
| Live `/copilot/chat` | AuthGuard + AgencyGuard. Deterministic `routeCopilotQuestion`, else model JSON tool pick. Session `agencyId` only. |
| Live writes | `POST /copilot/actions/confirm` follow-up only (`confirm: true`). Activity + `copilot.follow_up.confirmed` audit. |
| Sales coach | `GET /copilot/visit-brief/:visitId` records-only. `POST /copilot/visit-summary` needs a provider; not saved. |
| Providers | `OpenAiCompatibleProvider` (`/chat/completions`). Hugging Face alias + `HF_TOKEN`. `AI_PROVIDER=mock` = not configured. |
| Usage | `CopilotUsage`: tool, outcome, latency, prompt length. Message text not stored. |

### Existing tools (allowlisted)

`daily_brief`, `prioritize_calls`, `search_leads`, `search_inventory`, `list_visits`, `pipeline_summary`, `pending_commissions`, `find_matches`, `draft_follow_up`. Model must not pick `propose_follow_up` / `propose_site_visit`.

## Current limitations

- One tool per turn. No conversation memory, pronouns, or “second wali”.
- Demo answers are regex branches, not a tool loop. Confirming a visit writes a generic title, not the last matched listing.
- UI is a chat box + chips. No prompt groups, activity history, or page-aware launcher.
- No Ollama adapter. Local Qwen cannot be selected without pretending it is OpenAI-compatible.
- Live matching in the executor uses boolean locality/budget/beds, not `computeMatch` percentages.
- Builder leads, network, notifications, performance, specialization, assignment capacity are not Copilot tools.
- Writes besides follow-up are proposals that open a form. Message send is correctly blocked.
- Chat is not streamed. Provider interface is `complete()` only.
- Conversation is not persisted (by design: CopilotUsage omits content).

## Reusable services (do not duplicate)

| Need | Reuse |
| --- | --- |
| Tenant leads / properties / visits / deals / commissions / buyers | `PrismaCopilotDataSource` |
| Match % | `computeMatch` in `@estateflow/shared` / `MatchingService` |
| Site visit create + overlap | `SiteVisitsService.create` |
| Follow-up write | existing `CopilotService.confirmAction` |
| Intent 0–10 | `scoreBuyerIntent` (explainable rules, not a purchase prediction) |
| Dealer funnel | `dealerPerformance` |
| Builder demo assignments | `dealerLeadViews` + demo builder workspace |
| Inbox / WhatsApp send | messaging layer only after confirm; Copilot drafts only |
| Auth | session cookie; ignore client `agencyId` |

## Missing tools (to add as thin wrappers)

Read: `get_lead`, `search_buyers`, `get_buyer`, `get_property`, `get_network_dealers`, `get_builder_leads`, `get_notifications`, `get_dealer_performance`, `get_dealer_specialization`, `get_assignment_capacity`. Aliases map the spec names onto existing tools (`get_today_priorities` → `daily_brief`, etc.).

Proposal-only: `prepare_message`, `prepare_lead_update`, `prepare_property_update`, `prepare_deal_stage_update`, `prepare_assignment`, `prepare_collaboration_request`. None of these mutate until confirm. Commission / delete / publish stay out of Copilot.

## Demo vs live

| | Demo | Live |
| --- | --- | --- |
| Identity | Raj Mehta, `ef_demo_session` | Cookie session + agency membership |
| Data | Browser demo store + builder workspace | Prisma, agency-scoped |
| LLM | Never | Only if `readAiConfig().configured` |
| Empty CRM | Seeded fiction, labelled DEMO | Honest “CRM mein data nahi hai” — no invented buyers |

## Security (keep)

- Tool args cannot carry tenant id (strict Zod).
- Untrusted CRM text sanitised; `<records>` marked as data; `unsupportedFigures` replaces invented ₹ amounts.
- Prompt injection in notes/DMs is data, not instruction.
- Unknown / invalid / unauthorized tools rejected.
- No SQL, shell, filesystem, AWS, or arbitrary URL tools.
- Demo never substitutes for a live account.

## Implementation notes for this phase

Conversation memory for live is in-process (conversation id + entity refs + short summary). Full message text is not written to `CopilotUsage`. Postgres conversation tables are not added in this phase so existing migrations stay untouched.

Streaming: Ollama `/api/chat` is called with `stream: false` for a complete answer. The UI shows a generic “EstateFlow is checking your CRM…” spinner, then the **actual** `toolActivity` list from the backend. Token streaming is left as a follow-up; we do not animate fake tool names.
