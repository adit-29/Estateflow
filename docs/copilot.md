# Dealer Copilot: provider setup, tools, limits

## Modes

| Workspace | What answers | Label |
| --- | --- | --- |
| Demo (`ef_workspace_mode=demo`) | `runDemoAgent` over the seeded demo store in the browser. No network call. | `DEMO AI` |
| Real account, no provider | Nothing. `/copilot/chat` returns `503 ai_not_configured` with setup guidance. Demo answers are never substituted. | `Live AI is not configured yet.` / `AI provider not configured` |
| Real account, provider set but not yet called successfully | Live answers from API records. | `Configured · not yet verified` |
| Real account, provider verified | Live answers from API records. | `Live · <model>` |

"Verified" means the API process has received a non-empty answer from the provider since it started (Test connection or a chat). It resets on restart.

## Provider configuration (server only)

The browser never sees the key, the system prompts, or the model's raw output beyond the final answer text.

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `mock` (default) keeps Copilot unconfigured. `ollama`, `openai-compatible`, `huggingface`, or `hf` enable a live adapter. |
| `AI_BASE_URL` | For `ollama`, defaults to `http://localhost:11434`. For `openai-compatible`, required. For `huggingface` / `hf`, defaults to `https://router.huggingface.co/v1`. |
| `AI_API_KEY` | Bearer key for OpenAI-compatible and Hugging Face. Not required for `ollama`. |
| `HF_TOKEN` | Used when `AI_PROVIDER` is `huggingface` or `hf` and `AI_API_KEY` is empty. |
| `AI_MODEL` | Model id. Ollama defaults to `qwen3:8b`. Hugging Face uses a router model id. |
| `AI_REQUEST_TIMEOUT_MS` | Per-request timeout, clamped to 1–120 s. Default 30 s. |
| `AI_MAX_OUTPUT_TOKENS` | Upper bound on `max_tokens`, clamped to 16–4000. Default 800. |
| `AI_DAILY_REQUEST_LIMIT` | Requests per agency per India calendar day. Blank or invalid = 300. |
| `AI_CHAT_RATE_LIMIT_PER_MIN` | `/copilot/chat` requests per client IP per minute. Default 10. |

### Local Ollama (Qwen)

Assume Ollama is already running separately. The web app does not download model files.

```env
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434
AI_MODEL=qwen3:8b
AI_API_KEY=
AI_MAX_OUTPUT_TOKENS=1200
AI_REQUEST_TIMEOUT_MS=30000
```

`ConfiguredOllamaProvider` calls native `POST /api/chat` with `stream: false`. Provider-specific translation stays in that class. For production, point `AI_BASE_URL` and `AI_MODEL` at a secure remote model service.

### Hugging Face

