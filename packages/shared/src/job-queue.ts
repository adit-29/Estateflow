export type JobStatus = 'pending' | 'succeeded' | 'retrying' | 'dead';

export interface Job<T> {
  id: string;
  name: string;
  payload: T;
  attempts: number;
  status: JobStatus;
}

export interface JobQueue<T> {
  enqueue(name: string, payload: T, idempotencyKey: string): Job<T>;
  process(handler: (job: Job<T>) => Promise<void>, maxAttempts?: number): Promise<void>;
}

/**
 * Process-local queue. A production SQS adapter should use the queue URL plus a
 * separate dead-letter queue, the same idempotency key, and a max receive count.
 * It is not wired here because this environment has no queue URL.
 */
export class SqsJobQueue<T> implements JobQueue<T> {
  enqueue(): Job<T> {
    throw new Error('SQS is not configured. Set SQS_QUEUE_URL and a dead-letter queue in the infrastructure phase.');
  }

  async process(): Promise<void> {
    throw new Error('SQS is not configured.');
  }
}

export class LocalJobQueue<T> implements JobQueue<T> {
  private jobs: Job<T>[] = [];
  readonly dead: Job<T>[] = [];

  size() {
    return this.jobs.length;
  }

  enqueue(name: string, payload: T, idempotencyKey: string): Job<T> {
    const existing = this.jobs.find((job) => job.id === idempotencyKey) ?? this.dead.find((job) => job.id === idempotencyKey);
    if (existing) return existing;
    const job: Job<T> = { id: idempotencyKey, name, payload, attempts: 0, status: 'pending' };
    this.jobs.push(job);
    return job;
  }

  async process(handler: (job: Job<T>) => Promise<void>, maxAttempts = 3) {
    for (const job of [...this.jobs]) {
      while (job.status === 'pending' || job.status === 'retrying') {
        job.attempts += 1;
        try {
          await handler(job);
          job.status = 'succeeded';
        } catch {
          if (job.attempts >= maxAttempts) {
            job.status = 'dead';
            this.dead.push(job);
          } else {
            job.status = 'retrying';
          }
        }
      }
    }
  }
}
