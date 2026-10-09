/**
 * Deterministic rule-based matching weights (not ML).
 * Each dimension scores 0–100 or "unknown" when data is missing.
 * Overall % = weighted average of known dimensions only (renormalized).
 */
export const DEFAULT_MATCH_WEIGHTS = {
  locality: 0.3,
  budget: 0.3,
  propertyType: 0.2,
  bedrooms: 0.1,
  readiness: 0.1,
} as const;

export type MatchDimension = keyof typeof DEFAULT_MATCH_WEIGHTS;

export type DimensionScore = number | 'unknown';

export interface MatchBreakdown {
  locality: DimensionScore;
  budget: DimensionScore;
  propertyType: DimensionScore;
  bedrooms: DimensionScore;
  readiness: DimensionScore;
}

export interface MatchResult {
  matchPercent: number;
  breakdown: MatchBreakdown;
  weightsUsed: typeof DEFAULT_MATCH_WEIGHTS;
  explanation: string;
}
