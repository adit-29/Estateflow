export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'visit_scheduled',
  'negotiation',
  'won',
  'lost',
  'archived',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  'referral',
  'portal',
  'walk_in',
  'social',
  'builder_tie_up',
  'other',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const PROPERTY_TYPES = [
  'flat',
  'builder_floor',
  'plot',
  'independent_house',
  'commercial',
  'land',
  'other',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const TRANSACTION_TYPES = [
  'sale',
  'rent',
  'resale',
  'new_project',
  'investment',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const BUDGET_BANDS = [
  'under_25l',
  '25l_50l',
  '50l_1cr',
  '1cr_2cr',
  '2cr_5cr',
  'above_5cr',
] as const;
export type BudgetBand = (typeof BUDGET_BANDS)[number];

export const EXPERIENCE_BANDS = [
  '0_1',
  '1_3',
  '3_5',
  '5_10',
  '10_plus',
] as const;
export type ExperienceBand = (typeof EXPERIENCE_BANDS)[number];

export const ONBOARDING_STATUSES = [
  'not_started',
  'pending',
  'verified',
  'rejected',
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];
