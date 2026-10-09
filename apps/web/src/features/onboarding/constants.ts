import {
  BUDGET_BANDS,
  EXPERIENCE_BANDS,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from '@estateflow/shared';

export const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  flat: 'Flat / Apartment',
  builder_floor: 'Builder floor',
  plot: 'Plot',
  independent_house: 'Independent house',
  commercial: 'Commercial',
  land: 'Land',
  other: 'Other',
};

export const TRANSACTION_LABELS: Record<(typeof TRANSACTION_TYPES)[number], string> = {
  sale: 'Sale',
  rent: 'Rent',
  resale: 'Resale',
  new_project: 'New project',
  investment: 'Investment',
};

export const BUDGET_LABELS: Record<(typeof BUDGET_BANDS)[number], string> = {
  under_25l: 'Under ₹25 L',
  '25l_50l': '₹25 L – ₹50 L',
  '50l_1cr': '₹50 L – ₹1 Cr',
  '1cr_2cr': '₹1 Cr – ₹2 Cr',
  '2cr_5cr': '₹2 Cr – ₹5 Cr',
  above_5cr: 'Above ₹5 Cr',
};

export const EXPERIENCE_LABELS: Record<(typeof EXPERIENCE_BANDS)[number], string> = {
  '0_1': 'Less than 1 year',
  '1_3': '1–3 years',
  '3_5': '3–5 years',
  '5_10': '5–10 years',
  '10_plus': '10+ years',
};

export const SUGGESTED_LOCALITIES = [
  'Dwarka',
  'Janakpuri',
  'Vasant Kunj',
  'Rohini',
  'Noida',
  'Gurgaon',
  'Whitefield',
  'Indiranagar',
  'Koramangala',
  'HSR Layout',
];

export const ONBOARDING_STEPS = [
  'Contact',
  'Agency',
  'Localities',
  'Specialisation',
  'Experience & review',
] as const;
