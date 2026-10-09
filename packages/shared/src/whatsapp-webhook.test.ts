import { describe, expect, it } from 'vitest';
import { mergeDeliveryStatus, parseWhatsAppWebhook, whatsappSendEligibility } from './whatsapp-webhook';

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '15550000000', phone_number_id: 'PNID_1' },
            contacts: [{ wa_id: '919800000001', profile: { name: 'Test Buyer' } }],
            messages: [
              { from: '919800000001', id: 'wamid.A', timestamp: '1790000000', type: 'text', text: { body: 'Dwarka 3BHK 1.5 crore' } },
              { from: '919800000001', id: 'wamid.B', timestamp: '1790000001', type: 'image' },
            ],
            statuses: [{ id: 'wamid.OUT', status: 'delivered', timestamp: '1790000002', recipient_id: '919800000001' }],
          },
        },
      ],
    },
  ],
};

describe('WhatsApp webhook parsing', () => {
  it('extracts messages and statuses with stable event keys and the phone number id', () => {
    const events = parseWhatsAppWebhook(payload);
    expect(events.map((e) => e.eventKey)).toEqual(['wa:msg:wamid.A', 'wa:msg:wamid.B', 'wa:status:wamid.OUT:delivered']);
    expect(events.every((e) => e.phoneNumberId === 'PNID_1')).toBe(true);
    expect(events[0]).toMatchObject({ kind: 'message', contactName: 'Test Buyer', text: 'Dwarka 3BHK 1.5 crore' });
    expect(events[1]).toMatchObject({ kind: 'message', text: null, messageType: 'image' });
  });

  it('ignores unrelated or malformed bodies', () => {
    expect(parseWhatsAppWebhook({ object: 'page', entry: [] })).toEqual([]);
    expect(parseWhatsAppWebhook(null)).toEqual([]);
    expect(parseWhatsAppWebhook({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {} }] }] })).toEqual([]);
  });

  it('does not downgrade delivery status when webhooks arrive out of order', () => {
    expect(mergeDeliveryStatus('read', 'sent')).toBe('read');
    expect(mergeDeliveryStatus('sent', 'delivered')).toBe('delivered');
    expect(mergeDeliveryStatus('failed', 'read')).toBe('failed');
    expect(mergeDeliveryStatus(null, 'sent')).toBe('sent');
  });
});

describe('WhatsApp send eligibility', () => {
  const now = new Date('2026-09-26T10:00:00Z');
  it('blocks opted-out contacts and closed service windows', () => {
    expect(whatsappSendEligibility({ optOut: true, lastInboundAt: now, now }).allowed).toBe(false);
    expect(whatsappSendEligibility({ optOut: false, lastInboundAt: null, now }).allowed).toBe(false);
    expect(whatsappSendEligibility({ optOut: false, lastInboundAt: new Date('2026-09-25T09:00:00Z'), now }).allowed).toBe(false);
    expect(whatsappSendEligibility({ optOut: false, lastInboundAt: new Date('2026-09-26T09:00:00Z'), now })).toEqual({ allowed: true });
  });
});
