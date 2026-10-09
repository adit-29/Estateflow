import { describe, expect, it, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { assertTenant, verifyMetaSignature } from '../src/messaging/webhook-security';
import { WebhooksController } from '../src/messaging/webhooks.controller';
import type { WhatsAppWebhookService } from '../src/messaging/whatsapp-webhook.service';

const sign = (body: string | Buffer, secret = 'secret') => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('webhook security', () => {
  it('rejects an invalid signature', () => {
    expect(verifyMetaSignature('{"a":1}', 'sha256=deadbeef', 'secret')).toBe(false);
  });

  it('accepts a valid Meta-style signature', () => {
    const body = '{"object":"page"}';
    expect(verifyMetaSignature(body, sign(body), 'secret')).toBe(true);
  });

  it('fails closed when the app secret is not configured', () => {
    const body = '{"object":"page"}';
    expect(verifyMetaSignature(body, sign(body), undefined)).toBe(false);
  });

  it('blocks cross-tenant conversation access', () => {
    expect(assertTenant('agency-a', 'agency-b')).toBe(false);
    expect(assertTenant('agency-a', 'agency-a')).toBe(true);
  });
});

describe('webhooks controller', () => {
  const processed: unknown[] = [];
  const fakeService = {
    process: async (events: unknown[]) => {
      processed.push(...events);
      return { processed: events.length, duplicates: 0, unmapped: 0 };
    },
    recordOnly: async () => ({ duplicate: false }),
  } as unknown as WhatsAppWebhookService;
  const controller = new WebhooksController(fakeService);

  beforeEach(() => {
    processed.length = 0;
    process.env.META_APP_SECRET = 'secret';
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify-me';
  });

  // Meta's bytes include spacing and unicode escapes that JSON.stringify would not reproduce.
  const raw = Buffer.from(
    '{ "object": "whatsapp_business_account", "entry": [ { "id": "W", "changes": [ { "field": "messages", "value": { "metadata": { "phone_number_id": "P" }, "messages": [ { "from": "91", "id": "wamid.1", "timestamp": "1790000000", "type": "text", "text": { "body": "\\u0928\\u092e\\u0938\\u094d\\u0924\\u0947" } } ] } } ] } ] }',
  );

  it('verifies the signature over the raw bytes, not re-serialised JSON', async () => {
    const req = { rawBody: raw, body: JSON.parse(raw.toString()) } as never;
    expect(verifyMetaSignature(JSON.stringify(JSON.parse(raw.toString())), sign(raw), 'secret')).toBe(false);
    const out = await controller.whatsappEvents(req, sign(raw));
    expect(out).toMatchObject({ ok: true, received: 1, processed: 1 });
    expect(processed).toHaveLength(1);
  });

  it('rejects a tampered body or a missing signature before processing anything', async () => {
    const tampered = Buffer.from(raw.toString().replace('wamid.1', 'wamid.2'));
    await expect(controller.whatsappEvents({ rawBody: tampered, body: JSON.parse(tampered.toString()) } as never, sign(raw))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.whatsappEvents({ rawBody: raw, body: {} } as never, undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(processed).toHaveLength(0);
  });

  it('answers the verification handshake only with the right token', () => {
    expect(controller.verifyWhatsApp({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '42' })).toBe('42');
    expect(() => controller.verifyWhatsApp({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '42' })).toThrow(UnauthorizedException);
  });
});
