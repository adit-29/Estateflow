'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getDemoStore, type DemoLead } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type LeadDetail } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { intentForLead } from '@/lib/intent-from-lead';
import { CallButton, PhoneChip, WhatsAppButton } from '@/features/dealer/contact-actions';
import { LEAD_STATUS_LABEL, prettyStatus } from '@/features/dealer/labels';
import { AccentCard, ErrorState, IntentMeter, PageSkeleton, avatarTone, initials } from '@/components/ux';
import { cn } from '@/lib/utils';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mode = useLiveMode();
  const [demoLead, setDemoLead] = useState<DemoLead | null | undefined>(undefined);
  const [live, setLive] = useState<LeadDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const store = typeof window === 'undefined' ? null : getDemoStore();

  useEffect(() => {
    if (mode === 'demo') {
      setDemoLead(getDemoStore().dealer.leads.find((row) => row.id === id) ?? null);
    }
    if (mode === 'live') {
      api.getLead(id)
        .then(setLive)
        .catch((err: unknown) => {
          setLive(null);
          setError(err instanceof ApiError ? err.message : 'We could not load this lead.');
        });
    }
  }, [id, mode]);

  if (mode === 'loading' || (mode === 'demo' && demoLead === undefined) || (mode === 'live' && live === undefined)) {
    return <PageSkeleton />;
  }
  if (error) return <ErrorState title="Lead unavailable" body={error} onRetry={() => window.location.reload()} />;

  if (mode === 'live' && live) {
    return (
      <div className="space-y-6">
        <Link href="/dealer/leads" className="text-meta text-muted-foreground">← Leads</Link>
        <LeadHero
          name={live.name}
          phone={live.phone}
          status={prettyStatus(live.status, LEAD_STATUS_LABEL)}
          source={live.source}
        />
        <div className="flex flex-wrap gap-2">
          <CallButton phone={live.phone} size="default" />
          <WhatsAppButton phone={live.phone} size="default" />
          <Button asChild variant="outline"><Link href="/dealer/site-visits/new">Schedule visit</Link></Button>
          <Button asChild variant="accept"><Link href="/dealer/matching">Match properties</Link></Button>
        </div>
        <AccentCard tone="sky">
          <h3>Buyer requirement</h3>
          <p className="mt-2 text-body">
            {(live.preferredLocalities ?? []).join(', ') || 'Locality not recorded'}
            {live.propertyType ? ` · ${live.propertyType}` : ''}
            {live.budgetBand ? ` · ${live.budgetBand}` : ''}
            {live.transactionType ? ` · ${live.transactionType}` : ''}
          </p>
          <p className="text-meta text-muted-foreground">{live.requirementSummary ?? 'No requirement note stored.'}</p>
          <p className="mt-2 text-sm">Timeline: {live.timeline ?? 'unknown'} · Financing: {live.financingNotes ?? 'unknown'}</p>
        </AccentCard>
        <AccentCard tone="violet">
          <h3>Activity timeline</h3>
          {live.activities?.length ? live.activities.map((item) => (
            <p key={item.id} className="mt-1 text-body">{new Date(item.createdAt).toLocaleString('en-IN')} — {item.title}{item.body ? ` · ${item.body}` : ''}</p>
          )) : <p className="mt-2 text-body text-muted-foreground">No activity recorded yet.</p>}
        </AccentCard>
        <AccentCard tone="amber">
          <h3>Follow-up</h3>
          <p className="mt-2 text-body">{live.nextFollowUpAt ? new Date(live.nextFollowUpAt).toLocaleString('en-IN') : 'Not scheduled'}</p>
        </AccentCard>
        <p className="text-helper text-muted-foreground">Notes: {live.notes ?? 'None stored.'}</p>
      </div>
    );
  }

  const lead = demoLead;
  if (!lead) return <p className="text-body text-muted-foreground">Lead not found in this workspace.</p>;

  const intent = intentForLead(lead);
  const visits = store?.dealer.visits.filter((visit) => visit.buyerName === lead.name) ?? [];
  const deals = store?.dealer.deals.filter((deal) => deal.title.toLowerCase().includes(lead.name.split(' ')[0].toLowerCase())) ?? [];
  const matches = (store?.dealer.properties ?? []).filter((property) => property.locality === lead.locality).slice(0, 3);
  const pitchBits = [
    lead.summary ? `Requirement: ${lead.summary}` : null,
    lead.objection ? `Recorded objection: ${lead.objection}` : null,
    lead.budgetMax ? `Budget ceiling ₹${lead.budgetMax.toLocaleString('en-IN')}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href="/dealer/leads" className="text-meta text-muted-foreground">← Leads</Link>
      <LeadHero name={lead.name} phone={lead.phone} status={lead.status} source={lead.source} demo />
      <div className="flex flex-wrap gap-2">
        <CallButton phone={lead.phone} size="default" />
        <WhatsAppButton phone={lead.phone} size="default" />
        <Button asChild variant="accept"><Link href="/dealer/site-visits/new">Schedule site visit</Link></Button>
        <Button asChild variant="outline"><Link href={`/dealer/copilot?q=${encodeURIComponent(`${lead.name} ko follow-up draft karo`)}`}>Draft follow-up</Link></Button>
        <Button asChild variant="outline"><Link href="/dealer/matching">Match properties</Link></Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AccentCard tone="sky">
          <h3>Requirement</h3>
          <p className="mt-2 text-body">
            {lead.beds ? `${lead.beds} BHK` : 'BHK not recorded'} · {lead.locality} · {lead.budgetMax ? `up to ₹${lead.budgetMax.toLocaleString('en-IN')}` : 'budget not recorded'}
          </p>
          <p className="text-meta text-muted-foreground">{lead.summary ?? 'No requirement note stored.'}</p>
        </AccentCard>

        <AccentCard tone="rose">
          <h3>Intent · {intent.score.toFixed(1)} / 10</h3>
          <div className="mt-3 max-w-sm"><IntentMeter score={intent.score} /></div>
          <p className="mt-2 text-meta text-muted-foreground">{intent.disclaimer}</p>
          <p className="text-helper text-muted-foreground">{intent.model.label}</p>
          <ul className="mt-3 space-y-1 text-body">
            {intent.contributions.filter((row) => row.points > 0).map((row) => (
              <li key={row.key}>{row.label}: +{row.points} — {row.evidence}</li>
            ))}
          </ul>
          {intent.contributions.every((row) => row.points === 0) && <p className="mt-2 text-body text-muted-foreground">CRM mein enough information nahi hai.</p>}
        </AccentCard>
      </div>

      <AccentCard tone="teal">
        <h3>Matched properties</h3>
        {matches.length ? matches.map((property) => (
          <p key={property.id} className="mt-1 text-body">{property.title} · {property.locality}</p>
        )) : <p className="mt-2 text-body text-muted-foreground">No locality matches in this workspace.</p>}
      </AccentCard>

      <AccentCard tone="amber">
        <h3>Site visits</h3>
        {visits.length ? visits.map((visit) => (
          <p key={visit.id} className="mt-1 text-body">{visit.propertyTitle} · {visit.when} · {visit.status}</p>
        )) : <p className="mt-2 text-body text-muted-foreground">No visit records for this name.</p>}
      </AccentCard>

      <AccentCard tone="violet">
        <h3>Deal history</h3>
        {deals.length ? deals.map((deal) => (
          <p key={deal.id} className="mt-1 text-body">{deal.title} · {deal.stage} · ₹{deal.value.toLocaleString('en-IN')}</p>
        )) : <p className="mt-2 text-body text-muted-foreground">No deal records matched this buyer name.</p>}
      </AccentCard>

      {pitchBits.length > 0 && (
        <AccentCard tone="orange">
          <h3>How should I pitch this buyer?</h3>
          <p className="mt-2 text-body">{pitchBits.join(' · ')}</p>
        </AccentCard>
      )}
    </div>
  );
}

function LeadHero({
  name,
  phone,
  status,
  source,
  demo,
}: {
  name: string;
  phone?: string | null;
  status: string;
  source?: string | null;
  demo?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-500 to-sky-500 p-6 text-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className={cn('flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur', avatarTone(name))}>
            {initials(name)}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Buyer</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">{name}</h2>
            <p className="mt-2 text-lg font-semibold">{phone || 'Phone not recorded'}</p>
            <p className="mt-1 text-sm text-white/80">{status}{source ? ` · ${source}` : ''}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/95 p-3 text-foreground shadow-sm">
          <p className="text-helper text-muted-foreground">Call this buyer</p>
          <div className="mt-2"><PhoneChip phone={phone} /></div>
        </div>
      </div>
      {demo && <Badge className="mt-4 bg-white/20 text-white">Demo</Badge>}
    </div>
  );
}
