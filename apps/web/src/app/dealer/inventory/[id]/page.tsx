'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatInr, listingWarnings, marketingDrafts } from '@estateflow/shared';
import { getDemoStore, type DemoProperty } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type PropertyRow } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';
import { ErrorState, PageSkeleton } from '@/components/ux';
import { LISTING_STATUS_LABEL, prettyStatus } from '@/features/dealer/labels';

function staleDays(iso?: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mode = useLiveMode();
  const { notify } = useToast();
  const [property, setProperty] = useState<DemoProperty | null>(null);
  const [live, setLive] = useState<PropertyRow | null | undefined>(undefined);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (mode === 'demo') {
      setProperty(getDemoStore().dealer.properties.find((p) => p.id === id) ?? null);
    }
    if (mode === 'live') {
      api.getProperty(id)
        .then(setLive)
        .catch((err: unknown) => {
          setLive(null);
          setError(err instanceof ApiError ? err.message : 'We could not load this property.');
        });
    }
  }, [id, mode]);

  async function archiveListing() {
    if (!window.confirm('Archive this listing? It will leave the active inventory until you change its status.')) return;
    setArchiving(true);
    try {
      const updated = await api.archiveProperty(id);
      setLive(updated);
      notify('Listing archived');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not archive the listing.');
    } finally {
      setArchiving(false);
    }
  }

  async function verify() {
    setVerifying(true);
    try {
      const updated = await api.updateProperty(id, { lastConfirmedAt: new Date().toISOString() });
      setLive(updated);
      notify('Availability verified just now');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not verify the listing.');
    } finally {
      setVerifying(false);
    }
  }

  if (mode === 'loading' || (mode === 'live' && live === undefined)) return <PageSkeleton />;
  if (error) return <ErrorState title="Property unavailable" body={error} onRetry={() => window.location.reload()} />;

  if (mode === 'live' && live) {
    const days = staleDays(live.lastConfirmedAt);
    const stale = days == null || days >= 14;
    const photos = live.photoUrls ?? [];
    return (
      <div className="max-w-3xl space-y-4">
        <Link href="/dealer/inventory" className="text-sm text-muted-foreground">← Properties</Link>
        {photos[0] ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {photos.slice(0, 4).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="h-40 w-full rounded-xl object-cover bg-muted" />
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">{live.locality}</div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{live.title}</h2>
            <p className="text-muted-foreground">{live.addressText || live.locality}</p>
            <p className="mt-2 text-lg">{live.priceAmount != null ? formatInr(Number(live.priceAmount)) : 'Price not recorded'}</p>
            <p className="text-sm text-muted-foreground">
              {live.bedrooms != null ? `${live.bedrooms} BHK` : 'BHK unknown'} · {live.propertyType} · {live.areaValue ? `${live.areaValue} ${live.areaUnit ?? ''}` : 'Area unknown'} · {live.furnishing ?? 'Furnishing unknown'} · {live.possessionNotes ?? 'Possession unknown'}
            </p>
          </div>
          <Badge variant="outline">{prettyStatus(live.listingStatus, LISTING_STATUS_LABEL)}</Badge>
        </div>
        <p className={stale ? 'text-sm text-amber-700' : 'text-sm text-muted-foreground'}>
          {days == null ? '⚠️ Availability has never been verified' : days >= 14 ? `⚠️ Availability not verified for ${days} days` : `Last verified ${days} day${days === 1 ? '' : 's'} ago`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void verify()} disabled={verifying}>{verifying ? 'Verifying…' : 'Verify now'}</Button>
          {live.listingStatus !== 'archived' && (
            <Button type="button" variant="outline" onClick={() => void archiveListing()} disabled={archiving}>
              {archiving ? 'Archiving…' : 'Archive listing'}
            </Button>
          )}
          <Button asChild variant="outline"><Link href="/dealer/matching">Match buyers</Link></Button>
          <Button asChild variant="outline"><Link href="/dealer/site-visits/new">Schedule visit</Link></Button>
          {live.locality && (
            <Button asChild variant="outline">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${live.title} ${live.locality}`)}`} target="_blank" rel="noreferrer">Map</a>
            </Button>
          )}
        </div>
        {live.notes && <p className="text-sm text-muted-foreground">{live.notes}</p>}
      </div>
    );
  }

  if (!property) {
    return <p className="text-muted-foreground">Property not found.</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/dealer/inventory" className="text-sm text-muted-foreground">← Inventory</Link>
      <h2 className="text-2xl font-semibold">{property.title}</h2>
      <p className="text-muted-foreground">{property.locality}</p>
      <div className="flex gap-2">
        <Badge variant="outline">{property.status}</Badge>
        <Badge variant="muted">Unverified listing</Badge>
      </div>
      <p className="text-lg">{formatInr(property.price)}</p>
      <p className="text-sm text-muted-foreground">Last confirmed: {property.lastConfirmed ?? 'Not provided'} · Source: {property.source ?? 'Not provided'}</p>
      <section className="space-y-2">
        <h3 className="font-medium">Needs verification</h3>
        {listingWarnings(
          { id: property.id, title: property.title, locality: property.locality, price: property.price, type: property.type, beds: property.beds, status: property.status, lastConfirmed: property.lastConfirmed },
          getDemoStore().dealer.properties.map((row) => ({ id: row.id, title: row.title, locality: row.locality, price: row.price, type: row.type, beds: row.beds, status: row.status, lastConfirmed: row.lastConfirmed })),
        ).map((warning) => <p key={warning.code} className="text-sm">{warning.message}</p>)}
      </section>
      <section className="space-y-3">
        <h3 className="font-medium">Marketing kit</h3>
        <p className="text-xs text-muted-foreground">Drafts only. Nothing is published to Facebook, Instagram, or WhatsApp.</p>
        {Object.entries(marketingDrafts({
          id: property.id,
          title: property.title,
          locality: property.locality,
          price: property.price,
          type: property.type,
          beds: property.beds,
          status: property.status,
        })).map(([channel, text]) => (
          <div key={channel} className="rounded-xl border p-3 text-sm">
            <p className="font-medium capitalize">{channel}</p>
            <p className="mt-1">{text}</p>
            <button type="button" className="mt-2 text-xs underline" onClick={() => { void navigator.clipboard.writeText(text); setCopied(channel); }}>Copy</button>
            {copied === channel && <span className="ml-2 text-xs">Copied</span>}
          </div>
        ))}
      </section>
      <div className="flex gap-2">
        <Button asChild><Link href="/dealer/matching">Match buyers</Link></Button>
        <Button asChild variant="outline"><Link href="/dealer/site-visits/new">Schedule visit</Link></Button>
      </div>
    </div>
  );
}
