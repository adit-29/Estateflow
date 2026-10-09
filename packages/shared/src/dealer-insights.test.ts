import { describe, expect, it } from 'vitest';
import { listingWarnings, marketingDrafts, scoreLead } from './dealer-insights';

describe('lead score', () => {
  it('explains evidence and does not claim a purchase prediction', () => {
    const result = scoreLead({ status: 'Qualified', followUp: 'Today', hasCompletedVisit: true, inNegotiation: false });
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.limit).toMatch(/not a prediction/i);
  });
});

describe('listing quality', () => {
  it('flags a possible duplicate without calling it fraud', () => {
    const warnings = listingWarnings(
      { id: 'a', title: 'Flat A', locality: 'Dwarka', price: 100, beds: 3, type: 'Flat', lastConfirmed: '2026-09-01' },
      [{ id: 'b', title: 'Flat B', locality: 'Dwarka', price: 101, beds: 3, type: 'Flat', lastConfirmed: '2026-09-01' }],
    );
    expect(warnings.some((row) => row.code === 'possible_duplicate')).toBe(true);
    expect(warnings.every((row) => !/fraud/i.test(row.message))).toBe(true);
  });

  it('does not invent amenities in a marketing draft', () => {
    const drafts = marketingDrafts({ id: 'a', title: '3 BHK', locality: 'Dwarka', price: 15000000, beds: 3, type: 'Flat', status: 'Active' });
    expect(drafts.facebook).toMatch(/omitted/i);
    expect(drafts.instagram).toMatch(/Nothing was published/);
  });
});
