'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { matchPublicListings, type PublicRequirement } from '@estateflow/shared';
import { PUBLIC_LISTINGS } from '@/lib/public-listings';
import { PublicHeader } from '@/components/public-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ux';

const TYPES = ['Flat', 'Builder Floor', 'Plot', 'Villa', 'Independent House', 'Commercial'];
const BHK = ['1', '2', '3', '4', '5+'];
const EXTRAS = ['Parking', 'Metro nearby', 'Furnished', 'Balcony', 'Lift', 'Gated society'];
const RENT_EXTRAS = ['Fully furnished', 'Semi furnished', 'Unfurnished', 'Parking', 'Pet-friendly'];

function formatMoney(n: number, rent: boolean) {
  if (rent) return `₹${n.toLocaleString('en-IN')}/month`;
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2).replace(/\.0+$/, '')}Cr`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function RequirementFlow({ purpose }: { purpose: 'buy' | 'rent' }) {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [req, setReq] = useState<PublicRequirement>({
    purpose,
    localities: [params.get('location') || 'Dwarka'],
    propertyType: params.get('type') || '',
    beds: params.get('beds') || '',
    minArea: '',
    maxArea: '',
    areaUnit: purpose === 'buy' ? 'sqyd' : 'sqft',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    readiness: '',
    extras: [],
    furnished: '',
  });

  const listings = useMemo(
    () =>
      PUBLIC_LISTINGS.map((item) => ({
        id: item.id,
        title: item.title,
        locality: item.locality,
        city: item.city,
        purpose: item.purpose,
        type: item.type,
        beds: item.beds,
        areaSqft: item.areaSqft,
        price: item.price,
        status: item.status,
        demo: item.demo,
        features: item.features,
      })),
    [],
  );
  const matches = useMemo(() => matchPublicListings(listings, req), [listings, req]);

  const buySteps = [
    'Location',
    'Property type',
    'Configuration',
    'Area',
    'Budget',
    'Condition',
    'Preferences',
  ];
  const rentSteps = ['Location', 'Property type', 'BHK', 'Rent budget', 'Furnishing', 'Move-in', 'Preferences'];
  const labels = purpose === 'buy' ? buySteps : rentSteps;

  function next() {
    if (step < labels.length - 1) setStep(step + 1);
    else setShow(true);
  }

  if (show) {
    return (
      <div>
        <PublicHeader />
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
          <p className="text-meta text-primary">Aapki requirement</p>
          <h1 className="text-page">
            {req.localities.filter(Boolean).join(', ') || 'Location not set'}
            {req.beds ? ` · ${req.beds} BHK` : ''}
            {req.minArea || req.maxArea ? ` · ${req.minArea || '—'}–${req.maxArea || '—'} ${req.areaUnit}` : ''}
            {(req.minPrice || req.maxPrice) && ` · ${req.minPrice ? formatMoney(Number(req.minPrice), purpose === 'rent') : '—'}–${req.maxPrice ? formatMoney(Number(req.maxPrice), purpose === 'rent') : '—'}`}
          </h1>
          <p className="text-body text-muted-foreground">{matches.length} properties match — demo listings only, live inventory nahi.</p>
          <Button type="button" variant="outline" onClick={() => setShow(false)}>Requirement edit karo</Button>
          {matches.length === 0 ? (
            <EmptyState
              title="Abhi koi matching property nahi mili."
              body="Filters lock kiye hue fields par chal rahe hain. Network inventory check karein ya requirement dheeli karein."
              action={{ href: '/explore', label: 'Explore all demo listings' }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matches.map((row) => (
                <Link key={row.listing.id} href={`/explore/${row.listing.id}`} className="rounded-xl border bg-card p-4 hover:shadow-md">
                  <div className="mb-3 flex h-36 items-end rounded-lg bg-[linear-gradient(135deg,#d7c4a3,#8ea39a)] p-3 text-meta">
                    {row.listing.locality}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-card">{row.listing.title}</p>
                    {row.listing.demo && <Badge variant="muted">Demo</Badge>}
                  </div>
                  <p className="mt-1 text-body font-medium">{formatMoney(row.listing.price, purpose === 'rent')}</p>
                  <p className="text-meta text-muted-foreground">
                    {row.listing.beds ? `${row.listing.beds} BHK` : 'Config not recorded'} · {row.listing.areaSqft ? `${row.listing.areaSqft} sq ft` : 'Area not recorded'} · {row.listing.type}
                  </p>
                  <p className="mt-2 text-helper text-muted-foreground">{row.percent}% match · {row.explanation || 'Recorded fields only'}</p>
                  {row.listing.status !== 'Active' && <p className="mt-1 text-helper">Availability needs confirmation</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PublicHeader />
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
        <p className="text-meta text-primary">{purpose === 'buy' ? 'Buy' : 'Rent'} · Step {step + 1} / {labels.length}</p>
        <h1 className="text-page">Aap kis type ki property dhoond rahe hain?</h1>
        <p className="text-body text-muted-foreground">{labels[step]}</p>

        {step === 0 && (
          <label className="block text-meta">
            Kahan property chahiye?
            <Input
              className="mt-2"
              value={req.localities[0] ?? ''}
              onChange={(e) => setReq({ ...req, localities: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
              placeholder="City, locality — comma se multiple"
            />
          </label>
        )}
        {step === 1 && (
          <div className="flex flex-wrap gap-2">
            {TYPES.map((item) => (
              <Button key={item} type="button" variant={req.propertyType === item ? 'default' : 'outline'} onClick={() => setReq({ ...req, propertyType: item })}>
                {item}
              </Button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {BHK.map((item) => (
              <Button key={item} type="button" variant={req.beds === item ? 'default' : 'outline'} onClick={() => setReq({ ...req, beds: item })}>
                {item} BHK
              </Button>
            ))}
          </div>
        )}
        {purpose === 'buy' && step === 3 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="h-10 rounded-md border px-2 text-body" value={req.areaUnit} onChange={(e) => setReq({ ...req, areaUnit: e.target.value as PublicRequirement['areaUnit'] })} aria-label="Area unit">
              <option value="sqft">Sq Ft</option>
              <option value="sqyd">Sq Yd / Gaj</option>
              <option value="sqm">Sq M</option>
            </select>
            <Input placeholder="Minimum" value={req.minArea} onChange={(e) => setReq({ ...req, minArea: e.target.value })} />
            <Input placeholder="Maximum" value={req.maxArea} onChange={(e) => setReq({ ...req, maxArea: e.target.value })} />
          </div>
        )}
        {((purpose === 'buy' && step === 4) || (purpose === 'rent' && step === 3)) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder={purpose === 'rent' ? 'Min monthly rent' : 'Min budget'} value={req.minPrice} onChange={(e) => setReq({ ...req, minPrice: e.target.value })} />
            <Input placeholder={purpose === 'rent' ? 'Max monthly rent' : 'Max budget'} value={req.maxPrice} onChange={(e) => setReq({ ...req, maxPrice: e.target.value })} />
            {purpose === 'rent' && <p className="text-helper text-muted-foreground sm:col-span-2">Security deposit sirf tab dikhega jab listing par recorded ho.</p>}
          </div>
        )}
        {purpose === 'buy' && step === 5 && (
          <div className="flex flex-wrap gap-2">
            {['Ready to move', 'Under construction', 'Any'].map((item) => (
              <Button key={item} type="button" variant={req.readiness === item ? 'default' : 'outline'} onClick={() => setReq({ ...req, readiness: item === 'Any' ? '' : item })}>
                {item}
              </Button>
            ))}
          </div>
        )}
        {purpose === 'rent' && step === 4 && (
          <div className="flex flex-wrap gap-2">
            {['Fully', 'Semi', 'Unfurnished'].map((item) => (
              <Button key={item} type="button" variant={req.furnished === item ? 'default' : 'outline'} onClick={() => setReq({ ...req, furnished: item })}>
                {item}
              </Button>
            ))}
          </div>
        )}
        {purpose === 'rent' && step === 5 && (
          <p className="text-body text-muted-foreground">Move-in date aur lease duration listing par tabhi dikhengi jab recorded hon. Is demo set mein ye fields optional hain.</p>
        )}
        {((purpose === 'buy' && step === 6) || (purpose === 'rent' && step === 6)) && (
          <div className="flex flex-wrap gap-2">
            {(purpose === 'rent' ? RENT_EXTRAS : EXTRAS).map((item) => {
              const on = req.extras.includes(item);
              return (
                <Button
                  key={item}
                  type="button"
                  variant={on ? 'default' : 'outline'}
                  onClick={() => setReq({ ...req, extras: on ? req.extras.filter((x) => x !== item) : [...req.extras, item] })}
                >
                  {item}
                </Button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          {step > 0 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button type="button" onClick={next}>{step === labels.length - 1 ? (purpose === 'rent' ? 'Show matching rentals' : 'Show matching properties') : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );
}
