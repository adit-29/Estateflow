'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { filterListings } from '@/lib/public-listings';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ux';

export default function ExplorePage() {
  return (
    <Suspense fallback={<p className="p-8 text-body text-muted-foreground">Listings load ho rahi hain…</p>}>
      <ExploreInner />
    </Suspense>
  );
}

function ExploreInner() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [purpose, setPurpose] = useState(params.get('purpose') === 'rent' || params.get('purpose') === 'buy' ? params.get('purpose') ?? '' : '');
  const [beds, setBeds] = useState(params.get('beds') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [type, setType] = useState(params.get('type') ?? '');
  const [suggestOpen, setSuggestOpen] = useState(false);

  const results = useMemo(
    () => filterListings({ q, purpose, beds, maxPrice, minPrice, type }),
    [q, purpose, beds, maxPrice, minPrice, type],
  );
  const suggestions = q.trim().length >= 2 ? results.slice(0, 5) : [];
  const chips = [
    q && { key: 'q', label: q, clear: () => setQ('') },
    purpose && { key: 'purpose', label: purpose, clear: () => setPurpose('') },
    type && { key: 'type', label: type, clear: () => setType('') },
    beds && { key: 'beds', label: beds === '4+' ? '4 BHK+' : `${beds} BHK`, clear: () => setBeds('') },
    minPrice && { key: 'min', label: `Min ₹${Number(minPrice).toLocaleString('en-IN')}`, clear: () => setMinPrice('') },
    maxPrice && { key: 'price', label: `Max ₹${Number(maxPrice).toLocaleString('en-IN')}`, clear: () => setMaxPrice('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  function clearAll() {
    setQ('');
    setPurpose('');
    setBeds('');
    setMaxPrice('');
    setMinPrice('');
    setType('');
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div>
          <p className="text-sm text-amber-700">Buyers</p>
          <h1 className="text-3xl font-semibold tracking-tight">Find a home</h1>
          <p className="mt-2 text-muted-foreground">These cards are fictional demo listings. They are not verified market inventory.</p>
        </div>
        <form className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-6" onSubmit={(e) => e.preventDefault()}>
          <div className="relative md:col-span-2">
            <Input
              aria-label="Locality"
              aria-autocomplete="list"
              aria-controls="explore-suggest"
              placeholder="City or locality"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSuggestOpen(false), 150);
              }}
            />
            {suggestOpen && suggestions.length > 0 && (
              <ul id="explore-suggest" role="listbox" className="absolute z-10 mt-1 w-full rounded-md border bg-card p-1 text-sm">
                {suggestions.map((item) => (
                  <li key={item.id} role="option" aria-selected={false}>
                    <button type="button" className="w-full rounded px-2 py-1 text-left hover:bg-muted" onClick={() => setQ(item.locality)}>{item.title}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select aria-label="Buy or rent" className="h-10 rounded-md border px-2 text-sm" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="">Buy or rent</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
          </select>
          <select aria-label="Property type" className="h-10 rounded-md border px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any type</option>
            <option value="Apartment">Apartment</option>
            <option value="Builder Floor">Builder Floor</option>
            <option value="Villa">Villa</option>
            <option value="Plot">Plot</option>
            <option value="Flat">Flat</option>
          </select>
          <select aria-label="Bedrooms" className="h-10 rounded-md border px-2 text-sm" value={beds} onChange={(e) => setBeds(e.target.value)}>
            <option value="">Bedrooms</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="4+">4+</option>
          </select>
          <Input aria-label="Maximum budget" placeholder="Max budget" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <Button type="button" variant="outline" onClick={clearAll}>Clear filters</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button key={chip.key} type="button" className="rounded-full border bg-white px-3 py-1 text-xs" onClick={chip.clear}>
              {chip.label} ×
            </button>
          ))}
        </div>
        {results.length === 0 ? (
          <EmptyState title="No demo listings match these filters" body="Clear a filter or browse all fictional listings. These records are not live inventory." action={{ href: '/explore', label: 'Browse all demo listings' }} />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {results.map((listing) => (
              <Link key={listing.id} href={`/explore/${listing.id}`} className="group overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-40 items-end bg-[linear-gradient(135deg,#d7c4a3,#8ea39a)] p-4 text-sm text-[#1c2b33] transition-transform group-hover:scale-[1.02]">{listing.locality}</div>
                <div className="space-y-2 p-4">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{listing.title}</p>
                    <Badge variant="warm">Demo</Badge>
                  </div>
                  <p className="text-sm">₹{listing.price.toLocaleString('en-IN')} · {listing.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    {listing.beds ? `${listing.beds} BHK` : 'Beds not provided'} · {listing.areaSqft ? `${listing.areaSqft} sq ft` : 'Area not provided'} · {listing.type}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
