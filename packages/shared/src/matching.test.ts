import { describe, expect, it } from 'vitest';
import { computeMatch } from './matching';

describe('computeMatch', () => {
  it('exact match scores high', () => {
    const r = computeMatch(
      {
        localities: ['Koramangala'],
        propertyTypes: ['flat'],
        bedroomsMin: 2,
        bedroomsMax: 3,
        budgetMin: 80_00_000,
        budgetMax: 1_00_00_000,
        readiness: 'ready',
      },
      {
        locality: 'Koramangala 5th Block',
        propertyType: 'flat',
        bedrooms: 3,
        priceAmount: 95_00_000,
        listingStatus: 'active',
      },
    );
    expect(r.matchPercent).toBeGreaterThanOrEqual(90);
    expect(r.breakdown.locality).toBe(100);
    expect(r.breakdown.budget).toBe(100);
  });

  it('partial locality mismatch lowers score', () => {
    const r = computeMatch(
      { localities: ['Whitefield'], propertyTypes: ['flat'], budgetMin: 50_00_000, budgetMax: 60_00_000 },
      { locality: 'Indiranagar', propertyType: 'flat', priceAmount: 55_00_000, listingStatus: 'active' },
    );
    expect(r.breakdown.locality).toBe(0);
    expect(r.matchPercent).toBeLessThan(100);
  });

  it('out of budget scores zero on budget dimension', () => {
    const r = computeMatch(
      { budgetMin: 30_00_000, budgetMax: 40_00_000 },
      { priceAmount: 90_00_000, locality: 'X', propertyType: 'flat', listingStatus: 'active' },
    );
    expect(r.breakdown.budget).toBe(0);
  });

  it('missing price marks budget unknown', () => {
    const r = computeMatch({ budgetMin: 1, budgetMax: 2 }, { locality: 'A' });
    expect(r.breakdown.budget).toBe('unknown');
  });
});
