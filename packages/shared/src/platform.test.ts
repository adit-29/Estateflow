import { describe, expect, it } from 'vitest';
import { aggregateAnalytics } from './analytics';
import { LocalJobQueue } from './job-queue';
import { preferenceAllows } from './notifications';
import { paginate, redactLog } from './reliability';
import {
  classifyTourAsset,
  reconstructionCreateDecision,
  validateVideoUpload,
  withProviderTimeout,
} from './reconstruction';
import { MemorySearchIndex, permissionAwareHits } from './search';

describe('search and pagination', () => {
  it('returns only permitted hits and a page', () => {
    const index = new MemorySearchIndex([
      { type: 'property', id: 'a', title: 'Dwarka flat', subtitle: 'Delhi' },
      { type: 'property', id: 'b', title: 'Dwarka plot', subtitle: 'Delhi' },
    ]);
    const hits = permissionAwareHits(index.search('dwarka', 10), new Set(['a']));
    expect(paginate(hits, 1, 10).items).toHaveLength(1);
    expect(hits[0].id).toBe('a');
  });
});

describe('reconstruction guards', () => {
  it('rejects another agency as not found', () => {
    expect(
      reconstructionCreateDecision({
        propertyAgencyId: 'agency-b',
        requestAgencyId: 'agency-a',
        existingJobId: null,
        video: { ok: true },
        configured: false,
      }).type,
    ).toBe('not_found');
  });

  it('returns the existing job instead of creating a duplicate', () => {
    const decision = reconstructionCreateDecision({
      propertyAgencyId: 'agency-a',
      requestAgencyId: 'agency-a',
      existingJobId: 'job-1',
      video: { ok: true },
      configured: false,
    });
    expect(decision).toEqual({ type: 'duplicate', jobId: 'job-1' });
  });

  it('does not invent a provider when unconfigured', () => {
    const decision = reconstructionCreateDecision({
      propertyAgencyId: 'agency-a',
      requestAgencyId: 'agency-a',
      existingJobId: null,
      video: validateVideoUpload({ name: 'walk.mp4', mime: 'video/mp4', size: 1000 }),
      configured: false,
    });
    expect(decision.type).toBe('create');
    if (decision.type === 'create') expect(decision.status).toBe('unavailable');
  });

  it('rejects an unsupported upload', () => {
    expect(validateVideoUpload({ name: 'notes.pdf', mime: 'application/pdf', size: 100 }).ok).toBe(false);
  });

  it('classifies a missing asset as missing', () => {
    expect(classifyTourAsset(null)).toBe('missing');
    expect(classifyTourAsset('javascript:alert(1)')).toBe('unsupported');
  });

  it('surfaces a provider timeout', async () => {
    await expect(withProviderTimeout(new Promise(() => undefined), 10)).rejects.toThrow('provider_timeout');
  });
});

describe('notifications and logs', () => {
  it('honours a disabled preference', () => {
    expect(preferenceAllows({ reminders: false, visitChanges: true, sharedInventory: true, collaborationRequests: true }, 'reminder')).toBe(false);
  });

  it('redacts secrets', () => {
    expect(redactLog({ password: 'x', title: 'ok' })).toEqual({ password: '[redacted]', title: 'ok' });
  });
});

describe('analytics performance', () => {
  it('aggregates a few hundred stored records quickly', () => {
    const leads = Array.from({ length: 400 }, (_, i) => ({
      createdAt: '2026-03-02T00:00:00.000Z',
      status: i % 2 ? 'qualified' : 'new',
      source: 'portal',
    }));
    const started = Date.now();
    const summary = aggregateAnalytics({
      leads,
      visits: [],
      deals: [],
      commissions: [],
      shortlists: [],
      followUpsCompleted: 0,
    }, '2026-03-01T00:00:00.000Z', '2026-03-31T00:00:00.000Z');
    expect(summary.leadsCreated).toBe(400);
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe('job retry', () => {
  it('retries then dead-letters', async () => {
    const queue = new LocalJobQueue<string>();
    queue.enqueue('notify', 'a', 'n1');
    await queue.process(async () => {
      throw new Error('fail');
    }, 3);
    expect(queue.dead[0]?.status).toBe('dead');
  });
});
