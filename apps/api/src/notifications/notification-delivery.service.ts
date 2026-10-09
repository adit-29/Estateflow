import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LocalSinkSender,
  MAX_DELIVERY_ATTEMPTS,
  deliveryAvailability,
  nextDeliveryState,
  type DeliveryChannel,
  type NotificationSender,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * No real email/SMS/push adapter ships yet. NOTIFICATION_SINK=local enables an in-process sink for development
 * and tests so the delivery pipeline can be exercised without sending anything.
 */
export function buildSenders(env: Record<string, string | undefined> = process.env): Map<DeliveryChannel, NotificationSender> {
  const senders = new Map<DeliveryChannel, NotificationSender>();
  if (env.NOTIFICATION_SINK === 'local') {
    for (const channel of ['email', 'sms', 'push'] as const) senders.set(channel, new LocalSinkSender(channel));
  }
  return senders;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly log = new Logger('NotificationDelivery');
  senders = buildSenders();

  constructor(private readonly prisma: PrismaService) {}

  availability() {
    const base = deliveryAvailability(process.env);
    const channels = Object.fromEntries(
      (['email', 'sms', 'push'] as const).map((c) => {
        const sender = this.senders.get(c);
        return [c, { configured: Boolean(sender), provider: sender?.name ?? null }];
      }),
    ) as typeof base.channels;
    const any = Object.values(channels).some((c) => c.configured);
    return {
      background: 'unavailable' as const,
      message:
        base.background === 'sqs'
          ? 'NOTIFICATION_QUEUE_URL is set, but this build has no SQS worker, so background delivery is unavailable. Deliveries are attempted inline when created or retried.'
          : base.message,
      channels,
      summary: any
        ? `Delivery via ${[...new Set([...this.senders.values()].map((s) => s.name))].join(', ')}. ${base.message}`
        : 'No email, SMS, or push provider is configured. Notifications appear in-app only.',
    };
  }

  /** Creates one delivery row per configured channel (idempotent per notification + channel) and attempts it inline. */
  async fanOut(input: { agencyId: string; notificationId: string; to: string; title: string; body: string }) {
    const created: string[] = [];
    for (const [channel] of this.senders) {
      const idempotencyKey = `${input.notificationId}:${channel}`;
      const row = await this.prisma.notificationDelivery.upsert({
        where: { agencyId_idempotencyKey: { agencyId: input.agencyId, idempotencyKey } },
        create: { agencyId: input.agencyId, notificationId: input.notificationId, channel, idempotencyKey },
        update: {},
        select: { id: true },
      });
      created.push(row.id);
      await this.attempt(input.agencyId, row.id, input);
    }
    return created;
  }

  private async attempt(agencyId: string, id: string, content?: { to: string; title: string; body: string }) {
    const row = await this.prisma.notificationDelivery.findFirst({
      where: { id, agencyId },
      include: { notification: { select: { title: true, body: true, account: { select: { email: true } } } } },
    });
    if (!row) throw new NotFoundException('Delivery not found.');
    const sender = this.senders.get(row.channel);
    let state = { status: row.status, attempts: row.attempts };
    let lastError: string | null = row.lastError;

    while (state.status === 'pending' && state.attempts < MAX_DELIVERY_ATTEMPTS) {
      if (!sender) {
        state = { status: 'failed', attempts: state.attempts };
        lastError = `No ${row.channel} provider configured.`;
        break;
      }
      try {
        await sender.send({
          idempotencyKey: row.idempotencyKey,
          channel: row.channel,
          to: content?.to ?? row.notification.account.email,
          title: content?.title ?? row.notification.title,
          body: content?.body ?? row.notification.body,
        });
        const next = nextDeliveryState(state, 'attempt_succeeded');
        if ('error' in next) break;
        state = next;
        lastError = null;
      } catch (error) {
        const next = nextDeliveryState(state, 'attempt_failed');
        if ('error' in next) break;
        state = next;
        lastError = (error as Error)?.message?.slice(0, 200) ?? 'Send failed';
        this.log.warn(`delivery attempt failed channel=${row.channel} attempt=${state.attempts}`);
      }
    }
    return this.prisma.notificationDelivery.update({
      where: { id: row.id },
      data: { status: state.status, attempts: state.attempts, lastError },
      select: { id: true, channel: true, status: true, attempts: true, lastError: true, updatedAt: true },
    });
  }

  list(agencyId: string, accountId: string, status?: string) {
    const allowed = ['pending', 'sent', 'failed', 'dismissed'];
    return this.prisma.notificationDelivery.findMany({
      where: {
        agencyId,
        notification: { accountId },
        ...(status && allowed.includes(status) ? { status: status as never } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        channel: true,
        status: true,
        attempts: true,
        lastError: true,
        updatedAt: true,
        notification: { select: { id: true, title: true } },
      },
    });
  }

  private async owned(agencyId: string, accountId: string, id: string) {
    const row = await this.prisma.notificationDelivery.findFirst({
      where: { id, agencyId, notification: { accountId } },
      select: { id: true, status: true, attempts: true },
    });
    if (!row) throw new NotFoundException('Delivery not found.');
    return row;
  }

  async retry(agencyId: string, accountId: string, id: string) {
    const row = await this.owned(agencyId, accountId, id);
    const next = nextDeliveryState(row, 'retry');
    if ('error' in next) throw new BadRequestException(next.error);
    await this.prisma.notificationDelivery.update({ where: { id }, data: { status: next.status, attempts: next.attempts } });
    return this.attempt(agencyId, id);
  }

  async dismiss(agencyId: string, accountId: string, id: string) {
    const row = await this.owned(agencyId, accountId, id);
    const next = nextDeliveryState(row, 'dismiss');
    if ('error' in next) throw new BadRequestException(next.error);
    return this.prisma.notificationDelivery.update({
      where: { id },
      data: { status: next.status },
      select: { id: true, channel: true, status: true, attempts: true, lastError: true, updatedAt: true },
    });
  }
}
