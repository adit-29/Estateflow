'use client';

import { useEffect, useState } from 'react';
import { DEMO_AREAS, DEMO_AGENCY, demoNetwork } from '@/lib/demo-seed';
import { Badge } from '@/components/ui/badge';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError } from '@/lib/api-client';
import { ErrorState, PageSkeleton } from '@/components/ux';

export default function PassportPage() {
  const mode = useLiveMode();
  const [live, setLive] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'live') return;
    api.networkPassport()
      .then((body) => setLive(body as Record<string, unknown>))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Passport could not be loaded.'));
  }, [mode]);

  if (mode === 'loading') return <PageSkeleton />;
  if (mode === 'live' && error) return <ErrorState title="Passport unavailable" body={error} />;
  if (mode === 'live' && !live) return <PageSkeleton />;

  if (mode === 'live' && live) {
    const spec = (live.specialization ?? {}) as { localities?: string[]; propertyTypes?: string[]; transactionTypes?: string[] };
    const metrics = (live.metrics ?? {}) as { completedVisits?: { value: number; definition: string }; closedDeals?: { value: number; definition: string } };
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Dealer Passport</h2>
          <Badge variant="outline" className="mt-2">{String(live.verificationStatus ?? 'unverified')}</Badge>
          <p className="mt-2 text-sm text-muted-foreground">{String(live.disclaimer ?? 'Platform-derived metrics only.')}</p>
        </div>
        <section className="rounded-xl border p-4 text-sm space-y-1">
          <p>Profile completeness: {String(live.profileCompleteness ?? 0)}%</p>
          <p>Areas: {(spec.localities ?? []).join(', ') || 'Not recorded'}</p>
          <p>Types: {(spec.propertyTypes ?? []).join(', ') || 'Not recorded'}</p>
          <p>Transactions: {(spec.transactionTypes ?? []).join(', ') || 'Not recorded'}</p>
        </section>
        <section className="rounded-xl border p-4 text-sm space-y-1">
          <p>Completed visits (90d): {metrics.completedVisits?.value ?? 0}</p>
          <p className="text-muted-foreground">{metrics.completedVisits?.definition}</p>
          <p>Closed deals (90d): {metrics.closedDeals?.value ?? 0}</p>
          <p className="text-muted-foreground">{metrics.closedDeals?.definition}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dealer Passport</h2>
        <Badge variant="outline" className="mt-2">Demo profile</Badge>
        <p className="mt-2 text-sm text-muted-foreground">This is not KYC and not a verified dealer badge.</p>
      </div>
      <section className="rounded-xl border p-4 text-sm space-y-1">
        <p className="font-medium">Raj Mehta</p>
        <p>{DEMO_AGENCY}</p>
        <p>Self-declared areas: {DEMO_AREAS}</p>
        <p>Self-declared focus: resale flats and builder floors</p>
      </section>
      <section className="space-y-2">
        <h3 className="font-medium">Fictional network</h3>
        <ul className="space-y-2">
          {demoNetwork.map((dealer) => (
            <li key={dealer.id} className="rounded-xl border p-3 text-sm">
              <p className="font-medium">{dealer.name}</p>
              <p className="text-muted-foreground">{dealer.agency} · {dealer.areas} · {dealer.focus}</p>
              <p className="text-xs text-muted-foreground">Private buyer phones are not shown.</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
