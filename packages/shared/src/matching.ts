import {
  DEFAULT_MATCH_WEIGHTS,
  type DimensionScore,
  type MatchBreakdown,
  type MatchResult,
} from './matching-config';

export { DEFAULT_MATCH_WEIGHTS } from './matching-config';

export interface BuyerMatchInput {
  localities?: string[];
  propertyTypes?: string[];
  bedroomsMin?: number | null;
  bedroomsMax?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  readiness?: string | null;
}

export interface PropertyMatchInput {
  locality?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  priceAmount?: number | null;
  listingStatus?: string | null;
}

function localityScore(buyer: BuyerMatchInput, property: PropertyMatchInput): DimensionScore {
  if (!buyer.localities?.length || !property.locality?.trim()) return 'unknown';
  const loc = property.locality.toLowerCase();
  const hit = buyer.localities.some((l) => {
    const b = l.toLowerCase();
    return loc.includes(b) || b.includes(loc);
  });
  return hit ? 100 : 0;
}

function budgetScore(buyer: BuyerMatchInput, property: PropertyMatchInput): DimensionScore {
  const price = property.priceAmount;
  if (price == null || price <= 0) return 'unknown';
  const min = buyer.budgetMin;
  const max = buyer.budgetMax;
  if (min == null && max == null) return 'unknown';
  const lo = min ?? 0;
  const hi = max ?? Number.MAX_SAFE_INTEGER;
  if (price >= lo && price <= hi) return 100;
  if (price < lo) {
    const gap = lo - price;
    const tolerance = lo * 0.1;
    return gap <= tolerance ? 70 : 0;
  }
  const gap = price - hi;
  const tolerance = hi * 0.1;
  return gap <= tolerance ? 50 : 0;
}

function propertyTypeScore(buyer: BuyerMatchInput, property: PropertyMatchInput): DimensionScore {
  if (!buyer.propertyTypes?.length || !property.propertyType) return 'unknown';
  return buyer.propertyTypes.includes(property.propertyType) ? 100 : 0;
}

function bedroomScore(buyer: BuyerMatchInput, property: PropertyMatchInput): DimensionScore {
  const beds = property.bedrooms;
  if (beds == null) return 'unknown';
  const min = buyer.bedroomsMin;
  const max = buyer.bedroomsMax;
  if (min == null && max == null) return 'unknown';
  const lo = min ?? 0;
  const hi = max ?? 99;
  if (beds >= lo && beds <= hi) return 100;
  if (beds === lo - 1 || beds === hi + 1) return 60;
  return 0;
}

function readinessScore(buyer: BuyerMatchInput, property: PropertyMatchInput): DimensionScore {
  if (!buyer.readiness) return 'unknown';
  if (property.listingStatus !== 'active') return 40;
  return buyer.readiness === 'ready' ? 100 : 80;
}

export function computeMatch(
  buyer: BuyerMatchInput,
  property: PropertyMatchInput,
  weights = DEFAULT_MATCH_WEIGHTS,
): MatchResult {
  const breakdown: MatchBreakdown = {
    locality: localityScore(buyer, property),
    budget: budgetScore(buyer, property),
    propertyType: propertyTypeScore(buyer, property),
    bedrooms: bedroomScore(buyer, property),
    readiness: readinessScore(buyer, property),
  };

  let weightedSum = 0;
  let weightTotal = 0;
  (Object.keys(weights) as (keyof typeof weights)[]).forEach((key) => {
    const score = breakdown[key];
    if (score === 'unknown') return;
    weightedSum += score * weights[key];
    weightTotal += weights[key];
  });

  const matchPercent = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  return {
    matchPercent,
    breakdown,
    weightsUsed: weights,
    explanation:
      'Rule-based score from weighted dimensions. Missing fields show as "unknown" and are excluded from the average — not treated as a match.',
  };
}
