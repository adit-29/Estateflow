# WhatsApp, reminders, and notification delivery

## What exists

| Area | Demo workspace | Real account |
| --- | --- | --- |
| Inbox | Seeded conversations in browser storage. Replies are marked "Simulated demo reply · not sent". | Conversations from signature-verified WhatsApp Cloud API webhooks, stored per agency. |
| Status badge | Always "Not connected". | `Not connected` → `Credentials set · link this agency` → `Linked · waiting for first verified webhook` → `Connected`. |
| Lead extraction | Rule-based draft; fills empty demo lead fields only. | Rule-based draft with per-field confidence. "Review and save" never replaces a saved value unless you tick "Replace it?" for that field. |
| Sending | Adds a simulated message locally. | Preview → "Confirm and send" → Cloud API. Blocked when not connected, opted out, or outside the 24-hour window. |
| Follow-up reminders | Saved in the demo store; no SMS/WhatsApp/push/email. | Saved on the lead through the API (Copilot confirm or lead edit); appear on Follow-ups. |
| Notification delivery | Not shown. | In-app notifications always. External delivery only through a configured provider (none ships yet). |

Facebook Messenger and Instagram webhooks are signature-verified and de-duplicated but not processed.

## Meta app setup (manual, not automated)

1. In Meta for Developers, create an app of type **Business** and add the **WhatsApp** product.
2. Under WhatsApp → API Setup, note the **Phone number ID** of the business number. Use a permanent **System User access token** with `whatsapp_business_messaging` (temporary tokens expire in 24 h).
3. App settings → Basic → copy the **App secret**.
4. Choose a random **verify token** (any string you generate).
5. Set on the API server, via the secrets manager in production:

   ```
   WHATSAPP_PHONE_NUMBER_ID=<phone number id>
   WHATSAPP_ACCESS_TOKEN=<system user token>
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=<your verify token>
   META_APP_SECRET=<app secret>
   WHATSAPP_GRAPH_API_VERSION=v21.0
   ```

6. WhatsApp → Configuration → Webhook: callback URL `https://<api-host>/webhooks/whatsapp`, verify token as above. Subscribe to the **messages** field. Meta calls `GET /webhooks/whatsapp`; the API echoes `hub.challenge` only when the token matches.
7. In EstateFlow, an agency **owner or admin** opens Settings → Integrations → WhatsApp → **Link to this agency**. One number maps to one agency (`ChannelConnection.externalAccountId`, unique per channel).
8. Send a message to the business number. After the signed webhook is processed, the badge shows **Connected** with the webhook time.

Nothing in this repo creates the Meta app, number, or tokens.

## Webhook processing

- `POST /webhooks/*` verifies `X-Hub-Signature-256` (HMAC-SHA256 with `META_APP_SECRET`) over the **raw request bytes** (`rawBody: true` in `main.ts`). A missing secret fails closed with `401`.
- `parseWhatsAppWebhook` extracts messages and statuses. Each has a stable key: `wa:msg:<wamid>` or `wa:status:<wamid>:<status>`.
- Tenant mapping: `metadata.phone_number_id` → `ChannelConnection` for channel `whatsapp`. Unknown numbers are recorded (for de-duplication) but attached to no agency.
- Idempotency and retries: each event is processed in one transaction that starts by inserting its key into `WebhookEvent` (unique). A duplicate delivery hits the unique key and is skipped. If processing fails, the whole transaction rolls back and the endpoint returns an error, so Meta's retry reprocesses it.
- Status handling: `sent < delivered < read`, `failed` is terminal. Out-of-order webhooks never downgrade a status.
- A text of `STOP`, `UNSUBSCRIBE`, or `band karo` sets the conversation's opt-out flag.
- Non-text messages are stored as `[image message — open WhatsApp to view]`; media is not downloaded.

## Sending rules

`POST /inbox/conversations/:id/send` requires `{ text, idempotencyKey (uuid), confirm: true }` and:

- the agency's WhatsApp status is **Connected** (credentials, linked number, verified webhook);
- the contact has not opted out;
- the buyer's last inbound message is under 24 hours old (Meta's customer service window). Outside it, Meta requires an approved template; templates are not implemented, so the send is refused with that reason.

The idempotency key is reserved before calling Meta; a repeated click returns `409` and does not send twice. If Meta rejects the call the reservation is released. Each send writes an `AuditEvent` with the character count, not the text.

## Lead extraction review

`GET /inbox/conversations/:id/extraction` returns the rule-based draft (`extractBuyerRequirement`), per-field confidence, missing fields, and conflicts with the linked lead's saved values. Nothing is written.

`POST .../extraction/save` requires `confirm: true`. It creates a lead if none is linked; otherwise it fills empty fields and lists skipped ones. A saved value changes only when the field is in `overwrite`. The lead must belong to the session agency.

## Notification delivery

- `NotificationSender` interface (shared) with `LocalSinkSender` for development/tests. `NOTIFICATION_SINK=local` enables it for email, SMS, and push; nothing leaves the process.
- No real email, SMS, or push adapter ships. Without the sink, no delivery rows are created and the UI says "Notifications appear in-app only".
- Each delivery is a `NotificationDelivery` row keyed by `notificationId:channel` (unique per agency), attempted inline up to 3 times. After that it is `failed` with the last error. The Notifications page lists failed deliveries with **Retry** and **Dismiss**.
- **Background delivery is unavailable.** There is no SQS worker in this build; `GET /notifications/delivery-status` says so even if `NOTIFICATION_QUEUE_URL` is set. A durable queue would read `pending` rows (the outbox) and call the same `attempt` path.

## Environment variables

See `.env.example`. Required for WhatsApp: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`. Optional: `WHATSAPP_GRAPH_API_VERSION`, `NOTIFICATION_SINK`, `NOTIFICATION_QUEUE_URL`, `AWS_REGION`.

## Tests

- `packages/shared/src/whatsapp-webhook.test.ts`: payload parsing, event keys, status ordering, send eligibility.
- `packages/shared/src/notification-delivery.test.ts`: state machine, local sink idempotency, availability.
- `apps/api/test/webhooks.test.ts`: raw-body signature (including a body that re-serialises differently), tampering, handshake.
- `apps/api/test/messaging-delivery.db.test.ts` (Postgres, `TEST_DATABASE_URL`): Not connected → Connected, duplicate webhook, unknown number, tenant separation, extraction review without overwrite, send confirmation and idempotency, opt-out, delivery retry/dismiss, unconfigured providers.

## Not done

- Template messages (needed outside the 24-hour window) and template approval flow.
- Media download, per-agency tokens in a secrets manager (today one server number maps to one agency), Messenger/Instagram processing.
- Real email/SMS/push adapters and the SQS worker.
