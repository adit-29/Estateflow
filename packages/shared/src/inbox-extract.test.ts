import { describe, expect, it } from 'vitest';
import { extractBuyerRequirement } from './inbox-extract';

describe('extractBuyerRequirement', () => {
  it('extracts the sample Dwarka message without guessing property type as confirmed', () => {
    const result = extractBuyerRequirement(
      'Dwarka ya Janakpuri mein 1.3 crore tak 3BHK chahiye. Loan lunga, ready-to-move ho toh better.',
    );
    expect(result.localities.value).toEqual(['Dwarka', 'Janakpuri']);
    expect(result.budgetInr.value).toBe(1_30_00_000);
    expect(result.bedrooms.value).toBe(3);
    expect(result.financing.value).toBe('home_loan');
    expect(result.timeline.value).toBe('ready_to_move');
    expect(result.propertyType.needsConfirmation).toBe(true);
  });

  it('marks missing fields instead of inventing them', () => {
    const result = extractBuyerRequirement('Hi, can you call me?');
    expect(result.budgetInr.value).toBeNull();
    expect(result.budgetInr.needsConfirmation).toBe(true);
    expect(result.overallConfidence).toBe('low');
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
