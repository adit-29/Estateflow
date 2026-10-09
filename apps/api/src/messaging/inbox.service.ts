import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { extractBuyerRequirement, formatInr, whatsappSendEligibility } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudApiProvider } from './providers';

const EXTRACTION_FIELDS = ['localities', 'budget', 'bedrooms', 'financing', 'timeline'] as const;
type ExtractionField = (typeof EXTRACTION_FIELDS)[number];

export const saveExtractionSchema = z
  .object({
    confirm: z.literal(true),
    leadId: z.string().uuid().optional(),
    fields: z
      .object({
        localities: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
        budgetInr: z.number().int().positive().max(1_000_000_000_000).optional(),
        bedrooms: z.number().int().min(0).max(10).optional(),
        financing: z.string().trim().max(200).optional(),
        timeline: z.string().trim().max(120).optional(),
      })
      .strict(),
    overwrite: z.array(z.enum(EXTRACTION_FIELDS)).default([]),
  })
  .strict();

export const sendSchema = z
  .object({
    text: z.string().trim().min(1).max(1000),
    confirm: z.literal(true),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

type LeadFields = {
  preferredLocalities: string[];
  budgetBand: string | null;
  requirementSummary: string | null;
  financingNotes: string | null;
  timeline: string | null;
};

function currentValue(lead: LeadFields, field: ExtractionField): string | null {
  switch (field) {
    case 'localities':
      return lead.preferredLocalities.length ? lead.preferredLocalities.join(', ') : null;
    case 'budget':
      return lead.budgetBand;
    case 'bedrooms':
      return lead.requirementSummary;
    case 'financing':
      return lead.financingNotes;
    case 'timeline':
      return lead.timeline;
  }
}

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppCloudApiProvider,
  ) {}

  async status(agencyId: string) {
    const credentials = this.whatsapp.mode === 'configured';
    const connection = await this.prisma.channelConnection.findUnique({
      where: { agencyId_channel: { agencyId, channel: 'whatsapp' } },
      select: { state: true, lastEventAt: true, displayName: true, externalAccountId: true },
    });
    const linked = Boolean(connection?.externalAccountId && connection.externalAccountId === this.whatsapp.phoneNumberId);
    const verified = credentials && linked && connection?.state === 'connected' && Boolean(connection.lastEventAt);
    const state = !credentials ? 'not_connected' : !linked ? 'setup_required' : verified ? 'connected' : 'awaiting_webhook';
    const label = {
      not_connected: 'Not connected',
      setup_required: 'Credentials set · link this agency',
      awaiting_webhook: 'Linked · waiting for first verified webhook',
      connected: 'Connected',
    }[state];
    return {
      whatsapp: {
        state,
        label,
        credentialsConfigured: credentials,
        lastVerifiedWebhookAt: verified ? connection!.lastEventAt!.toISOString() : null,
        displayName: connection?.displayName ?? null,
      },
      facebook_messenger: { state: 'not_connected', label: 'Not connected' },
      instagram: { state: 'not_connected', label: 'Not connected' },
    };
  }

  /** Links the server's configured WhatsApp number to this agency. Only owners/admins; one agency per number. */
  async connectWhatsApp(input: { agencyId: string; accountId: string; confirm: unknown }) {
    if (input.confirm !== true) throw new BadRequestException('Confirm linking the WhatsApp number to this agency.');
    const phoneNumberId = this.whatsapp.phoneNumberId;
    if (this.whatsapp.mode !== 'configured' || !phoneNumberId) {
      throw new ServiceUnavailableException({ message: 'WhatsApp is not connected. Server credentials are missing.', code: 'whatsapp_not_configured' });
    }
    const membership = await this.prisma.dealerMembership.findFirst({
      where: { agencyId: input.agencyId, accountId: input.accountId },
      select: { role: true },
    });
    if (!membership || membership.role === 'member') throw new ForbiddenException('Only an agency owner or admin can link WhatsApp.');
    const claimed = await this.prisma.channelConnection.findUnique({
      where: { channel_externalAccountId: { channel: 'whatsapp', externalAccountId: phoneNumberId } },
      select: { agencyId: true },
    });
    if (claimed && claimed.agencyId !== input.agencyId) throw new ConflictException('This WhatsApp number is linked to another agency.');
    await this.prisma.channelConnection.upsert({
      where: { agencyId_channel: { agencyId: input.agencyId, channel: 'whatsapp' } },
      create: { agencyId: input.agencyId, channel: 'whatsapp', state: 'setup_required', externalAccountId: phoneNumberId, secretRef: 'env:WHATSAPP_ACCESS_TOKEN' },
      update: { externalAccountId: phoneNumberId, secretRef: 'env:WHATSAPP_ACCESS_TOKEN' },
    });
    await this.prisma.auditEvent.create({
      data: { accountId: input.accountId, action: 'whatsapp.linked', entity: 'ChannelConnection', payload: { agencyId: input.agencyId } },
    });
    return this.status(input.agencyId);
  }

  async conversations(agencyId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { agencyId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        channel: true,
        contactName: true,
        unread: true,
        leadId: true,
        optOut: true,
        updatedAt: true,
        messages: { orderBy: { eventAt: 'desc' }, take: 1, select: { text: true, direction: true, eventAt: true } },
      },
    });
    return rows.map(({ messages, ...c }) => ({ ...c, lastMessage: messages[0] ?? null }));
  }

  private async conversation(agencyId: string, id: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id, agencyId },
      select: { id: true, channel: true, externalId: true, contactName: true, leadId: true, optOut: true, unread: true },
    });
    if (!convo) throw new NotFoundException('Conversation not found in your agency.');
    return convo;
  }

  async thread(agencyId: string, id: string) {
    const convo = await this.conversation(agencyId, id);
    const messages = await this.prisma.message.findMany({
      where: { agencyId, conversationId: id },
      orderBy: { eventAt: 'asc' },
      take: 200,
      select: { id: true, direction: true, senderLabel: true, text: true, deliveryStatus: true, eventAt: true },
    });
    if (convo.unread) await this.prisma.conversation.update({ where: { id }, data: { unread: false } });
    return { conversation: { ...convo, externalId: undefined }, messages };
  }

  /** A reviewable draft from the latest inbound message. Nothing is written here. */
  async extraction(agencyId: string, id: string) {
    const convo = await this.conversation(agencyId, id);
    const latest = await this.prisma.message.findFirst({
      where: { agencyId, conversationId: id, direction: 'inbound' },
      orderBy: { eventAt: 'desc' },
      select: { id: true, text: true, eventAt: true },
    });
    if (!latest) return { sourceMessageId: null, draft: null, lead: null, conflicts: [] };
    const draft = extractBuyerRequirement(latest.text);
    const lead = convo.leadId
      ? await this.prisma.lead.findFirst({
          where: { id: convo.leadId, agencyId, deletedAt: null },
          select: { id: true, name: true, preferredLocalities: true, budgetBand: true, requirementSummary: true, financingNotes: true, timeline: true },
        })
      : null;
    const proposed: Record<ExtractionField, string | null> = {
      localities: draft.localities.value?.join(', ') ?? null,
      budget: draft.budgetInr.value != null ? `Up to ${formatInr(draft.budgetInr.value)}` : null,
      bedrooms: draft.bedrooms.value != null ? `${draft.bedrooms.value}BHK` : null,
      financing: draft.financing.value,
      timeline: draft.timeline.value,
    };
    const conflicts = lead
      ? EXTRACTION_FIELDS.filter((f) => proposed[f] && currentValue(lead, f) && currentValue(lead, f) !== proposed[f]).map((f) => ({
          field: f,
          saved: currentValue(lead, f),
          proposed: proposed[f],
        }))
      : [];
    return {
      sourceMessageId: latest.id,
      receivedAt: latest.eventAt.toISOString(),
      draft,
      lead: lead ? { id: lead.id, name: lead.name, href: `/dealer/leads/${lead.id}` } : null,
      conflicts,
    };
  }

  /** Saves dealer-reviewed fields. Existing lead values change only for fields listed in `overwrite`. */
  async saveExtraction(input: { agencyId: string; accountId: string; conversationId: string; body: unknown }) {
    const parsed = saveExtractionSchema.safeParse(input.body);
    if (!parsed.success) throw new BadRequestException('Review the fields and confirm before saving.');
    const { fields, overwrite } = parsed.data;
    const convo = await this.conversation(input.agencyId, input.conversationId);
    const leadId = parsed.data.leadId ?? convo.leadId;

    const next: Partial<LeadFields> = {};
    if (fields.localities?.length) next.preferredLocalities = fields.localities;
    if (fields.budgetInr) next.budgetBand = `Up to ${formatInr(fields.budgetInr)}`;
    if (fields.bedrooms != null) next.requirementSummary = `${fields.bedrooms}BHK`;
    if (fields.financing) next.financingNotes = fields.financing;
    if (fields.timeline) next.timeline = fields.timeline;
    const keyOf: Record<keyof LeadFields, ExtractionField> = {
      preferredLocalities: 'localities',
      budgetBand: 'budget',
      requirementSummary: 'bedrooms',
      financingNotes: 'financing',
      timeline: 'timeline',
    };

    return this.prisma.$transaction(async (tx) => {
      if (leadId) {
        const lead = await tx.lead.findFirst({
          where: { id: leadId, agencyId: input.agencyId, deletedAt: null },
          select: { id: true, preferredLocalities: true, budgetBand: true, requirementSummary: true, financingNotes: true, timeline: true },
        });
        if (!lead) throw new NotFoundException('Lead not found in your agency.');
        const data: Partial<LeadFields> = {};
        const skipped: ExtractionField[] = [];
        for (const [k, v] of Object.entries(next) as [keyof LeadFields, never][]) {
          const field = keyOf[k];
          if (currentValue(lead, field) && !overwrite.includes(field)) skipped.push(field);
          else data[k] = v;
        }
        await tx.lead.update({ where: { id: lead.id }, data });
        await tx.conversation.update({ where: { id: convo.id }, data: { leadId: lead.id } });
        await tx.activity.create({
          data: { agencyId: input.agencyId, leadId: lead.id, type: 'note', title: 'Requirement updated from reviewed chat extraction', metadata: { updated: Object.keys(data), skipped } },
        });
        await tx.auditEvent.create({
          data: { accountId: input.accountId, action: 'inbox.extraction.saved', entity: 'Lead', entityId: lead.id, payload: { agencyId: input.agencyId, updated: Object.keys(data), skipped } },
        });
        return { leadId: lead.id, created: false, updated: Object.keys(data).map((k) => keyOf[k as keyof LeadFields]), skipped, href: `/dealer/leads/${lead.id}` };
      }
      const created = await tx.lead.create({
        data: {
          agencyId: input.agencyId,
          name: convo.contactName,
          phone: convo.channel === 'whatsapp' ? `+${convo.externalId.replace(/^\+/, '')}` : 'Not recorded',
          source: 'social',
          preferredLocalities: next.preferredLocalities ?? [],
          budgetBand: next.budgetBand ?? null,
          requirementSummary: next.requirementSummary ?? null,
          financingNotes: next.financingNotes ?? null,
          timeline: next.timeline ?? null,
        },
        select: { id: true },
      });
      await tx.conversation.update({ where: { id: convo.id }, data: { leadId: created.id } });
      await tx.auditEvent.create({
        data: { accountId: input.accountId, action: 'inbox.extraction.lead_created', entity: 'Lead', entityId: created.id, payload: { agencyId: input.agencyId } },
      });
      return { leadId: created.id, created: true, updated: Object.keys(next).map((k) => keyOf[k as keyof LeadFields]), skipped: [], href: `/dealer/leads/${created.id}` };
    });
  }

  async send(input: { agencyId: string; accountId: string; conversationId: string; body: unknown; now?: Date }) {
    const parsed = sendSchema.safeParse(input.body);
    if (!parsed.success) throw new BadRequestException('Preview the message and confirm before sending.');
    const convo = await this.conversation(input.agencyId, input.conversationId);
    if (convo.channel !== 'whatsapp') throw new BadRequestException('Only WhatsApp sending is supported.');
    const status = await this.status(input.agencyId);
    if (status.whatsapp.state !== 'connected') {
      throw new ServiceUnavailableException({ message: `WhatsApp is ${status.whatsapp.label.toLowerCase()}. Nothing was sent.`, code: 'whatsapp_not_connected' });
    }
    const lastInbound = await this.prisma.message.findFirst({
      where: { agencyId: input.agencyId, conversationId: convo.id, direction: 'inbound' },
      orderBy: { eventAt: 'desc' },
      select: { eventAt: true },
    });
    const eligibility = whatsappSendEligibility({ optOut: convo.optOut, lastInboundAt: lastInbound?.eventAt ?? null, now: input.now ?? new Date() });
    if (!eligibility.allowed) throw new ForbiddenException(eligibility.reason);

    const key = `wa:send:${input.agencyId}:${parsed.data.idempotencyKey}`;
    try {
      await this.prisma.webhookEvent.create({ data: { channel: 'whatsapp', providerEventKey: key, agencyId: input.agencyId } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('This message was already sent.');
      throw error;
    }
    let sent: { providerMessageId: string; status: string };
    try {
      sent = await this.whatsapp.sendText({ to: convo.externalId, text: parsed.data.text });
    } catch (error) {
      await this.prisma.webhookEvent.delete({ where: { providerEventKey: key } }).catch(() => undefined);
      throw error;
    }
    const message = await this.prisma.message.create({
      data: {
        agencyId: input.agencyId,
        conversationId: convo.id,
        providerMessageId: sent.providerMessageId,
        direction: 'outbound',
        senderLabel: 'You',
        text: parsed.data.text,
        deliveryStatus: sent.status,
        eventAt: new Date(),
      },
      select: { id: true, deliveryStatus: true },
    });
    await this.prisma.auditEvent.create({
      data: { accountId: input.accountId, action: 'inbox.whatsapp.sent', entity: 'Message', entityId: message.id, payload: { agencyId: input.agencyId, chars: parsed.data.text.length } },
    });
    return { messageId: message.id, deliveryStatus: message.deliveryStatus };
  }
}
