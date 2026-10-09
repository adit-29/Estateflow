'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { computeMatch, type MatchBreakdown } from '@estateflow/shared';
import { getDemoStore } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type BuyerRow, type MatchItem } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';

export default function MatchingPage() {
  const mode = useLiveMode();
  const [buyerId, setBuyerId] = useState('');
  const [buyers, setBuyers] = useState<BuyerRow[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const demoPairs = useMemo(() => {
    if (mode !== 'demo') return [];
    const store = getDemoStore();
    return store.dealer.leads.flatMap((lead) =>
      store.dealer.properties.map((property) => {
        const result = computeMatch(
          {
            localities: lead.locality ? [lead.locality] : [],
            bedroomsMin: lead.beds ?? null,
            bedroomsMax: lead.beds ?? null,
            budgetMax: lead.budgetMax ?? null,
          },
          {
            locality: property.locality,
            bedrooms: property.beds ?? null,
            priceAmount: property.price,
            listingStatus: /sold|unavailable/i.test(property.status) ? 'paused' : 'active',
            propertyType: property.type,
          },
        );
        return {
          leadId: lead.id,
          propertyId: property.id,
          buyer: lead.name,
          property: property.title,
          score: result.matchPercent,
          why: explain(result.breakdown),
          breakdown: result.breakdown,
        };
      }),
    ).filter((row) => row.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'live') return;
    api.listBuyers({ pageSize: 50 })
      .then((page) => {
        setBuyers(page.items);
        if (page.items[0]) setBuyerId(page.items[0].id);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load buyers for matching.'));
  }, [mode]);

  useEffect(() => {
    if (mode !== 'live' || !buyerId) {
      setLiveMatches(mode === 'live' && buyers.length === 0 ? [] : null);
      return;
    }
    setLiveMatches(null);
    api.matchForBuyer(buyerId)
      .then((page) => setLiveMatches(page.items))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Matching failed.'));
  }, [mode, buyerId, buyers.length]);

  if (mode === 'loading') return <PageSkeleton />;
  if (error) return <ErrorState title="Matching unavailable" body={error} onRetry={() => window.location.reload()} />;

  const rows = mode === 'live'
    ? (liveMatches ?? []).map((row) => ({
      key: row.property.id,
      buyer: buyers.find((b) => b.id === buyerId)?.contactName ?? 'Buyer',
      property: row.property.title,
      score: row.matchPercent,
      why: row.explanation,
      breakdown: row.breakdown,
      leadHref: '/dealer/buyers',
      propertyHref: `/dealer/inventory/${row.property.id}`,
    }))
    : demoPairs.map((row) => ({
      key: `${row.leadId}-${row.propertyId}`,
      buyer: row.buyer,
      property: row.property,
      score: row.score,
      why: row.why,
      breakdown: row.breakdown,
      leadHref: `/dealer/leads/${row.leadId}`,
      propertyHref: `/dealer/inventory/${row.propertyId}`,
    }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Matching"
        description="Scores are a weighted average of known dimensions only. Unknown fields are excluded — they are never treated as a match."
        primary={{ href: '/dealer/leads/new', label: 'Add buyer requirement' }}
      />
      {mode === 'live' && (
        <label className="block max-w-md text-sm">
          Buyer requirement
          <select className="mt-1 h-10 w-full rounded-md border px-3" value={buyerId} onChange={(e) => setBuyerId(e.target.value)}>
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.contactName} · {(buyer.localities ?? []).join(', ') || 'Locality not set'}
              </option>
            ))}
          </select>
        </label>
      )}
      {mode === 'live' && liveMatches === null && buyers.length > 0 && <PageSkeleton />}
      {rows.length === 0 ? (
        <EmptyState
          title="No matching properties found"
          body="Try increasing the budget, expanding the locality, or adding inventory that matches the stored requirement."
          action={{ href: '/dealer/inventory', label: 'Open inventory' }}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">{m.buyer} → {m.property}</p>
                <p className="text-xs text-muted-foreground">{m.why}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">{m.score}% match from stored criteria</p>
                <p className="mt-1 text-helper text-muted-foreground">{dimensionLine(m.breakdown)}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm"><Link href="/dealer/site-visits/new">Schedule visit</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href={m.propertyHref}>Open property</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href={m.leadHref}>Open buyer</Link></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function entriesOf(breakdown: MatchBreakdown | Record<string, number | 'unknown'>) {
  return Object.entries(breakdown) as [string, number | 'unknown'][];
}

function explain(breakdown: MatchBreakdown | Record<string, number | 'unknown'>) {
  const entries = entriesOf(breakdown);
  const hits = entries.filter(([, v]) => v === 100).map(([k]) => k);
  const misses = entries.filter(([, v]) => v === 0).map(([k]) => k);
  const unknown = entries.filter(([, v]) => v === 'unknown').map(([k]) => k);
  return [
    hits.length ? `Match: ${hits.join(', ')}` : null,
    misses.length ? `Mismatch: ${misses.join(', ')}` : null,
    unknown.length ? `Unknown (excluded): ${unknown.join(', ')}` : null,
  ].filter(Boolean).join(' · ');
}

function dimensionLine(breakdown: MatchBreakdown | Record<string, number | 'unknown'>) {
  return entriesOf(breakdown)
    .map(([key, value]) => `${key}: ${value === 'unknown' ? 'unknown' : value === 100 ? '✓' : value === 0 ? '✗' : value}`)
    .join('  ');
}
