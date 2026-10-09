import { computeMatch } from './matching';

export interface PublicRequirement {
  purpose: 'buy' | 'rent';
  localities: string[];
  propertyType: string;
  beds: string;
  minArea: string;
  maxArea: string;
  areaUnit: 'sqft' | 'sqyd' | 'sqm';
  minPrice: string;
  maxPrice: string;
  readiness: string;
  extras: string[];
  furnished?: string;
}

export interface PublicMatchListing {
  id: string;
  title: string;
  locality: string;
  city: string;
  purpose: 'buy' | 'rent';
  type: string;
  beds: number | null;
  areaSqft: number | null;
  price: number;
  status: string;
  demo?: boolean;
  features: string[];
}

function toSqft(value: number, unit: PublicRequirement['areaUnit']): number {
  if (unit === 'sqyd') return value * 9;
  if (unit === 'sqm') return value * 10.7639;
  return value;
}

export function matchPublicListings(listings: PublicMatchListing[], req: PublicRequirement) {
  return listings
    .filter((listing) => listing.purpose === req.purpose)
    .map((listing) => {
      const match = computeMatch(
        {
          localities: req.localities.filter(Boolean),
          propertyTypes: req.propertyType ? [req.propertyType] : [],
          bedroomsMin: req.beds && req.beds !== '5+' ? Number(req.beds) : req.beds === '5+' ? 5 : null,
          bedroomsMax: req.beds === '5+' ? 20 : req.beds ? Number(req.beds) : null,
          budgetMin: req.minPrice ? Number(req.minPrice) : null,
          budgetMax: req.maxPrice ? Number(req.maxPrice) : null,
          readiness: req.readiness || null,
        },
        {
          locality: listing.locality,
          propertyType: listing.type,
          bedrooms: listing.beds,
          priceAmount: listing.price,
          listingStatus: listing.status.toLowerCase().includes('active') ? 'active' : listing.status,
        },
      );
      const minArea = req.minArea ? toSqft(Number(req.minArea), req.areaUnit) : null;
      const maxArea = req.maxArea ? toSqft(Number(req.maxArea), req.areaUnit) : null;
      let areaOk = true;
      if (listing.areaSqft == null && (minArea || maxArea)) areaOk = false;
      if (listing.areaSqft != null && minArea && listing.areaSqft < minArea) areaOk = false;
      if (listing.areaSqft != null && maxArea && listing.areaSqft > maxArea) areaOk = false;
      const extrasMissing = req.extras.filter((extra) => !listing.features.some((feature) => feature.toLowerCase().includes(extra.toLowerCase())));
      return {
        listing,
        percent: areaOk ? match.matchPercent : Math.max(0, match.matchPercent - 15),
        explanation: [
          ...Object.entries(match.breakdown)
            .filter(([, score]) => score !== 'unknown')
            .map(([dimension, score]) => `${dimension}: ${score}`),
          listing.areaSqft == null && (minArea || maxArea) ? 'Area not recorded' : '',
          extrasMissing.length ? `Not recorded: ${extrasMissing.join(', ')}` : '',
        ].filter(Boolean).join(' · '),
        missing: [
          ...Object.entries(match.breakdown).filter(([, score]) => score === 'unknown').map(([dimension]) => dimension),
          ...extrasMissing.map((item) => `${item} not on listing`),
        ],
      };
    })
    .sort((a, b) => b.percent - a.percent);
}
