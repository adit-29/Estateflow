export interface SpecializationSignal {
  locality: string;
  configuration: string;
  propertyType: string;
  budgetBand: string;
  transaction: string;
}

export interface DealerSpecialization {
  ready: boolean;
  periodLabel: string;
  strongestLocality: string | null;
  typicalConfiguration: string | null;
  typicalType: string | null;
  typicalBudget: string | null;
  transaction: string | null;
  sampleSize: number;
  source: 'Learned from your platform activity';
  note: string;
}

function mode(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

export function budgetBand(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) return '';
  if (amount < 80_00_000) return 'Under ₹80L';
  if (amount <= 1_50_00_000) return '₹80L–₹1.5Cr';
  if (amount <= 3_00_00_000) return '₹1.5Cr–₹3Cr';
  return '₹3Cr+';
}

const MIN_EVENTS = 8;

export function learnSpecialization(events: SpecializationSignal[], periodLabel: string): DealerSpecialization {
  const sampleSize = events.length;
  if (sampleSize < MIN_EVENTS) {
    return {
      ready: false,
      periodLabel,
      strongestLocality: null,
      typicalConfiguration: null,
      typicalType: null,
      typicalBudget: null,
      transaction: null,
      sampleSize,
      source: 'Learned from your platform activity',
      note: `Not enough activity yet (${sampleSize}/${MIN_EVENTS} recorded events).`,
    };
  }
  return {
    ready: true,
    periodLabel,
    strongestLocality: mode(events.map((row) => row.locality)),
    typicalConfiguration: mode(events.map((row) => row.configuration)),
    typicalType: mode(events.map((row) => row.propertyType)),
    typicalBudget: mode(events.map((row) => row.budgetBand)),
    transaction: mode(events.map((row) => row.transaction)),
    sampleSize,
    source: 'Learned from your platform activity',
    note: `Based on ${sampleSize} recorded leads/properties/visits in ${periodLabel}. Self-declared passport fields are not used here.`,
  };
}
