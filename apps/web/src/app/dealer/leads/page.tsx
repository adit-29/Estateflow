'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDemoStore, type DemoLead } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type LeadRow } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, IntentMeter, PageHeader, PageSkeleton, avatarTone, initials } from '@/components/ux';
import { bandForLead, intentForLead } from '@/lib/intent-from-lead';
import { CallButton, PhoneChip, WhatsAppButton } from '@/features/dealer/contact-actions';
import { LEAD_STATUS_LABEL, prettyStatus } from '@/features/dealer/labels';
import { cn } from '@/lib/utils';

const FILTERS = ['All', 'Hot', 'Warm', 'Cold', 'Follow-up Today', 'Overdue', 'High Intent', 'Recently Active'] as const;

export default function LeadsPage() {
  const [leads, setLeads] = useState<DemoLead[] | null>(null);
  const [liveRows, setLiveRows] = useState<LeadRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [error, setError] = useState<string | null>(null);
  const mode = useLiveMode();

  const loadLive = useCallback(() => {
    setError(null);
    api.listLeads({ search: search || undefined, pageSize: 50 })
      .then((page) => setLiveRows(page.items))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load your leads.'));
  }, [search]);

  useEffect(() => {
    if (mode === 'demo') setLeads(getDemoStore().dealer.leads);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'live') return;
    const handle = window.setTimeout(loadLive, search ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [mode, loadLive, search]);

  const scored = useMemo(
    () =>
      (leads ?? []).map((lead) => {
        const intent = intentForLead(lead);
        return { lead, intent, band: bandForLead(lead) };
      }),
    [leads],
  );

  const filtered = scored.filter(({ lead, intent, band }) => {
    const q = search.toLowerCase();
    if (
      q &&
      !lead.name.toLowerCase().includes(q) &&
      !lead.phone.includes(search) &&
      !(lead.locality ?? '').toLowerCase().includes(q) &&
      !(lead.summary ?? '').toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filter === 'Hot') return band === 'hot';
    if (filter === 'Warm') return band === 'warm';
    if (filter === 'Cold') return band === 'cold';
    if (filter === 'Follow-up Today') return /today/i.test(lead.followUp ?? '');
    if (filter === 'Overdue') return /overdue/i.test(lead.followUp ?? '');
    if (filter === 'High Intent') return intent.score >= 7;
    if (filter === 'Recently Active') return (lead.views ?? 0) > 0 || (lead.visitCount ?? 0) > 0 || /today|overdue/i.test(lead.followUp ?? '');
    return true;
  });

  if (mode === 'loading' || (mode === 'demo' && leads === null)) return <PageSkeleton />;
  if (mode === 'live' && error) {
    return <ErrorState title="Leads unavailable" body={error} onRetry={loadLive} />;
  }

  const liveFiltered = (liveRows ?? []).filter((row) => {
    if (filter === 'Follow-up Today' || filter === 'Overdue') {
      if (!row.nextFollowUpAt) return false;
      const due = new Date(row.nextFollowUpAt).getTime() <= Date.now() + (filter === 'Follow-up Today' ? 86_400_000 : 0);
      return filter === 'Overdue' ? new Date(row.nextFollowUpAt).getTime() < Date.now() : due;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={mode === 'live'
          ? 'Agency records only. Intent scores are not shown unless signals exist on the lead.'
          : 'Intent 0–10 comes from recorded demo signals — not a purchase guarantee.'}
        primary={{ href: '/dealer/leads/new', label: 'Add lead' }}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={filter === item ? 'default' : 'outline'}
            className={cn(
              filter === item && item === 'Hot' && 'border-rose-600 bg-rose-600 hover:bg-rose-700',
              filter === item && item === 'Warm' && 'border-amber-500 bg-amber-500 hover:bg-amber-600',
              filter === item && item === 'Cold' && 'border-sky-600 bg-sky-600 hover:bg-sky-700',
            )}
            onClick={() => setFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <Input placeholder="Buyer name, phone, locality, requirement" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

      {mode === 'live' ? (
        liveRows === null ? <PageSkeleton /> : liveFiltered.length === 0 ? (
          <EmptyState
            title={liveRows.length === 0 ? 'No leads yet' : 'No leads match your filters'}
            body={liveRows.length === 0 ? 'Add your first buyer and EstateFlow will start organizing the pipeline.' : 'Clear search or filter to see remaining records.'}
            action={{ href: '/dealer/leads/new', label: 'Add your first lead' }}
          />
        ) : (
          <LeadBoard
            rows={liveFiltered.map((row) => ({
              id: row.id,
              name: row.name,
              phone: row.phone,
              requirement: `${(row.preferredLocalities ?? []).join(', ') || 'Locality not set'}${row.requirementSummary ? ` · ${row.requirementSummary}` : ''}`,
              budget: row.budgetBand ?? 'Not recorded',
              status: prettyStatus(row.status, LEAD_STATUS_LABEL),
              next: row.nextFollowUpAt ? new Date(row.nextFollowUpAt).toLocaleString('en-IN') : 'Not scheduled',
              band: statusBand(row.status),
            }))}
          />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          title={(leads?.length ?? 0) === 0 ? 'No leads yet' : 'No leads match your filters'}
          body={(leads?.length ?? 0) === 0 ? 'Your first buyer lead will appear here.' : 'Clear search or filter to see remaining records.'}
          action={{ href: '/dealer/leads/new', label: 'Add your first lead' }}
        />
      ) : (
        <LeadBoard
          rows={filtered.map(({ lead, intent, band }) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            requirement: `${lead.beds ? `${lead.beds} BHK · ` : ''}${lead.locality}${lead.summary ? ` · ${lead.summary}` : ''}`,
            budget: lead.budgetMax ? `₹${lead.budgetMax.toLocaleString('en-IN')}` : 'Not recorded',
            status: lead.status,
            next: lead.followUp ?? 'Not scheduled',
            band,
            score: intent.score,
          }))}
        />
      )}
    </div>
  );
}

function statusBand(status: string): 'hot' | 'warm' | 'cold' {
  if (/negot|visit|qualified|won/i.test(status)) return 'hot';
  if (/contact|follow/i.test(status)) return 'warm';
  return 'cold';
}

function LeadBoard({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    phone: string;
    requirement: string;
    budget: string;
    status: string;
    next: string;
    band?: 'hot' | 'warm' | 'cold';
    score?: number;
  }[];
}) {
  return (
    <ul className="grid gap-4">
      {rows.map((row) => {
        const bar = row.band === 'hot' ? 'bg-rose-500' : row.band === 'warm' ? 'bg-amber-400' : 'bg-sky-500';
        const badge = row.band === 'hot' ? 'hot' : row.band === 'warm' ? 'warm' : 'cold';
        return (
          <li key={row.id} className="relative overflow-hidden rounded-2xl border bg-white/90 shadow-sm ring-1 ring-black/5">
            <span className={cn('absolute inset-y-0 left-0 w-1.5', bar)} />
            <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white shadow-inner', avatarTone(row.name))}>
                  {initials(row.name)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{row.name}</p>
                    <Badge variant={badge}>{row.band ? row.band : row.status}</Badge>
                    <Badge variant="outline">{row.status}</Badge>
                  </div>
                  <div className="mt-1.5"><PhoneChip phone={row.phone} /></div>
                  <p className="mt-2 text-sm text-muted-foreground">{row.requirement}</p>
                  <p className="mt-1 text-helper text-muted-foreground">{row.budget} · Next: {row.next}</p>
                  {typeof row.score === 'number' && (
                    <div className="mt-2 max-w-xs">
                      <IntentMeter score={row.score} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <CallButton phone={row.phone} />
                <WhatsAppButton phone={row.phone} />
                <Button asChild size="sm" variant="accept"><Link href={`/dealer/leads/${row.id}`}>Open</Link></Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
