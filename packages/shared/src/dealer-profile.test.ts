import { describe, expect, it } from 'vitest';
import { dealerOnboardingSchema, normalizePhone } from './dealer-profile';

describe('normalizePhone', () => {
  it('normalizes 10-digit Indian numbers', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
  });
});

describe('dealerOnboardingSchema', () => {
  const valid = {
    fullName: 'Rajesh Kumar',
    mobile: '9876543210',
    email: 'raj@agency.in',
    agencyName: 'Kumar Properties',
    operatingLocalities: ['Whitefield', 'Indiranagar'],
    propertyTypes: ['flat' as const],
    transactionTypes: ['sale' as const],
    budgetBands: ['50l_1cr' as const],
    experienceBand: '3_5' as const,
    activeBuyerCount: 5,
    activePropertyCount: 12,
    accuracyConfirmed: true as const,
  };

  it('accepts valid onboarding payload', () => {
    const result = dealerOnboardingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects without accuracy confirmation', () => {
    const result = dealerOnboardingSchema.safeParse({
      ...valid,
      accuracyConfirmed: false,
    });
    expect(result.success).toBe(false);
  });
});
