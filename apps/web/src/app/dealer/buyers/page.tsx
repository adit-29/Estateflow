'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDemoStore } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type BuyerRow } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';

export default function DealerBuyersPage() {
  const [buyers, setBuyers] = useState<{ id: string; name: string; need: string; budget: string }[]>([]);
  const [live, setLive] = useState<BuyerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = useLiveMode();

  useEffect(() => {
    if (mode === 'demo') {
      const store = getDemoStore();
      setBuyers(
        store.dealer.leads.map((l) => ({
          id: l.id,
          name: l.name,
          need: l.summary ?? 'Requirement on file',
          budget: l.budgetMax ? `Up to ₹${l.budgetMax.toLocaleString('en-IN')}` : 'Budget not stored',
        })),
      );
    }
    if (mode === 'live') {
      api.listBuyers({})
        .then((page) => setLive(page.items))
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load buyer requirements.'));
    }
  }, [mode]);

  if (mode === 'loading') return <PageSkeleton />;
  if (error) return <ErrorState title="Buyers unavailable" body={error} onRetry={() => window.location.reload()} />;
  if (mode === 'live' && live === null) return <PageSkeleton />;

  const rows = mode === 'live'
    ? (live ?? []).map((b) => ({
      id: b.id,
      name: b.contactName,
      need: `${(b.localities ?? []).join(', ') || 'Locality not set'} · ${b.transactionType}`,
      budget: b.budgetMax ? `Up to ₹${Number(b.budgetMax).toLocaleString('en-IN')}` : 'Budget not stored',
      href: b.leadId ? `/dealer/leads/${b.leadId}` : `/dealer/buyers/${b.id}`,
    }))
    : buyers.map((b) => ({ ...b, href: `/dealer/buyers/${b.id}` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyers"
        description="The requirement is the centre of the record."
        primary={{ href: '/dealer/leads/new', label: 'Add buyer via lead' }}
        secondary={{ href: '/dealer/matching', label: 'Find properties' }}
      />
      {rows.length === 0 ? (
        <EmptyState title="No buyers yet" body="Add a lead with a locality and budget to start matching." action={{ href: '/dealer/leads/new', label: 'Add your first buyer' }} />
      ) : (
        <ul className="space-y-2">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-sm text-muted-foreground">Looking for: {b.need}</p>
                <p className="text-xs text-muted-foreground">{b.budget}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm"><Link href={b.href}>Open profile</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/dealer/matching">Find properties</Link></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
