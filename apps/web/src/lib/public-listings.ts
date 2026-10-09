import { DEMO_ENABLED } from './demo-policy';

export interface PublicListing {
  id: string;
  title: string;
  locality: string;
  city: string;
  purpose: 'buy' | 'rent';
  type: string;
  beds: number | null;
  baths: number | null;
  areaSqft: number | null;
  price: number;
  status: string;
  description: string;
  features: string[];
  demo: true;
}

const SAMPLE_LISTINGS: PublicListing[] = [
  {
    id: 'demo-dwarka-3bhk',
    title: '3 BHK in Dwarka Sector 12',
    locality: 'Dwarka',
    city: 'Delhi',
    purpose: 'buy',
    type: 'Flat',
    beds: 3,
    baths: 2,
    areaSqft: 1450,
    price: 14500000,
    status: 'Active',
    description: 'Fictional sample listing for the EstateFlow demo. Park-facing, ready to move, two covered parking spots.',
    features: ['Park facing', 'Covered parking', 'Power backup'],
    demo: true,
  },
  {
    id: 'demo-whitefield-rent',
    title: '2 BHK rental near Whitefield',
    locality: 'Whitefield',
    city: 'Bengaluru',
    purpose: 'rent',
    type: 'Flat',
    beds: 2,
    baths: 2,
    areaSqft: 1100,
    price: 45000,
    status: 'Active',
    description: 'Fictional rental sample. Semi-furnished, close to the metro. Not a live listing.',
    features: ['Semi furnished', 'Metro nearby'],
    demo: true,
  },
  {
    id: 'demo-hsr-4bhk',
    title: '4 BHK builder floor, HSR Layout',
    locality: 'HSR Layout',
    city: 'Bengaluru',
    purpose: 'buy',
    type: 'Builder floor',
    beds: 4,
    baths: 4,
    areaSqft: 2800,
    price: 32000000,
    status: 'Availability needs confirmation',
    description: 'Fictional resale sample. Availability has not been reconfirmed.',
    features: ['Private terrace'],
    demo: true,
  },
  {
    id: 'demo-janakpuri-2bhk',
    title: '2 BHK apartment, Janakpuri',
    locality: 'Janakpuri',
    city: 'Delhi',
    purpose: 'buy',
    type: 'Apartment',
    beds: 2,
    baths: 2,
    areaSqft: 980,
    price: 8900000,
    status: 'Active',
    description: 'Fictional apartment sample near the metro. Not a live listing.',
    features: ['Lift', 'Covered parking'],
    demo: true,
  },
  {
    id: 'demo-dwarka-villa',
    title: '4 BHK villa, Dwarka Expressway',
    locality: 'Dwarka',
    city: 'Delhi',
    purpose: 'buy',
    type: 'Villa',
    beds: 4,
    baths: 4,
    areaSqft: 3200,
    price: 28000000,
    status: 'Active',
    description: 'Fictional villa sample used for the public marketplace cards.',
    features: ['Private garden'],
    demo: true,
  },
  {
    id: 'demo-noida-plot',
    title: 'Residential plot, Noida Sector 150',
    locality: 'Noida',
    city: 'Noida',
    purpose: 'buy',
    type: 'Plot',
    beds: null,
    baths: null,
    areaSqft: 1800,
    price: 16000000,
    status: 'Active',
    description: 'Fictional plot sample. Area is recorded; a building is not.',
    features: ['Corner plot'],
    demo: true,
  },
];

/** Fictional samples. Production builds ship none. */
export const PUBLIC_LISTINGS: PublicListing[] = DEMO_ENABLED ? SAMPLE_LISTINGS : [];

export function filterListings(input: {
  q?: string;
  purpose?: string;
  beds?: string;
  maxPrice?: string;
  minPrice?: string;
  type?: string;
}) {
  return PUBLIC_LISTINGS.filter((listing) => {
    if (input.purpose && listing.purpose !== input.purpose) return false;
    if (input.beds === '4+' && (listing.beds == null || listing.beds < 4)) return false;
    else if (input.beds && input.beds !== '4+' && String(listing.beds) !== input.beds) return false;
    if (input.maxPrice && listing.price > Number(input.maxPrice)) return false;
    if (input.minPrice && listing.price < Number(input.minPrice)) return false;
    if (input.type) {
      const wanted = input.type.toLowerCase();
      if (!listing.type.toLowerCase().includes(wanted) && !wanted.includes(listing.type.toLowerCase())) return false;
    }
    if (input.q) {
      const blob = `${listing.title} ${listing.locality} ${listing.city} ${listing.type}`.toLowerCase();
      if (!blob.includes(input.q.toLowerCase())) return false;
    }
    return true;
  });
}
