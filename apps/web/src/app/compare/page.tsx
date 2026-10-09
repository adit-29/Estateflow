'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PUBLIC_LISTINGS } from '@/lib/public-listings';
import { formatCr, listingPsf } from '@/lib/marketplace-stats';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Badge } from '@/components/ui/badge';

export default function ComparePage() {
  const [left, setLeft] = useState(PUBLIC_LISTINGS[0]?.id ?? '');
  const [right, setRight] = useState(PUBLIC_LISTINGS[1]?.id ?? '');
  const a = useMemo(() => PUBLIC_LISTINGS.find((row) => row.id === left), [left]);
  const b = useMemo(() => PUBLIC_LISTINGS.find((row) => row.id === right), [right]);

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div>
          <p className="text-sm text-amber-700">Buyers</p>
          <h1 className="text-3xl font-semibold">Compare properties</h1>
          <p className="mt-2 text-sm text-muted-foreground">Side-by-side fields from the public demo catalogue. Availability is not reconfirmed here.</p>
        </div>
        {!PUBLIC_LISTINGS.length ? (
          <p className="text-sm text-muted-foreground">No public listings in this build.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Property A
                <select className="mt-1 h-11 w-full rounded-md border bg-white px-3" value={left} onChange={(event) => setLeft(event.target.value)}>
                  {PUBLIC_LISTINGS.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
                </select>
              </label>
              <label className="text-sm">
                Property B
                <select className="mt-1 h-11 w-full rounded-md border bg-white px-3" value={right} onChange={(event) => setRight(event.target.value)}>
                  {PUBLIC_LISTINGS.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[a, b].map((listing) => listing && (
                <article key={listing.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <Badge variant="warm">Demo</Badge>
                  <h2 className="mt-2 text-xl font-semibold">{listing.title}</h2>
                  <p className="text-sm text-muted-foreground">{listing.locality}, {listing.city}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><dt>Price</dt><dd className="font-medium">{formatCr(listing.price)}</dd></div>
                    <div className="flex justify-between"><dt>Purpose</dt><dd>{listing.purpose}</dd></div>
                    <div className="flex justify-between"><dt>Type</dt><dd>{listing.type}</dd></div>
                    <div className="flex justify-between"><dt>BHK</dt><dd>{listing.beds ?? 'Not recorded'}</dd></div>
                    <div className="flex justify-between"><dt>Area</dt><dd>{listing.areaSqft ? `${listing.areaSqft} sq ft` : 'Not recorded'}</dd></div>
                    <div className="flex justify-between"><dt>₹ / sq ft</dt><dd>{listingPsf(listing) ? `₹${listingPsf(listing)?.toLocaleString('en-IN')}` : '—'}</dd></div>
                    <div className="flex justify-between"><dt>Status</dt><dd>{listing.status}</dd></div>
                  </dl>
                  <p className="mt-3 text-sm text-muted-foreground">{listing.features.join(' · ') || 'No features stored.'}</p>
                  <Link href={`/explore/${listing.id}`} className="mt-4 inline-block text-sm font-medium text-amber-700">Open listing →</Link>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
