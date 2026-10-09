/**
 * Runs against a real Postgres when TEST_DATABASE_URL is set (migrations applied). Skipped otherwise.
 *   TEST_DATABASE_URL=postgresql://user@localhost:5432/estateflow_test npm test -w @estateflow/api
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HttpException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LocalSinkSender, parseWhatsAppWebhook } from '@estateflow/shared';
import type { PrismaService } from '../src/prisma/prisma.service';
import { PrismaCopilotDataSource } from '../src/copilot/copilot-data';
import { CopilotService } from '../src/copilot/copilot.service';
import { OpenAiCompatibleProvider } from '../src/copilot/configured-llm.provider';
import { WhatsAppWebhookService } from '../src/messaging/whatsapp-webhook.service';
import { InboxService } from '../src/messaging/inbox.service';
import { WhatsAppCloudApiProvider } from '../src/messaging/providers';
import { NotificationDeliveryService } from '../src/notifications/notification-delivery.service';

const url = process.env.TEST_DATABASE_URL;
const run = describe.skipIf(!url);

async function statusOf(p: Promise<unknown>) {
  try {
    await p;
    return 200;
  } catch (e) {
    return e instanceof HttpException ? e.getStatus() : 500;
  }
}

function waPayload(phoneNumberId: string, messages: unknown[] = [], statuses: unknown[] = []) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { metadata: { phone_number_id: phoneNumberId }, contacts: [{ wa_id: '919811111111', profile: { name: 'Priya Buyer' } }], messages, statuses } }] }],
  };
}

run('Phase 13/14 against Postgres', () => {
  let prisma: PrismaService;
  const ids = {} as Record<'agencyA' | 'agencyB' | 'ownerA' | 'memberA' | 'ownerB' | 'leadA' | 'leadB' | 'propA' | 'propB', string>;
  const env = { ...process.env };

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } }) as unknown as PrismaService;
    await prisma.$executeRawUnsafe(
      'TRUNCATE "NotificationDelivery","Notification","CopilotUsage","WebhookEvent","Message","Conversation","ChannelConnection","Activity","AuditEvent","CommissionAgreement","Deal","SiteVisit","Property","Lead","DealerMembership","Agency","Account" CASCADE',
    );
    const mkAccount = (email: string) => prisma.account.create({ data: { subjectId: `local:${email}`, email, role: 'dealer', emailVerified: true } });
    const [ownerA, memberA, ownerB] = await Promise.all([mkAccount('a@example.test'), mkAccount('m@example.test'), mkAccount('b@example.test')]);
    const agencyA = await prisma.agency.create({ data: { name: 'Agency A' } });
    const agencyB = await prisma.agency.create({ data: { name: 'Agency B' } });
    await prisma.dealerMembership.createMany({
      data: [
        { agencyId: agencyA.id, accountId: ownerA.id, role: 'owner' },
        { agencyId: agencyA.id, accountId: memberA.id, role: 'member' },
        { agencyId: agencyB.id, accountId: ownerB.id, role: 'owner' },
      ],
    });
    const leadA = await prisma.lead.create({
      data: { agencyId: agencyA.id, name: 'Ananya Sharma', phone: '+919800000001', source: 'referral', preferredLocalities: [], budgetBand: 'Up to ₹1.2 Cr', nextFollowUpAt: new Date(Date.now() - 86_400_000) },
    });
    const leadB = await prisma.lead.create({
      data: { agencyId: agencyB.id, name: 'Ananya Other', phone: '+919800000002', source: 'referral', preferredLocalities: ['Dwarka'], nextFollowUpAt: new Date(Date.now() - 86_400_000) },
    });
    const propA = await prisma.property.create({
      data: { agencyId: agencyA.id, title: 'Dwarka Sec 12 3BHK', locality: 'Dwarka', propertyType: 'flat', bedrooms: 3, priceAmount: 14_500_000, transactionType: 'sale', listingStatus: 'active', lastConfirmedAt: new Date() },
    });
    const propB = await prisma.property.create({
      data: { agencyId: agencyB.id, title: 'Dwarka B listing', locality: 'Dwarka', propertyType: 'flat', bedrooms: 3, priceAmount: 9_000_000, transactionType: 'sale', listingStatus: 'active' },
    });
    Object.assign(ids, { agencyA: agencyA.id, agencyB: agencyB.id, ownerA: ownerA.id, memberA: memberA.id, ownerB: ownerB.id, leadA: leadA.id, leadB: leadB.id, propA: propA.id, propB: propB.id });
  });

  afterAll(async () => {
    process.env = env;
    await prisma.$disconnect();
  });

  describe('Copilot data source and confirmation', () => {
    it('reads only the session agency from Postgres', async () => {
      const data = new PrismaCopilotDataSource(prisma);
      const leads = await data.leads(ids.agencyA, { name: 'Ananya', take: 10 });
      expect(leads.map((l) => l.id)).toEqual([ids.leadA]);
      const props = await data.activeProperties(ids.agencyA, { locality: 'dwarka', maxPrice: 15_000_000, bedrooms: 3, take: 10 });
      expect(props.map((p) => p.id)).toEqual([ids.propA]);
      expect(props[0].priceAmount).toBe(14_500_000);
      const due = await data.leads(ids.agencyB, { dueBefore: new Date(), activeOnly: true, take: 10 });
      expect(due.map((l) => l.id)).toEqual([ids.leadB]);
    });

    it('writes a confirmed follow-up with activity and audit rows, and refuses cross-agency leads', async () => {
      const svc = new CopilotService(new OpenAiCompatibleProvider(), prisma, new PrismaCopilotDataSource(prisma));
      const dueAt = new Date(Date.now() + 86_400_000).toISOString();
      expect(await statusOf(svc.confirmAction({ agencyId: ids.agencyA, accountId: ids.ownerA, body: { kind: 'follow_up', leadId: ids.leadB, dueAt, confirm: true } }))).toBe(404);
      await svc.confirmAction({ agencyId: ids.agencyA, accountId: ids.ownerA, body: { kind: 'follow_up', leadId: ids.leadA, dueAt, confirm: true } });
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: ids.leadA } });
      expect(lead.nextFollowUpAt?.toISOString()).toBe(dueAt);
      expect(await prisma.auditEvent.count({ where: { action: 'copilot.follow_up.confirmed', entityId: ids.leadA } })).toBe(1);
      const other = await prisma.lead.findUniqueOrThrow({ where: { id: ids.leadB } });
      expect(other.nextFollowUpAt!.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('WhatsApp webhooks, inbox, and sends', () => {
    let webhook: WhatsAppWebhookService;
    let provider: WhatsAppCloudApiProvider;
    let inbox: InboxService;
    const graphCalls: { url: string; body: unknown }[] = [];

    beforeAll(async () => {
      Object.assign(process.env, {
        WHATSAPP_PHONE_NUMBER_ID: 'PNID_A',
        WHATSAPP_ACCESS_TOKEN: 'test-token',
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify',
        META_APP_SECRET: 'app-secret',
      });
      webhook = new WhatsAppWebhookService(prisma);
      provider = new WhatsAppCloudApiProvider();
      provider.fetchImpl = async (input, init) => {
        graphCalls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
        return new Response(JSON.stringify({ messages: [{ id: `wamid.OUT${graphCalls.length}` }] }), { status: 200 });
      };
      inbox = new InboxService(prisma, provider);
    });

    it('shows Not connected until linked and a verified webhook arrives', async () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      expect((await inbox.status(ids.agencyA)).whatsapp.label).toBe('Not connected');
      process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
      expect((await inbox.status(ids.agencyA)).whatsapp.state).toBe('setup_required');
      expect(await statusOf(inbox.connectWhatsApp({ agencyId: ids.agencyA, accountId: ids.memberA, confirm: true }))).toBe(403);
      await inbox.connectWhatsApp({ agencyId: ids.agencyA, accountId: ids.ownerA, confirm: true });
      expect((await inbox.status(ids.agencyA)).whatsapp.state).toBe('awaiting_webhook');
      expect(await statusOf(inbox.connectWhatsApp({ agencyId: ids.agencyB, accountId: ids.ownerB, confirm: true }))).toBe(409);
    });

    it('stores a message once even when Meta delivers the webhook twice, and maps it to the right agency', async () => {
      const body = waPayload('PNID_A', [{ from: '919811111111', id: 'wamid.IN1', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Dwarka mein 3BHK chahiye, 1.5 crore budget, loan lagega' } }]);
      const first = await webhook.process(parseWhatsAppWebhook(body));
      const second = await webhook.process(parseWhatsAppWebhook(body));
      expect(first).toMatchObject({ processed: 1, duplicates: 0 });
      expect(second).toMatchObject({ processed: 0, duplicates: 1 });
      expect(await prisma.message.count({ where: { providerMessageId: 'wamid.IN1' } })).toBe(1);
      expect(await prisma.conversation.count({ where: { agencyId: ids.agencyA } })).toBe(1);
      expect(await prisma.conversation.count({ where: { agencyId: ids.agencyB } })).toBe(0);
      expect((await inbox.status(ids.agencyA)).whatsapp.label).toBe('Connected');
    });

    it('records but does not attach events for an unknown phone number id', async () => {
      const r = await webhook.process(parseWhatsAppWebhook(waPayload('PNID_UNKNOWN', [{ from: '919822222222', id: 'wamid.X', timestamp: '1790000000', type: 'text', text: { body: 'hi' } }])));
      expect(r).toMatchObject({ processed: 0, unmapped: 1 });
      expect(await prisma.message.count({ where: { providerMessageId: 'wamid.X' } })).toBe(0);
    });

    it('extraction is a draft; saving keeps existing values unless overwrite is chosen', async () => {
      const convo = await prisma.conversation.findFirstOrThrow({ where: { agencyId: ids.agencyA } });
      await prisma.conversation.update({ where: { id: convo.id }, data: { leadId: ids.leadA } });
      const draft = await inbox.extraction(ids.agencyA, convo.id);
      expect(draft.draft?.budgetInr.value).toBe(15_000_000);
      expect(draft.conflicts.map((c) => c.field)).toContain('budget');
      expect(await statusOf(inbox.extraction(ids.agencyB, convo.id))).toBe(404);

      expect(await statusOf(inbox.saveExtraction({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { fields: { budgetInr: 15_000_000 } } }))).toBe(400);
      const kept = await inbox.saveExtraction({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { confirm: true, fields: { budgetInr: 15_000_000, localities: ['Dwarka'] } } });
      expect(kept).toMatchObject({ skipped: ['budget'], updated: ['localities'] });
      expect((await prisma.lead.findUniqueOrThrow({ where: { id: ids.leadA } })).budgetBand).toBe('Up to ₹1.2 Cr');
      await inbox.saveExtraction({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { confirm: true, fields: { budgetInr: 15_000_000 }, overwrite: ['budget'] } });
      expect((await prisma.lead.findUniqueOrThrow({ where: { id: ids.leadA } })).budgetBand).toBe('Up to ₹1.5 Cr');
      expect(await statusOf(inbox.saveExtraction({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { confirm: true, leadId: ids.leadB, fields: {} } }))).toBe(404);
    });

    it('sends only with confirmation, once per idempotency key, and tracks status without downgrading', async () => {
      const convo = await prisma.conversation.findFirstOrThrow({ where: { agencyId: ids.agencyA } });
      const key = '20000000-0000-4000-8000-000000000001';
      expect(await statusOf(inbox.send({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { text: 'Hello', idempotencyKey: key } }))).toBe(400);
      expect(graphCalls).toHaveLength(0);
      const sent = await inbox.send({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { text: 'Namaste Priya ji', idempotencyKey: key, confirm: true } });
      expect(sent.deliveryStatus).toBe('accepted');
      expect(graphCalls).toHaveLength(1);
      expect(graphCalls[0].url).toMatch(/\/PNID_A\/messages$/);
      expect(graphCalls[0].body).toMatchObject({ messaging_product: 'whatsapp', to: '919811111111', type: 'text' });
      expect(await statusOf(inbox.send({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { text: 'Namaste Priya ji', idempotencyKey: key, confirm: true } }))).toBe(409);
      expect(graphCalls).toHaveLength(1);

      const st = (status: string, ts: number) => waPayload('PNID_A', [], [{ id: 'wamid.OUT1', status, timestamp: String(ts) }]);
      await webhook.process(parseWhatsAppWebhook(st('read', 1790000010)));
      await webhook.process(parseWhatsAppWebhook(st('delivered', 1790000005)));
      expect((await prisma.message.findFirstOrThrow({ where: { providerMessageId: 'wamid.OUT1' } })).deliveryStatus).toBe('read');

      expect(await statusOf(inbox.send({ agencyId: ids.agencyB, accountId: ids.ownerB, conversationId: convo.id, body: { text: 'x', idempotencyKey: '20000000-0000-4000-8000-000000000002', confirm: true } }))).toBe(404);
    });

    it('blocks sends after the contact opts out', async () => {
      await webhook.process(parseWhatsAppWebhook(waPayload('PNID_A', [{ from: '919811111111', id: 'wamid.STOP', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'STOP' } }])));
      const convo = await prisma.conversation.findFirstOrThrow({ where: { agencyId: ids.agencyA } });
      expect(convo.optOut).toBe(true);
      expect(await statusOf(inbox.send({ agencyId: ids.agencyA, accountId: ids.ownerA, conversationId: convo.id, body: { text: 'x', idempotencyKey: '20000000-0000-4000-8000-000000000003', confirm: true } }))).toBe(403);
    });
  });

  describe('notification delivery', () => {
    let svc: NotificationDeliveryService;
    let notificationId: string;

    beforeEach(async () => {
      svc = new NotificationDeliveryService(prisma);
      const n = await prisma.notification.create({
        data: { agencyId: ids.agencyA, accountId: ids.ownerA, kind: 'reminder', title: 'Call Ananya', body: 'Follow-up due', dedupeKey: `t:${Math.random()}` },
      });
      notificationId = n.id;
    });

    it('creates no deliveries and says so when no provider is configured', async () => {
      svc.senders = new Map();
      expect(await svc.fanOut({ agencyId: ids.agencyA, notificationId, to: 'a@example.test', title: 't', body: 'b' })).toEqual([]);
      expect(svc.availability().summary).toMatch(/in-app only/);
      expect(svc.availability().background).toBe('unavailable');
    });

    it('marks a delivery failed after bounded retries, then retry succeeds and dismiss is refused for sent', async () => {
      const flaky = new LocalSinkSender('email', { failFirst: 3 });
      svc.senders = new Map([['email', flaky]]);
      const [id] = await svc.fanOut({ agencyId: ids.agencyA, notificationId, to: 'a@example.test', title: 't', body: 'b' });
      expect(await prisma.notificationDelivery.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'failed', attempts: 3 });
      expect((await svc.list(ids.agencyA, ids.ownerA, 'failed')).map((d) => d.id)).toContain(id);
      expect(await statusOf(svc.retry(ids.agencyB, ids.ownerB, id))).toBe(404);
      const retried = await svc.retry(ids.agencyA, ids.ownerA, id);
      expect(retried).toMatchObject({ status: 'sent', attempts: 1, lastError: null });
      expect(flaky.sent).toHaveLength(1);
      expect(await statusOf(svc.dismiss(ids.agencyA, ids.ownerA, id))).toBe(400);
    });

    it('fan-out is idempotent per notification and channel', async () => {
      svc.senders = new Map([['email', new LocalSinkSender('email')]]);
      const a = await svc.fanOut({ agencyId: ids.agencyA, notificationId, to: 'a@example.test', title: 't', body: 'b' });
      const b = await svc.fanOut({ agencyId: ids.agencyA, notificationId, to: 'a@example.test', title: 't', body: 'b' });
      expect(a).toEqual(b);
      expect(await prisma.notificationDelivery.count({ where: { notificationId } })).toBe(1);
    });

    it('dismisses a failed delivery', async () => {
      svc.senders = new Map([['sms', new LocalSinkSender('sms', { failFirst: 10 })]]);
      const [id] = await svc.fanOut({ agencyId: ids.agencyA, notificationId, to: '+91', title: 't', body: 'b' });
      expect(await svc.dismiss(ids.agencyA, ids.ownerA, id)).toMatchObject({ status: 'dismissed' });
    });
  });
});
