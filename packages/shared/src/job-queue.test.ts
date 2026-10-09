import { describe, expect, it } from 'vitest';
import { LocalJobQueue } from './job-queue';

describe('LocalJobQueue', () => {
  it('does not enqueue the same idempotency key twice', () => {
    const queue = new LocalJobQueue<string>();
    queue.enqueue('notify', 'a', 'key-1');
    queue.enqueue('notify', 'b', 'key-1');
    expect(queue.size()).toBe(1);
  });

  it('moves a job to the dead letter list after retries', async () => {
    const queue = new LocalJobQueue<string>();
    queue.enqueue('notify', 'a', 'key-2');
    await queue.process(async () => {
      throw new Error('fail');
    }, 2);
    expect(queue.dead).toHaveLength(1);
    expect(queue.dead[0].attempts).toBe(2);
  });
});