Set `AI_PROVIDER=huggingface` (or `hf`), `AI_MODEL` to any chat model the [Hugging Face router](https://router.huggingface.co/v1) exposes, and `HF_TOKEN` or `AI_API_KEY`. Leave `AI_BASE_URL` blank to use `https://router.huggingface.co/v1`. The API still talks OpenAI-compatible `/chat/completions`; there is no browser key and no fake model. Demo Copilot never reads these values.

After setting them, restart the API and use **Settings → AI → Test connection**.

### Changing vendor

Code depends on the `LlmProvider` interface in `apps/api/src/copilot/llm-provider.ts` (`status`, `testConnection`, `complete`). `ConfiguredOllamaProvider` implements native Ollama `/api/chat`. `OpenAiCompatibleProvider` implements `/chat/completions` for OpenAI-compatible gateways, Gemini proxies, Hugging Face, vLLM, and hosted Hugging Face inference. Bind the selected class to `LLM_PROVIDER` in `copilot.module.ts`. The tools, controller, and UI do not change.

## Request flow

1. `AuthGuard` + `AgencyGuard` resolve the dealer and agency from the session cookie. Any `x-agency-id` or `agencyId` from the browser is ignored.
2. `routeCopilotQuestion` (shared) maps common Hindi/English phrasing to a tool deterministically.
3. If nothing matches, the model is asked to pick one **read-only** tool as JSON. The choice is validated by `parseToolCall` against `MODEL_SELECTABLE_TOOLS` and strict Zod schemas. Unknown tools, unknown keys (including `agencyId`), and out-of-range values are rejected; the dealer gets a list of supported questions instead.
4. `executeCopilotTool` runs the tool with the **session** agency id through `PrismaCopilotDataSource`.
5. If the tool found no records, the model is not called; the dealer sees the record summary and a focused follow-up question.
6. Otherwise the model receives the question plus the records inside a `<records>` block marked as data. Record text is stripped of control characters and delimiter spoofing and capped in length.
7. `unsupportedFigures` checks every ₹ / lakh / crore amount in the answer against numeric record fields. If any amount is not in the records, the answer is replaced by the deterministic summary with a visible notice.
8. The response carries the supporting records (type, id, fields, link, updated date), missing or stale data, and the ordering rules where relevant.

### Tools

| Tool | Reads | Notes |
| --- | --- | --- |
| `daily_brief` | follow-ups due by end of today, today's visits | Counts active leads with no follow-up date. |
| `prioritize_calls` | active leads | Transparent rules: overdue → due today → negotiation/visit scheduled. No intent or probability scoring. |
| `search_leads` | leads | Optional text query, due-only. |
| `search_inventory` | active listings | Locality, max price, bedrooms. Flags missing price and availability not confirmed in 30 days. |
| `list_visits` | site visits | today / tomorrow (India calendar day) / upcoming. |
| `pipeline_summary` | deals | Sums only stored values; reports deals without a value. |
| `pending_commissions` | commission agreements | Amount = fixed amount, or percentage × deal value; otherwise "not recorded". |
| `find_matches` | buyer requirements × active listings | Pair shown only when locality, budget, bedrooms don't conflict. Gaps listed. |
| `draft_follow_up` | one lead | Returns a draft. Never sends. |
| `propose_follow_up` | one lead | Preview only; only from an explicit user request, never model-selected. |

## Write safety

- The only write Copilot can perform is setting a lead's next follow-up, via `POST /copilot/actions/confirm` with the previewed values and `"confirm": true`. It re-checks the lead belongs to the session agency, writes an `Activity` and an `AuditEvent` (`copilot.follow_up.confirmed`).
- There is no Copilot path to send a message, change commission terms, delete a record, or change a deal stage. The confirm schema accepts only `kind: "follow_up"`.
- Drafted messages are shown with a copy button and "EstateFlow does not send this".

## Sales Coach

- `GET /copilot/visit-brief/:visitId` builds the pre-visit brief from saved buyer requirement, lead, property facts, and the last five activities. No model call; it works without a provider. It lists what to confirm (missing budget, unconfirmed availability, no must-haves).
- `POST /copilot/visit-summary` summarises the dealer's own notes into reaction / concerns / next step. It needs a provider, is not saved automatically, and is instructed not to predict purchase likelihood.

## Usage logging and cost control

Each chat writes a `CopilotUsage` row: agency, account, tool, outcome (`ok`, `no_tool`, `unsupported_figures`, `provider_timeout`, …), latency, and question length. **Message text, record contents, and model output are not stored.** Use it to watch volume per agency.

Cost levers: `AI_DAILY_REQUEST_LIMIT`, `AI_CHAT_RATE_LIMIT_PER_MIN`, `AI_MAX_OUTPUT_TOKENS`, the deterministic router (most common questions skip the tool-selection call), and skipping the model when a tool returns no records. A typical chat is one model call; an unrouted question is two.

## Failure behaviour

Provider errors become `503` with a code (`ai_timeout`, `ai_http_error`, `ai_network`, `ai_empty`) and a safe message. No vendor error body or key is returned. The UI keeps the question for retry.

## Tests

- `packages/shared/src/copilot-tools.test.ts`: allowlist, invalid args, browser agency id rejected, Hindi routing, injection framing, fabricated figures, priority rules.
- `apps/api/test/copilot-tools.test.ts`: tenant scope, not-configured, injection, fabricated-figure replacement, invalid model tool choice, no-record skip, provider failure + usage logging without content, confirmation gate, provider adapter.
- `apps/api/test/messaging-delivery.db.test.ts` (with `TEST_DATABASE_URL`): Prisma data source tenant scope and confirmed write against Postgres.
