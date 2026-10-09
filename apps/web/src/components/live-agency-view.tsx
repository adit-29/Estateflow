'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';

type Kind = 'leads' | 'buyers' | 'properties' | 'visits' | 'deals' | 'matching' | 'followups' | 'overview';

export function LiveAgencyView({ kind }: { kind: Kind }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (kind === 'leads' || kind === 'followups') {
        const rows = await api.listLeads(kind === 'followups' ? { followUpDue: true } : {});
        return rows.items.map((row) => `${row.name} · ${row.status} · ${(row.preferredLocalities ?? []).join(', ') || 'Locality not set'}`);
      }
      if (kind === 'buyers') {
        const rows = await api.listBuyers({});
        return rows.items.map((row) => `${row.contactName} · ${row.transactionType}`);
      }
      if (kind === 'properties') {
        const rows = await api.listProperties({ scope: 'mine' });
        return rows.items.map((row) => `${row.title} · ${row.locality} · ${row.listingStatus}`);
      }
      if (kind === 'visits') {
        const rows = await api.listSiteVisits({});
        return rows.items.map((row) => `${row.scheduledAt} · ${row.status} · ${row.meetingPoint}`);
      }
      if (kind === 'deals') {
        const rows = await api.listDeals('table');
        return (rows.items ?? []).map((row) => `${row.title} · ${row.pipelineStage}`);
      }
      if (kind === 'overview') {
        const rows = await api.dashboardOverview();
        if (rows.isEmpty) return [];
        return [
          `Leads ${rows.totalLeads}`,
          `Follow-ups due ${rows.followUpsDue}`,
          `Upcoming visits ${rows.upcomingVisits}`,
          `Active deals ${rows.activeDeals}`,
        ];
      }
      const buyers = await api.listBuyers({});
      if (!buyers.items[0]) return [];
      const matches = await api.matchForBuyer(buyers.items[0].id);
      return matches.items.map((row) => `${row.property.title} · ${row.matchPercent}% · ${row.explanation}`);
    };
    run()
      .then((next) => {
        if (!cancelled) setLines(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load your agency records.');
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  if (error) {
    return <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm">{error} Demo records were not substituted.</p>;
  }
  if (!lines) return <p className="text-sm text-muted-foreground">Loading your agency records…</p>;
  if (lines.length === 0) {
    return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No records yet for this agency. Add the first one from this workspace. Sample demo data is not shown here.</p>;
  }
  return (
    <ul className="space-y-2">
      {lines.map((line) => <li key={line} className="rounded-xl border p-3 text-sm">{line}</li>)}
    </ul>
  );
}
