export type DeliveryChannel = 'email' | 'sms' | 'push';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'dismissed';

export interface OutgoingNotification {
  idempotencyKey: string;
  channel: DeliveryChannel;
  to: string;
  title: string;
  body: string;
}

export interface NotificationSender {
  readonly channel: DeliveryChannel;
  readonly name: string;
  configured(): boolean;
  send(message: OutgoingNotification): Promise<{ providerMessageId: string }>;
}

/** Records messages in memory. Used for local development and tests; nothing leaves the process. */
export class LocalSinkSender implements NotificationSender {
  readonly name = 'local-sink';
  readonly sent: OutgoingNotification[] = [];
  private failuresLeft: number;

  constructor(
    readonly channel: DeliveryChannel,
    options: { failFirst?: number } = {},
  ) {
    this.failuresLeft = options.failFirst ?? 0;
  }

  configured() {
    return true;
  }

  async send(message: OutgoingNotification) {
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new Error('Local sink simulated failure');
    }
    if (!this.sent.some((m) => m.idempotencyKey === message.idempotencyKey)) this.sent.push(message);
    return { providerMessageId: `local:${message.idempotencyKey}` };
  }
}

export const MAX_DELIVERY_ATTEMPTS = 3;

export type DeliveryAction = 'attempt_succeeded' | 'attempt_failed' | 'retry' | 'dismiss';

export interface DeliveryState {
  status: DeliveryStatus;
  attempts: number;
}

export function nextDeliveryState(state: DeliveryState, action: DeliveryAction): DeliveryState | { error: string } {
  switch (action) {
    case 'attempt_succeeded':
      if (state.status !== 'pending') return { error: `Cannot record a send on a ${state.status} delivery.` };
      return { status: 'sent', attempts: state.attempts + 1 };
    case 'attempt_failed': {
      if (state.status !== 'pending') return { error: `Cannot record a failure on a ${state.status} delivery.` };
      const attempts = state.attempts + 1;
      return { status: attempts >= MAX_DELIVERY_ATTEMPTS ? 'failed' : 'pending', attempts };
    }
    case 'retry':
      if (state.status !== 'failed') return { error: 'Only failed deliveries can be retried.' };
      return { status: 'pending', attempts: 0 };
    case 'dismiss':
      if (state.status === 'sent' || state.status === 'dismissed') {
        return { error: `A ${state.status} delivery cannot be dismissed.` };
      }
      return { status: 'dismissed', attempts: state.attempts };
  }
}

export interface DeliveryAvailability {
  background: 'sqs' | 'unavailable';
  message: string;
  channels: Record<DeliveryChannel, { configured: boolean; provider: string | null }>;
}

type Env = Record<string, string | undefined>;

export function deliveryAvailability(env: Env): DeliveryAvailability {
  const sqs = Boolean(env.NOTIFICATION_QUEUE_URL && env.AWS_REGION);
  return {
    background: sqs ? 'sqs' : 'unavailable',
    message: sqs
      ? 'Deliveries are queued to SQS for background processing.'
      : 'Background delivery is unavailable: no SQS queue is configured. Deliveries are attempted inline when created or retried.',
    channels: {
      email: { configured: Boolean(env.EMAIL_PROVIDER && env.EMAIL_FROM), provider: env.EMAIL_PROVIDER || null },
      sms: { configured: Boolean(env.SMS_PROVIDER && env.SMS_SENDER_ID), provider: env.SMS_PROVIDER || null },
      push: { configured: Boolean(env.PUSH_PROVIDER), provider: env.PUSH_PROVIDER || null },
    },
  };
}
