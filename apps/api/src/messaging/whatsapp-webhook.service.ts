import { Injectable, Logger } from '@nestjs/common';
import { mergeDeliveryStatus, type WhatsAppWebhookEvent } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';

const OPT_OUT = /^\s*(stop|unsubscribe|band karo)\s*$/i;

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

export interface WebhookProcessResult {
  processed: number;
  duplicates: number;
  unmapped: number;
}

@Injectable()
export class WhatsAppWebhookService {
  private readonly log = new Logger('WhatsAppWebhook');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * One transaction per event: the event key insert and the side effects commit together.
   * A duplicate delivery hits the unique key and is skipped; a failure rolls back so Meta's retry can reprocess it.
   */
  async process(events: WhatsAppWebhookEvent[], now = new Date()): Promise<WebhookProcessResult> {
    const result: WebhookProcessResult = { processed: 0, duplicates: 0, unmapped: 0 };
    for (const event of events) {
      const connection = await this.prisma.channelConnection.findUnique({
        where: { channel_externalAccountId: { channel: 'whatsapp', externalAccountId: event.phoneNumberId } },
        select: { id: true, agencyId: true },
      });
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.webhookEvent.create({
            data: { channel: 'whatsapp', providerEventKey: event.eventKey, agencyId: connection?.agencyId ?? null },
          });
          if (!connection) return;
          const agencyId = connection.agencyId;

          if (event.kind === 'message') {
            const conversation = await tx.conversation.upsert({
              where: { agencyId_channel_externalId: { agencyId, channel: 'whatsapp', externalId: event.from } },
              create: {
                agencyId,
                connectionId: connection.id,
                channel: 'whatsapp',
                externalId: event.from,
                contactName: event.contactName ?? `+${event.from}`,
                unread: true,
              },
              update: { unread: true, ...(event.contactName ? { contactName: event.contactName } : {}) },
              select: { id: true },
            });
            await tx.message.create({
              data: {
                agencyId,
                conversationId: conversation.id,
                providerMessageId: event.providerMessageId,
                direction: 'inbound',
                senderLabel: event.contactName,
                text: event.text ?? `[${event.messageType} message — open WhatsApp to view]`,
                eventAt: event.at,
              },
            });
            if (event.text && OPT_OUT.test(event.text)) {
              await tx.conversation.update({ where: { id: conversation.id }, data: { optOut: true } });
            }
          } else {
            const message = await tx.message.findUnique({
              where: { agencyId_providerMessageId: { agencyId, providerMessageId: event.providerMessageId } },
              select: { id: true, deliveryStatus: true },
            });
            if (message) {
              const next = mergeDeliveryStatus(message.deliveryStatus, event.status);
              if (next !== message.deliveryStatus) {
                await tx.message.update({ where: { id: message.id }, data: { deliveryStatus: next } });
              }
            }
          }

          await tx.channelConnection.update({
            where: { id: connection.id },
            data: { lastEventAt: now, state: 'connected' },
          });
        });
        if (connection) result.processed += 1;
        else result.unmapped += 1;
      } catch (error) {
        if (isUniqueViolation(error)) {
          result.duplicates += 1;
          continue;
        }
        this.log.error(`event failed kind=${event.kind}`);
        throw error;
      }
    }
    return result;
  }

  /** Facebook and Instagram webhooks are verified and de-duplicated but not processed yet. */
  async recordOnly(channel: 'facebook_messenger' | 'instagram', eventKey: string) {
    try {
      await this.prisma.webhookEvent.create({ data: { channel, providerEventKey: eventKey, agencyId: null } });
      return { duplicate: false };
    } catch (error) {
      if (isUniqueViolation(error)) return { duplicate: true };
      throw error;
    }
  }
}
