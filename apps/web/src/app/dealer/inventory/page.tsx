'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatInr } from '@estateflow/shared';
import { getDemoStore, type DemoProperty } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type PropertyRow } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';
import { LISTING_STATUS_LABEL, prettyStatus } from '@/features/dealer/labels';

export default function InventoryPage() {
  const [tab, setTab] = useState<'mine' | 'network' | 'builder'>('mine');
  const [items, setItems] = useState<DemoProperty[]>([]);
  const [live, setLive] = useState<PropertyRow[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = useLiveMode();

  const loadLive = useCallback(() => {
    setError(null);
    api.listProperties({ scope: tab, pageSize: 40 })
      .then((page) => {
        setLive(page.items);
        setNotice(page.notice ?? null);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load your properties.'));
  }, [tab]);

  useEffect(() => {
    if (mode !== 'demo') return;
    setItems(getDemoStore().dealer.properties);
  }, [mode]);

  useEffect(() => {
    if (mode === 'live') loadLive();
  }, [mode, loadLive]);

  if (mode === 'loading') return <PageSkeleton />;
  if (mode === 'live' && error) return <ErrorState title="Inventory unavailable" body={error} onRetry={loadLive} />;

  const cards = mode === 'live'
    ? (live ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      locality: p.locality,
      price: p.priceAmount != null ? formatInr(Number(p.priceAmount)) : 'Price not recorded',
      meta: `${p.bedrooms != null ? `${p.bedrooms} BHK · ` : ''}${p.propertyType}`,
      status: prettyStatus(p.listingStatus, LISTING_STATUS_LABEL),
      confirmed: p.lastConfirmedAt ? `Verified ${new Date(p.lastConfirmedAt).toLocaleDateString('en-IN')}` : 'Never verified',
      stale: !p.lastConfirmedAt || Date.now() - new Date(p.lastConfirmedAt).getTime() > 30 * 86_400_000,
    }))
    : items.map((p) => ({
      id: p.id,
      title: p.title,
      locality: p.locality,
      price: formatInr(p.price),
      meta: `${p.beds ? `${p.beds} BHK · ` : ''}${p.type}`,
      status: p.status,
      confirmed: p.lastConfirmed ? `Confirmed ${p.lastConfirmed}` : 'Never verified',
      stale: !p.lastConfirmed,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description={mode === 'live' ? 'Listings owned by this agency. Sample demo inventory is not mixed in.' : 'Everything you can currently offer buyers. Demo listings stay in this browser.'}
        primary={{ href: '/dealer/inventory/new', label: 'Add property' }}
        secondary={{ href: '/dealer/matching', label: 'Match buyers' }}
      />

      <div className="flex gap-2 border-b">
        {(['mine', 'network', 'builder'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setTab(t)}
          >
            {t === 'mine' ? 'My inventory' : t === 'network' ? 'Network inventory' : 'Builder inventory'}
          </button>
        ))}
      </div>

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

      {tab === 'mine' && mode === 'live' && live === null && <PageSkeleton />}

      {cards.length === 0 && tab === 'mine' && (mode === 'demo' || live) && (
        <EmptyState
          title="Your inventory is empty"
          body="Add a property you can currently offer buyers."
          action={{ href: '/dealer/inventory/new', label: 'Add property' }}
        />
      )}
      {cards.length === 0 && tab === 'network' && (
        <EmptyState
          title="No shared listings yet"
          body="Use Network to invite dealers and share properties with consent. Private buyer data is not shown here."
          action={{ href: '/dealer/network', label: 'Open network' }}
        />
      )}
      {cards.length === 0 && tab === 'builder' && (
        <EmptyState
          title="Builder inventory is not connected yet"
          body="Verified builder listings will appear here when a project is shared with this dealer. Nothing is invented."
        />
      )}

      {cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex h-28 items-center justify-center bg-muted text-xs text-muted-foreground">{p.locality}</div>
              <div className="space-y-2 p-4">
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.price} · {p.meta}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{p.status}</Badge>
                  <Badge variant={p.stale ? 'outline' : 'muted'}>{p.stale ? `⚠️ ${p.confirmed}` : p.confirmed}</Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm"><Link href={`/dealer/inventory/${p.id}`}>View property</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link href="/dealer/matching">Match buyers</Link></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
