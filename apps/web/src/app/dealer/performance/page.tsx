'use client';

import { useEffect, useMemo, useState } from 'react';
import { budgetBand, dealerPerformance, formatInr, learnSpecialization } from '@estateflow/shared';
import { getDemoStore, type DemoStore } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError } from '@/lib/api-client';
import { MetricCard, PageHeader, PageSkeleton, ErrorState, EmptyState } from '@/components/ux';

export default function DealerPerformancePage() {
  const mode = useLiveMode();
  const [store, setStore] = useState<DemoStore | null>(null);
  const [live, setLive] = useState<Awaited<ReturnType<typeof api.dashboardOverview>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'demo') setStore(getDemoStore());
    if (mode === 'live') {
      api.dashboardOverview()
        .then(setLive)
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Performance records could not be loaded.'));
    }
  }, [mode]);

  const snap = useMemo(() => {
    if (!store) return null;
    return dealerPerformance({
      periodLabel: 'Demo store · current browser records',
      leads: store.dealer.leads,
      visits: store.dealer.visits,
      deals: store.dealer.deals,
      commissions: store.dealer.commissions ?? [],
    });
  }, [store]);

  const spec = useMemo(() => {
    if (!store) return null;
    const events = [
      ...store.dealer.leads.map((lead) => ({
        locality: lead.locality,
        configuration: lead.beds ? `${lead.beds}BHK` : '',
        propertyType: /plot/i.test(lead.summary ?? '') ? 'Plot' : /floor/i.test(lead.summary ?? '') ? 'Builder Floor' : 'Flat',
        budgetBand: budgetBand(lead.budgetMax),
        transaction: lead.intent === 'Rent' ? 'rent' : 'sale',
      })),
      ...store.dealer.properties.map((property) => ({
        locality: property.locality,
        configuration: property.beds ? `${property.beds}BHK` : '',
        propertyType: property.type,
        budgetBand: budgetBand(property.price > 100000 ? property.price : null),
        transaction: property.price < 100000 ? 'rent' : 'sale',
      })),
    ];
    return learnSpecialization(events, 'the last 6 months of this demo store');
  }, [store]);

  if (mode === 'loading') return <PageSkeleton />;
  if (error) return <ErrorState title="Performance unavailable" body={error} onRetry={() => window.location.reload()} />;

  if (mode === 'live') {
    if (!live) return <PageSkeleton />;
    if (live.isEmpty) {
      return <EmptyState title="No performance records yet" body="Counts appear after this agency stores leads, visits, and deals." action={{ href: '/dealer/leads/new', label: 'Add a lead' }} />;
    }
    return (
      <div className="space-y-8">
        <PageHeader title="Your performance" description="Counted from this agency’s saved records. Not an industry rank." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard tone="teal" label="Leads" value={live.totalLeads} definition="Buyer conversations currently stored." href="/dealer/leads" />
          <MetricCard tone="amber" label="Follow-ups due" value={live.followUpsDue} definition="Next follow-up is due." href="/dealer/follow-ups" />
          <MetricCard tone="sky" label="Upcoming visits" value={live.upcomingVisits} definition={live.definitions.upcomingVisits} href="/dealer/site-visits" />
          <MetricCard tone="violet" label="Active deals" value={live.activeDeals} definition="Open pipeline stages." href="/dealer/deals" />
          <MetricCard tone="indigo" label="Pipeline" value={Number(live.estimatedPipeline) ? formatInr(Number(live.estimatedPipeline)) : '₹0'} definition={live.definitions.pipelineValue} href="/dealer/deals" />
          <MetricCard tone="orange" label="Expected commission" value={Number(live.expectedCommission) ? formatInr(Number(live.expectedCommission)) : 'Not recorded'} definition={live.definitions.expectedCommission} href="/dealer/deals/commissions" />
        </div>
        <section className="rounded-xl border p-5">
          <h2>By stage</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-4">
            {live.leadsByStatus.map((row) => (
              <li key={row.status} className="rounded-lg border p-3">
                <p className="text-meta capitalize text-muted-foreground">{row.status.replace(/_/g, ' ')}</p>
                <p className="text-kpi">{row.count}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  if (!snap || !spec) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Demo data"
        title="Your performance"
        description="Numbers counted from stored demo records. Ye industry-wide Delhi rank nahi hai."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard tone="teal" label="Leads" value={snap.funnel.lead} definition="Buyer conversations currently stored." />
        <MetricCard tone="sky" label="Qualified" value={snap.funnel.qualified} definition="Leads whose stored status is qualified or later." />
        <MetricCard tone="amber" label="Visits" value={snap.funnel.visit} definition="Visit records whose status looks confirmed, completed, or visit." />
        <MetricCard tone="orange" label="Negotiations" value={snap.funnel.negotiation} definition="Deals with negotiation in the stage field." />
        <MetricCard tone="violet" label="Bookings" value={snap.funnel.booking} definition="Deals whose stage includes booking." />
        <MetricCard tone="indigo" label="Closed deals" value={snap.funnel.closed} definition="Won / closed won stages only." />
        <MetricCard tone="rose" label="Pipeline" value={`₹${(snap.pipelineValue / 1_00_00_000).toFixed(2)} Cr`} definition="Open deal values. Not a forecast." />
        <MetricCard tone="teal" label="Expected commission" value={snap.expectedCommission ? `₹${snap.expectedCommission.toLocaleString('en-IN')}` : 'Not recorded'} definition="Recorded commission agreements se estimate — received cash nahi." />
      </div>

      <section className="rounded-xl border p-5">
        <h2>Conversion funnel</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {snap.conversion.map((row) => (
            <li key={`${row.from}-${row.to}`} className="rounded-lg border p-3">
              <p className="text-meta capitalize text-muted-foreground">{row.from} → {row.to}</p>
              <p className="text-kpi">{row.rate == null ? '—' : `${row.rate}%`}</p>
              <p className="text-helper text-muted-foreground">n={row.sample}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border p-5">
        <h2>Where are you losing buyers?</h2>
        <p className="mt-2 text-body">{snap.dropOffNote}</p>
      </section>

      <section className="rounded-xl border p-5">
        <h2>Your strongest market</h2>
        <p className="text-helper text-muted-foreground">{spec.source} · {spec.periodLabel}</p>
        {spec.ready ? (
          <ul className="mt-3 space-y-1 text-body">
            <li>Locality: {spec.strongestLocality}</li>
            <li>Configuration: {spec.typicalConfiguration}</li>
            <li>Property type: {spec.typicalType}</li>
            <li>Budget: {spec.typicalBudget}</li>
            <li>Transaction: {spec.transaction}</li>
          </ul>
        ) : (
          <p className="mt-2 text-body">{spec.note}</p>
        )}
      </section>
    </div>
  );
}
