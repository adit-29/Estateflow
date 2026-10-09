'use client';

import { useEffect, useState } from 'react';
import { getDemoStore } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type LeadRow } from '@/lib/api-client';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';

interface Bucket {
  locality: string;
  buyers: number;
  ready: number;
  budgets: string[];
}

export default function DemandPage() {
  const mode = useLiveMode();
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'demo') {
      setBuckets(aggregate(getDemoStore().dealer.leads.map((l) => ({
        localities: l.locality ? [l.locality] : [],
        timeline: l.timeline,
        budget: l.budgetMax ? `₹${l.budgetMax.toLocaleString('en-IN')}` : null,
        status: l.status,
      }))));
    }
    if (mode === 'live') {
      api.listLeads({ pageSize: 100 })
        .then((page) => setBuckets(aggregate(page.items.map(toRow))))
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load demand records.'));
    }
  }, [mode]);

  if (mode === 'loading' || buckets === null) return error ? <ErrorState title="Demand unavailable" body={error} onRetry={() => window.location.reload()} /> : <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand pool"
        description="Aggregated from verified buyer records in this workspace. Counts are not market-wide and are not invented."
      />
      {buckets.length === 0 ? (
        <EmptyState title="No demand recorded" body="Add leads with a locality to see demand by micro-market." action={{ href: '/dealer/leads/new', label: 'Add lead' }} />
      ) : (
        <ul className="space-y-3">
          {buckets.map((row) => (
            <li key={row.locality} className="rounded-xl border p-4">
              <p className="font-medium">{row.locality}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.buyers} verified buyer{row.buyers === 1 ? '' : 's'} · {row.ready} ready within a recorded 6-month timeline</p>
              {row.budgets[0] && <p className="text-helper text-muted-foreground">Budgets on file: {row.budgets.slice(0, 4).join(', ')}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function toRow(lead: LeadRow) {
  return {
    localities: lead.preferredLocalities ?? [],
    timeline: lead.requirementSummary,
    budget: lead.budgetBand ?? null,
    status: lead.status,
  };
}

function aggregate(rows: { localities: string[]; timeline?: string | null; budget: string | null; status: string }[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const row of rows) {
    if (['lost', 'archived'].includes(row.status.toLowerCase())) continue;
    const localities = row.localities.length ? row.localities : ['Locality not set'];
    for (const locality of localities) {
      const cur = map.get(locality) ?? { locality, buyers: 0, ready: 0, budgets: [] };
      cur.buyers += 1;
      if (row.timeline && /month|30|60|90|ready/i.test(row.timeline)) cur.ready += 1;
      if (row.budget && !cur.budgets.includes(row.budget)) cur.budgets.push(row.budget);
      map.set(locality, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.buyers - a.buyers);
}
