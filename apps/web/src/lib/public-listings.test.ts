import { describe, expect, it } from 'vitest';
import { classifyTourAsset, validateVideoUpload } from '@estateflow/shared';
import { filterListings } from './public-listings';
import { localitySnapshots, monthlyEmi } from './marketplace-stats';

describe('public listings', () => {
  it('filters demo listings and keeps the demo flag', () => {
    const rows = filterListings({ purpose: 'rent' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.demo && row.purpose === 'rent')).toBe(true);
  });

  it('applies type, budget, and 4+ bedroom filters from the landing search', () => {
    const villas = filterListings({ q: 'Dwarka', type: 'Villa', minPrice: '20000000', beds: '4+' });
    expect(villas.map((row) => row.id)).toContain('demo-dwarka-villa');
    expect(filterListings({ type: 'Plot' }).every((row) => row.type === 'Plot')).toBe(true);
  });

  it('rejects a non-video upload', () => {
    expect(validateVideoUpload({ name: 'plan.pdf', mime: 'application/pdf', size: 20 }).ok).toBe(false);
  });

  it('does not treat a missing asset as a model', () => {
    expect(classifyTourAsset(null)).toBe('missing');
  });

  it('counts locality snapshots from demo listings only', () => {
    const rows = localitySnapshots();
    expect(rows.some((row) => row.locality === 'Dwarka' && row.saleCount >= 1)).toBe(true);
    expect(rows.every((row) => row.saleCount + row.rentCount > 0)).toBe(true);
  });

  it('computes a reducing-balance EMI without inventing a loan offer', () => {
    const emi = monthlyEmi(1_00_00_000, 8.5, 20);
    expect(emi).toBeGreaterThan(8000);
    expect(emi).toBeLessThan(1_00_00_000);
  });
});
