'use client';

import { useEffect, useState } from 'react';
import type { AnalyticsSummary } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';

const empty: AnalyticsSummary = {
  definitions: {
    leadsCreated: 'Counted from leads stored for this agency.',
    visits: 'Grouped by the status saved on each visit.',
    commissions: 'Uses stored amounts only.',
  },
  leadsCreated: 0,
  leadsQualified: 0,
  visits: { scheduled: 0, completed: 0, cancelled: 0 },
  dealsWon: 0,
  dealsLost: 0,
  pipelineByStage: [],
  commissions: { agreed: 0, paid: 0, pending: 0, overdue: 0 },
  leadSources: [],
  followUpsCompleted: 0,
  savedMatches: 0,
  matchingActivity: 0,
  empty: true,
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary>(empty);
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-12-31');
  const [note, setNote] = useState('Loading agency records…');

  useEffect(() => {
    if (localStorage.getItem('ef_workspace_mode') !== 'live') {
      setNote('This browser session is demo mode. Charts stay empty here so sample records are not shown as agency analytics.');
      setData(empty);
      return;
    }
    const url = `/backend/analytics/summary?from=${from}T00:00:00.000Z&to=${to}T23:59:59.000Z`;
    fetch(url, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<AnalyticsSummary>;
      })
      .then((summary) => {
        setData(summary);
        setNote(summary.empty ? 'No records in this date range.' : 'Counts come from this agency’s saved records.');
      })
      .catch(() => {
        setData(empty);
        setNote('Analytics could not be loaded. No sample numbers were substituted.');
      });
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">From <input className="ml-2 rounded-md border px-2 py-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">To <input className="ml-2 rounded-md border px-2 py-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {data.empty ? (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No leads, visits, deals, or saved matches in this range. Definitions stay visible so empty is not mistaken for a conversion change.
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Leads created" value={data.leadsCreated} hint={data.definitions.leadsCreated} />
        <Metric title="Qualified" value={data.leadsQualified} hint={data.definitions.leadsQualified} />
        <Metric title="Visits completed" value={data.visits.completed} hint={data.definitions.visits} />
        <Metric title="Saved matches" value={data.savedMatches} hint={data.definitions.savedMatches} />
        <Metric title="Matching activity" value={data.matchingActivity} hint={data.definitions.matchingActivity} />
      </div>
      <section className="rounded-xl border p-4">
        <h3 className="font-medium">Pipeline by stage</h3>
        <p className="text-xs text-muted-foreground">{data.definitions.pipelineByStage}</p>
        {data.pipelineByStage.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No deals in range.</p> : (
          <ul className="mt-3 space-y-2">
            {data.pipelineByStage.map((row) => (
              <li key={row.stage} className="flex justify-between text-sm">
                <span>{row.stage.replace(/_/g, ' ')}</span>
                <span>{row.count} · ₹{row.value.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border p-4 text-sm">
        <h3 className="font-medium">Commissions</h3>
        <p className="text-xs text-muted-foreground">{data.definitions.commissions}</p>
        <p className="mt-2">Agreed ₹{data.commissions.agreed.toLocaleString('en-IN')} · Paid ₹{data.commissions.paid.toLocaleString('en-IN')} · Pending ₹{data.commissions.pending.toLocaleString('en-IN')} · Overdue ₹{data.commissions.overdue.toLocaleString('en-IN')}</p>
        <p className="mt-2">Visits scheduled {data.visits.scheduled} · completed {data.visits.completed} · cancelled {data.visits.cancelled}</p>
        <p className="mt-2">Won {data.dealsWon} · Lost {data.dealsLost} · Follow-ups closed {data.followUpsCompleted}</p>
        <p className="mt-2">Sources: {data.leadSources.length ? data.leadSources.map((row) => `${row.source} ${row.count}`).join(', ') : 'none in range'}</p>
        <Badge variant="muted" className="mt-3">Not a causal claim</Badge>
      </section>
    </div>
  );
}

function Metric({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
