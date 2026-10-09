export type MessagingChannel = 'whatsapp' | 'instagram' | 'facebook_messenger';

export type MessageDirection = 'inbound' | 'outbound';

export interface ExtractionField<T = string> {
  value: T | null;
  confidence: 'high' | 'low' | 'unknown';
  needsConfirmation: boolean;
}

export interface BuyerRequirementExtraction {
  localities: ExtractionField<string[]>;
  budgetInr: ExtractionField<number>;
  propertyType: ExtractionField<string>;
  bedrooms: ExtractionField<number>;
  transactionType: ExtractionField<string>;
  financing: ExtractionField<string>;
  timeline: ExtractionField<string>;
  missing: string[];
  overallConfidence: 'high' | 'medium' | 'low';
  note: string;
}

const KNOWN_LOCALITIES = [
  'Dwarka',
  'Janakpuri',
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'HSR Layout',
  'Yelahanka',
];

/**
 * Deterministic demo extractor — not a language model.
 * Ambiguous or missing fields are marked needsConfirmation instead of guessed.
 */
export function extractBuyerRequirement(text: string): BuyerRequirementExtraction {
  const localities = KNOWN_LOCALITIES.filter((l) => text.toLowerCase().includes(l.toLowerCase()));

  let budget: number | null = null;
  const crore = text.match(/(\d+(?:\.\d+)?)\s*crore/i);
  const lakh = text.match(/(\d+(?:\.\d+)?)\s*lakh/i);
  if (crore) budget = Math.round(parseFloat(crore[1]) * 1_00_00_000);
  else if (lakh) budget = Math.round(parseFloat(lakh[1]) * 1_00_000);

  const bhk = text.match(/(\d)\s*bhk/i);
  const bedrooms = bhk ? Number(bhk[1]) : null;

  const hasLoan = /loan/i.test(text);
  const ready = /ready[\s-]*to[\s-]*move/i.test(text);
  const rent = /\brent\b/i.test(text);
  const sale = /buy|purchase|chahiye|sale/i.test(text);

  const missing: string[] = [];
  if (!localities.length) missing.push('Preferred localities');
  if (budget == null) missing.push('Budget');
  if (bedrooms == null) missing.push('Bedrooms');
  if (!rent && !sale) missing.push('Transaction type');

  const knownCount = [localities.length > 0, budget != null, bedrooms != null].filter(Boolean).length;
  const overallConfidence: BuyerRequirementExtraction['overallConfidence'] =
    knownCount >= 3 ? 'high' : knownCount === 2 ? 'medium' : 'low';

  return {
    localities: {
      value: localities.length ? localities : null,
      confidence: localities.length ? 'high' : 'unknown',
      needsConfirmation: localities.length === 0,
    },
    budgetInr: {
      value: budget,
      confidence: budget != null ? 'high' : 'unknown',
      needsConfirmation: budget == null,
    },
    propertyType: {
      value: bedrooms != null ? 'flat' : null,
      confidence: bedrooms != null ? 'low' : 'unknown',
      needsConfirmation: true,
    },
    bedrooms: {
      value: bedrooms,
      confidence: bedrooms != null ? 'high' : 'unknown',
      needsConfirmation: bedrooms == null,
    },
    transactionType: {
      value: rent ? 'rent' : sale ? 'sale' : null,
      confidence: rent || sale ? 'low' : 'unknown',
      needsConfirmation: true,
    },
    financing: {
      value: hasLoan ? 'home_loan' : null,
      confidence: hasLoan ? 'high' : 'unknown',
      needsConfirmation: !hasLoan,
    },
    timeline: {
      value: ready ? 'ready_to_move' : null,
      confidence: ready ? 'high' : 'unknown',
      needsConfirmation: !ready,
    },
    missing,
    overallConfidence,
    note: 'Rule-based extraction for review. Confirm before writing to CRM. Not a live AI model.',
  };
}
