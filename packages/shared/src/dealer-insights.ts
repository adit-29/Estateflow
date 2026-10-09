export interface LeadScoreInput {
  status: string;
  followUp?: string | null;
  hasCompletedVisit: boolean;
  inNegotiation: boolean;
}

export interface LeadScore {
  score: number;
  reasons: string[];
  limit: 'This is a rule-based checklist. It is not a prediction that someone will buy.';
}

export function scoreLead(input: LeadScoreInput): LeadScore {
  const reasons: string[] = [];
  let score = 0;
  const status = input.status.toLowerCase();
  if (status.includes('qualif')) {
    score += 25;
    reasons.push('Status is recorded as qualified.');
  } else if (status.includes('new')) {
    score += 10;
    reasons.push('Lead is new. Little follow-up evidence is stored yet.');
  }
  if (input.followUp && /today|overdue/i.test(input.followUp)) {
    score += 20;
    reasons.push('A follow-up is due today or overdue.');
  }
  if (input.hasCompletedVisit) {
    score += 25;
    reasons.push('A completed site visit is stored for this lead.');
  }
  if (input.inNegotiation || status.includes('negot')) {
    score += 25;
    reasons.push('A negotiation stage is recorded.');
  }
  if (reasons.length === 0) {
    reasons.push('No extra evidence is stored beyond the lead record.');
  }
  return {
    score: Math.min(score, 100),
    reasons,
    limit: 'This is a rule-based checklist. It is not a prediction that someone will buy.',
  };
}

export interface ListingFact {
  id: string;
  title: string;
  locality: string;
  price: number | null;
  type?: string | null;
  beds?: number | null;
  status?: string | null;
  lastConfirmed?: string | null;
}

export function marketingDrafts(listing: ListingFact) {
  const price = listing.price == null ? 'Price not provided' : `₹${listing.price.toLocaleString('en-IN')}`;
  const beds = listing.beds == null ? '' : `${listing.beds} BHK · `;
  const type = listing.type ?? 'Property';
  const facts = `${listing.title}. ${beds}${type} in ${listing.locality}. ${price}. Status: ${listing.status ?? 'Not provided'}.`;
  return {
    facebook: `${facts} Demo draft. Amenities and distances are omitted because they are not stored.`,
    instagram: `${facts} Demo caption. Nothing was published.`,
    whatsapp: `Hello, sharing a listing from our demo workspace: ${facts} Please confirm availability before a visit.`,
  };
}

export interface ListingWarning {
  code: 'missing_details' | 'stale' | 'possible_duplicate' | 'price_check';
  message: string;
}

export function listingWarnings(listing: ListingFact, others: ListingFact[], today = '2026-09-26'): ListingWarning[] {
  const warnings: ListingWarning[] = [];
  if (listing.beds == null || listing.price == null || !listing.type) {
    warnings.push({ code: 'missing_details', message: 'Needs verification: bedrooms, price, or property type is missing.' });
  }
  if (!listing.lastConfirmed || listing.lastConfirmed < '2026-06-01') {
    warnings.push({ code: 'stale', message: `Needs verification: last confirmed date is missing or older than 1 Jun 2026 (checked ${today}).` });
  }
  const duplicate = others.find((other) => {
    if (other.id === listing.id || other.locality !== listing.locality || other.beds !== listing.beds) return false;
    if (listing.price == null || other.price == null) return false;
    return Math.abs(other.price - listing.price) / listing.price < 0.02;
  });
  if (duplicate) {
    warnings.push({ code: 'possible_duplicate', message: `Possible duplicate of “${duplicate.title}” based on locality, bedrooms, and price.` });
  }
  const comps = others.filter((other) => other.id !== listing.id && other.locality === listing.locality && other.price != null);
  if (listing.price != null && comps.length >= 3) {
    const avg = comps.reduce((sum, row) => sum + (row.price ?? 0), 0) / comps.length;
    if (listing.price < avg * 0.6 || listing.price > avg * 1.6) {
      warnings.push({ code: 'price_check', message: 'Needs verification: price differs from other entered listings in this locality. This is not a fraud label.' });
    }
  }
  return warnings;
}
