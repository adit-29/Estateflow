import { describe, expect, it } from 'vitest';
import { aggregateAnalytics } from './analytics';

describe('aggregateAnalytics', () => {
  it('counts only records inside the date range', () => {
    const summary = aggregateAnalytics(
      {
        leads: [
          { createdAt: '2026-01-02T00:00:00.000Z', status: 'qualified', source: 'portal' },
          { createdAt: '2025-01-02T00:00:00.000Z', status: 'new', source: 'referral' },
        ],
        visits: [
          { status: 'completed', scheduledAt: '2026-01-03T00:00:00.000Z' },
          { status: 'cancelled', scheduledAt: '2026-01-04T00:00:00.000Z' },
        ],
        deals: [
          { pipelineStage: 'closed_won', value: 100, updatedAt: '2026-01-05T00:00:00.000Z' },
          { pipelineStage: 'negotiation', value: null, updatedAt: '2026-01-06T00:00:00.000Z' },
        ],
        commissions: [
          { paymentStatus: 'paid', amount: 10 },
          { paymentStatus: 'pending', amount: null },
        ],
        shortlists: [{ createdAt: '2026-01-02T00:00:00.000Z' }],
        followUpsCompleted: 2,
      },
      '2026-01-01T00:00:00.000Z',
      '2026-01-31T00:00:00.000Z',
    );
    expect(summary.leadsCreated).toBe(1);
    expect(summary.leadsQualified).toBe(1);
    expect(summary.visits.completed).toBe(1);
    expect(summary.dealsWon).toBe(1);
    expect(summary.pipelineByStage.find((s) => s.stage === 'negotiation')?.value).toBe(0);
    expect(summary.commissions.paid).toBe(10);
    expect(summary.savedMatches).toBe(1);
    expect(summary.empty).toBe(false);
  });

  it('returns an empty summary when nothing is stored', () => {
    const summary = aggregateAnalytics({
      leads: [],
      visits: [],
      deals: [],
      commissions: [],
      shortlists: [],
      followUpsCompleted: 0,
    });
    expect(summary.empty).toBe(true);
    expect(summary.leadsCreated).toBe(0);
  });
});
