'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PUBLIC_LISTINGS } from '@/lib/public-listings';
import { PublicHeader } from '@/components/public-header';
import { SampleTourViewer } from '@/features/tours/sample-tour-viewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const listing = PUBLIC_LISTINGS.find((item) => item.id === id);
  const [enquiry, setEnquiry] = useState('');
  const [sent, setSent] = useState(false);

  if (!listing) {
    return <p className="p-8 text-sm">Listing not found.</p>;
  }

  const pricePerSqft = listing.areaSqft ? Math.round(listing.price / listing.areaSqft) : null;

  const similar = PUBLIC_LISTINGS.filter((item) => item.id !== listing.id && (item.city === listing.city || item.type === listing.type));

  return (
    <div>
      <PublicHeader />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <p className="text-sm text-muted-foreground"><Link href="/explore">Explore</Link> / {listing.locality}</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{listing.title}</h1>
          <p className="text-muted-foreground">{listing.locality}, {listing.city}</p>
        </div>
        <Badge variant="muted">Demo listing</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <div className="flex h-72 items-end rounded-2xl bg-muted p-6 text-sm text-muted-foreground">No photograph stored for this sample.</div>
          <p className="text-2xl font-semibold">₹{listing.price.toLocaleString('en-IN')}</p>
          <p className="text-sm text-muted-foreground">{pricePerSqft && listing.purpose === 'buy' ? `₹${pricePerSqft.toLocaleString('en-IN')} / sq ft · ` : ''}{listing.status}</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Fact label="Bedrooms" value={listing.beds == null ? 'Not provided' : String(listing.beds)} />
            <Fact label="Bathrooms" value={listing.baths == null ? 'Not provided' : String(listing.baths)} />
            <Fact label="Area" value={listing.areaSqft ? `${listing.areaSqft} sq ft` : 'Not provided'} />
          </div>
          <p className="text-sm leading-6">{listing.description}</p>
          <ul className="flex flex-wrap gap-2">{listing.features.map((feature) => <li key={feature} className="rounded-full border px-3 py-1 text-xs">{feature}</li>)}</ul>
          <section className="rounded-2xl border p-4">
            <h2 className="font-medium">Floor plan</h2>
            <p className="mt-2 text-sm text-muted-foreground">No floor plan has been uploaded.</p>
          </section>
          <section className="rounded-2xl border p-4">
            <h2 className="font-medium">Location</h2>
            <p className="mt-2 text-sm text-muted-foreground">{listing.locality}, {listing.city}. A map is not shown because coordinates are not stored.</p>
          </section>
          <section className="space-y-3 rounded-2xl border p-4" aria-labelledby="tour-heading">
            <h2 id="tour-heading" className="font-medium">3D home tour</h2>
            <p className="text-sm text-muted-foreground">
              This demo listing has no real tour. The sample apartment below shows how the viewer works. It is not this property.
            </p>
            <SampleTourViewer height={380} />
          </section>
          <section className="rounded-2xl border p-4">
            <h2 className="font-medium">Similar demo listings</h2>
            {similar.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No other demo listings share this city or property type.</p> : (
              <ul className="mt-2 space-y-2 text-sm">{similar.map((item) => <li key={item.id}><Link href={`/explore/${item.id}`}>{item.title}</Link></li>)}</ul>
            )}
          </section>
        </div>
        <aside className="h-fit space-y-3 rounded-2xl border p-4">
          <p className="text-2xl font-semibold">
            {listing.purpose === 'rent' ? `₹${listing.price.toLocaleString('en-IN')}/month` : `₹${listing.price.toLocaleString('en-IN')}`}
          </p>
          <p className="text-meta text-muted-foreground">{listing.beds ? `${listing.beds} BHK` : 'BHK not recorded'} · {listing.areaSqft ? `${listing.areaSqft} sq ft` : 'Area not recorded'} · {listing.locality}</p>
          <p className="text-helper">{listing.status === 'Active' ? 'Last confirmed on the demo listing record.' : 'Availability needs confirmation'}</p>
          <Button asChild className="w-full"><Link href="/auth/sign-in?role=buyer">Schedule a visit</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link href="/auth/sign-in?role=dealer">Contact dealer</Link></Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => setSent(true)}>Save property</Button>
          <h2 className="font-medium">Request a callback</h2>
          <p className="text-xs text-muted-foreground">Demo only. This does not book a visit or contact a dealer.</p>
          <Input aria-label="Your name" placeholder="Name" required={false} value={enquiry} onChange={(e) => setEnquiry(e.target.value)} />
          <Button disabled={enquiry.trim().length < 2} onClick={() => setSent(true)}>Save demo enquiry</Button>
          {sent && <p className="text-xs">Saved in this page only. No appointment was booked.</p>}
        </aside>
      </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{label}</p><p>{value}</p></div>;
}
