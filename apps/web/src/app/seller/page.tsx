'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDemoStore, type DemoSellerListing } from '@/lib/demo-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ux';

export default function SellerHomePage() {
  const [listings, setListings] = useState<DemoSellerListing[]>([]);

  useEffect(() => {
    setListings(getDemoStore().seller.listings);
  }, []);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Owner / seller</p>
            <h2 className="mt-1 text-2xl font-bold">My listings</h2>
            <p className="mt-1 text-sm text-white/90">Seller preview listings stay in this browser. They are not published to Explore.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/40 bg-white/15 text-white hover:bg-white/25"><Link href="/seller/enquiries">Review enquiries</Link></Button>
            <Button asChild className="bg-white text-violet-800 hover:bg-white/90"><Link href="/seller/new">Add property</Link></Button>
          </div>
        </div>
      </div>
      {listings.length === 0 ? (
        <EmptyState title="No listings yet" body="Add a property to start a local enquiry preview." action={{ href: '/seller/new', label: 'Add property' }} />
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4 shadow-sm">
              <span className="absolute inset-y-0 left-0 w-1.5 bg-violet-500" />
              <div className="flex items-center justify-between pl-3">
                <div>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-sm text-muted-foreground">{l.enquiries} enquiries</p>
                </div>
                <Badge variant={/live|active|published/i.test(l.status) ? 'success' : 'info'}>{l.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
