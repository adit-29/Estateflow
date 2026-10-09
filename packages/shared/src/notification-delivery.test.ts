import { describe, expect, it } from 'vitest';
import { LocalSinkSender, MAX_DELIVERY_ATTEMPTS, deliveryAvailability, nextDeliveryState } from './notification-delivery';

describe('notification delivery state', () => {
  it('fails after the maximum attempts, then allows retry and dismiss', () => {
    let state = { status: 'pending' as const, attempts: 0 } as { status: 'pending' | 'failed' | 'sent' | 'dismissed'; attempts: number };
    for (let i = 0; i < MAX_DELIVERY_ATTEMPTS; i++) {
      const next = nextDeliveryState(state, 'attempt_failed');
      if ('error' in next) throw new Error(next.error);
      state = next;
    }
    expect(state).toEqual({ status: 'failed', attempts: MAX_DELIVERY_ATTEMPTS });
    expect(nextDeliveryState(state, 'retry')).toEqual({ status: 'pending', attempts: 0 });
    expect(nextDeliveryState(state, 'dismiss')).toEqual({ status: 'dismissed', attempts: MAX_DELIVERY_ATTEMPTS });
  });

  it('refuses to retry a delivery that did not fail, or dismiss a sent one', () => {
    expect(nextDeliveryState({ status: 'pending', attempts: 1 }, 'retry')).toHaveProperty('error');
    expect(nextDeliveryState({ status: 'sent', attempts: 1 }, 'dismiss')).toHaveProperty('error');
  });

  it('local sink stores a message once per idempotency key', async () => {
    const sink = new LocalSinkSender('email', { failFirst: 1 });
    const msg = { idempotencyKey: 'k1', channel: 'email' as const, to: 'a@example.test', title: 't', body: 'b' };
    await expect(sink.send(msg)).rejects.toThrow();
    await sink.send(msg);
    await sink.send(msg);
    expect(sink.sent).toHaveLength(1);
  });

  it('reports background delivery unavailable without SQS', () => {
    const status = deliveryAvailability({});
    expect(status.background).toBe('unavailable');
    expect(status.channels.email.configured).toBe(false);
    expect(deliveryAvailability({ NOTIFICATION_QUEUE_URL: 'https://sqs.example/q', AWS_REGION: 'ap-south-1' }).background).toBe('sqs');
  });
});
