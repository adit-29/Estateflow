import { PUBLIC_LISTINGS, type PublicListing } from './public-listings';

export function formatCr(value: number) {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(0)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export function listingPsf(listing: PublicListing) {
  if (!listing.areaSqft) return null;
  return Math.round(listing.price / listing.areaSqft);
}

export function localitySnapshots(listings: PublicListing[] = PUBLIC_LISTINGS) {
  const map = new Map<string, { locality: string; city: string; sale: PublicListing[]; rent: PublicListing[] }>();
  for (const listing of listings) {
    const row = map.get(listing.locality) ?? { locality: listing.locality, city: listing.city, sale: [], rent: [] };
    if (listing.purpose === 'rent') row.rent.push(listing);
    else row.sale.push(listing);
    map.set(listing.locality, row);
  }
  return [...map.values()].map((row) => {
    const salePrices = row.sale.map((item) => item.price);
    const rentPrices = row.rent.map((item) => item.price);
    const psf = row.sale.map(listingPsf).filter((value): value is number => value != null);
    return {
      locality: row.locality,
      city: row.city,
      saleCount: row.sale.length,
      rentCount: row.rent.length,
      avgSale: salePrices.length ? Math.round(salePrices.reduce((a, b) => a + b, 0) / salePrices.length) : null,
      avgRent: rentPrices.length ? Math.round(rentPrices.reduce((a, b) => a + b, 0) / rentPrices.length) : null,
      avgPsf: psf.length ? Math.round(psf.reduce((a, b) => a + b, 0) / psf.length) : null,
    };
  }).sort((a, b) => b.saleCount + b.rentCount - (a.saleCount + a.rentCount));
}

export function citySnapshots(listings: PublicListing[] = PUBLIC_LISTINGS) {
  const cities = [...new Set(listings.map((item) => item.city))];
  return cities.map((city) => ({
    city,
    count: listings.filter((item) => item.city === city).length,
  }));
}

export function trendingLocalities(listings: PublicListing[] = PUBLIC_LISTINGS) {
  return [...new Set(listings.map((item) => item.locality))];
}

export function monthlyEmi(principal: number, annualRate = 8.5, years = 20) {
  const r = annualRate / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}
