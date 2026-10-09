export type WhatsAppDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type WhatsAppWebhookEvent =
  | {
      kind: 'message';
      eventKey: string;
      phoneNumberId: string;
      from: string;
      contactName: string | null;
      providerMessageId: string;
      at: Date;
      messageType: string;
      text: string | null;
    }
  | {
      kind: 'status';
      eventKey: string;
      phoneNumberId: string;
      providerMessageId: string;
      status: WhatsAppDeliveryStatus;
      at: Date;
      errorCode: number | null;
    };

const STATUSES: WhatsAppDeliveryStatus[] = ['sent', 'delivered', 'read', 'failed'];

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function at(timestamp: unknown): Date {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date();
}

/** Parses a WhatsApp Cloud API webhook body. Unknown shapes are skipped, never thrown. */
export function parseWhatsAppWebhook(body: unknown): WhatsAppWebhookEvent[] {
  const events: WhatsAppWebhookEvent[] = [];
  const root = body as { object?: unknown; entry?: unknown };
  if (root?.object !== 'whatsapp_business_account' || !Array.isArray(root.entry)) return events;

  for (const entry of root.entry as { changes?: unknown }[]) {
    if (!Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes as { field?: unknown; value?: Record<string, unknown> }[]) {
      if (change?.field !== 'messages' || !change.value) continue;
      const value = change.value;
      const phoneNumberId = str((value.metadata as { phone_number_id?: unknown } | undefined)?.phone_number_id);
      if (!phoneNumberId) continue;

      const contacts = Array.isArray(value.contacts) ? (value.contacts as { wa_id?: unknown; profile?: { name?: unknown } }[]) : [];
      for (const msg of Array.isArray(value.messages) ? (value.messages as Record<string, unknown>[]) : []) {
        const id = str(msg.id);
        const from = str(msg.from);
        if (!id || !from) continue;
        const contact = contacts.find((c) => c.wa_id === from);
        const type = str(msg.type) ?? 'unknown';
        events.push({
          kind: 'message',
          eventKey: `wa:msg:${id}`,
          phoneNumberId,
          from,
          contactName: str(contact?.profile?.name),
          providerMessageId: id,
          at: at(msg.timestamp),
          messageType: type,
          text: type === 'text' ? str((msg.text as { body?: unknown } | undefined)?.body) : null,
        });
      }

      for (const st of Array.isArray(value.statuses) ? (value.statuses as Record<string, unknown>[]) : []) {
        const id = str(st.id);
        const status = str(st.status) as WhatsAppDeliveryStatus | null;
        if (!id || !status || !STATUSES.includes(status)) continue;
        const errors = Array.isArray(st.errors) ? (st.errors as { code?: unknown }[]) : [];
        events.push({
          kind: 'status',
          eventKey: `wa:status:${id}:${status}`,
          phoneNumberId,
          providerMessageId: id,
          status,
          at: at(st.timestamp),
          errorCode: typeof errors[0]?.code === 'number' ? (errors[0].code as number) : null,
        });
      }
    }
  }
  return events;
}

const ORDER: Record<WhatsAppDeliveryStatus, number> = { sent: 1, delivered: 2, read: 3, failed: 4 };

/** Webhooks can arrive out of order; a later "sent" must not overwrite "read". "failed" is terminal. */
export function mergeDeliveryStatus(current: string | null, incoming: WhatsAppDeliveryStatus): WhatsAppDeliveryStatus {
  const cur = current && current in ORDER ? (current as WhatsAppDeliveryStatus) : null;
  if (!cur || cur === 'failed') return cur ?? incoming;
  return ORDER[incoming] > ORDER[cur] ? incoming : cur;
}

export const WHATSAPP_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SendEligibility = { allowed: true } | { allowed: false; reason: string };

/** Free-form text is only allowed inside the 24-hour customer service window. Outside it Meta requires an approved template. */
export function whatsappSendEligibility(input: {
  optOut: boolean;
  lastInboundAt: Date | null;
  now: Date;
}): SendEligibility {
  if (input.optOut) return { allowed: false, reason: 'This contact has opted out of WhatsApp messages.' };
  if (!input.lastInboundAt) {
    return { allowed: false, reason: 'The contact has not messaged you yet. An approved template is required, and templates are not set up.' };
  }
  if (input.now.getTime() - input.lastInboundAt.getTime() > WHATSAPP_SERVICE_WINDOW_MS) {
    return { allowed: false, reason: 'The 24-hour reply window has closed. An approved template is required, and templates are not set up.' };
  }
  return { allowed: true };
}
