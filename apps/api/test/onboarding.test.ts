import { describe, expect, it } from 'vitest';
import { dealerOnboardingSchema } from '@estateflow/shared';

describe('onboarding resume validation', () => {
  const base = {
    fullName: 'Priya Nair',
    mobile: '9123456789',
    email: 'priya@broker.in',
    agencyName: 'Nair Associates',
    operatingLocalities: ['Electronic City'],
    propertyTypes: ['flat' as const],
    transactionTypes: ['rent' as const],
    budgetBands: ['25l_50l' as const],
    experienceBand: '1_3' as const,
    activeBuyerCount: 3,
    activePropertyCount: 7,
    accuracyConfirmed: true as const,
  };

  it('validates complete payload for submit', () => {
    expect(dealerOnboardingSchema.safeParse(base).success).toBe(true);
  });

  it('rejects incomplete locality list', () => {
    expect(
      dealerOnboardingSchema.safeParse({ ...base, operatingLocalities: [] }).success,
    ).toBe(false);
  });
});
