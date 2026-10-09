'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { answerDemoCopilot } from '@estateflow/shared';
import { getDemoStore, saveDemoStore, type DemoLead } from '@/lib/demo-data';
import { api, ApiError, type LeadRow } from '@/lib/api-client';
import { useLiveMode } from '@/components/use-live-mode';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';
import { CallButton, PhoneChip, WhatsAppButton } from '@/features/dealer/contact-actions';

export default function FollowUpsPage() {
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [live, setLive] = useState<LeadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'Today' | 'Overdue' | 'Upcoming' | 'Completed'>('Today');
  const mode = useLiveMode();
  const { notify } = useToast();

  const loadLive = useCallback(() => {
    setError(null);
    api.listLeads({ pageSize: 100 })
      .then((page) => setLive(page.items.filter((row) => !['won', 'lost', 'archived'].includes(row.status))))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load follow-ups.'));
  }, []);

  useEffect(() => {
    if (mode === 'demo') setLeads(getDemoStore().dealer.leads);
    if (mode === 'live') loadLive();
  }, [mode, loadLive]);

  function completeDemo(id: string) {
    const store = getDemoStore();
    store.dealer.leads = store.dealer.leads.map((lead) => (lead.id === id ? { ...lead, followUp: 'Done' } : lead));
    saveDemoStore(store);
    setLeads(store.dealer.leads);
  }

  async function completeLive(id: string) {
    try {
      await api.updateLead(id, { nextFollowUpAt: null });
      notify('Follow-up marked complete');
      loadLive();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not update the follow-up.');
    }
  }

  if (mode === 'loading') return <PageSkeleton />;
  if (error) return <ErrorState title="Follow-ups unavailable" body={error} onRetry={loadLive} />;

  const buckets = mode === 'live' && live
    ? liveBuckets(live)
    : {
      Overdue: leads.filter((lead) => /overdue/i.test(lead.followUp ?? '')),
      Today: leads.filter((lead) => /today/i.test(lead.followUp ?? '')),
      Upcoming: leads.filter((lead) => lead.followUp && !/today|overdue|done|none/i.test(lead.followUp)),
      Completed: leads.filter((lead) => /done/i.test(lead.followUp ?? '')),
    };

  const rows = buckets[tab];
  const emptyAll = mode === 'live' ? (live?.length ?? 0) === 0 : leads.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="In-app reminders only. Completing a task does not send WhatsApp or email."
        primary={{ href: `/dealer/copilot?q=${encodeURIComponent('Aaj ke follow-up ke liye draft karo')}`, label: 'Draft a message' }}
      />
      <div className="flex flex-wrap gap-2">
        {(['Today', 'Overdue', 'Upcoming', 'Completed'] as const).map((item) => (
          <Button key={item} size="sm" variant={tab === item ? 'default' : 'outline'} onClick={() => setTab(item)}>
            {item} ({buckets[item].length})
          </Button>
        ))}
      </div>
      {emptyAll && (
        <EmptyState title="No follow-ups yet" body="Reminders appear after you add a lead with a next step." action={{ href: '/dealer/leads/new', label: 'Add lead' }} />
      )}
      {!emptyAll && rows.length === 0 && <p className="text-sm text-muted-foreground">None in this list.</p>}
      <ul className="space-y-2">
        {rows.map((row) => {
          const lead = 'name' in row ? row : row;
          const name = lead.name;
          const phone = 'phone' in lead ? lead.phone : undefined;
          const hint = 'followUp' in lead ? lead.followUp : ('nextFollowUpAt' in lead && lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString('en-IN') : 'Due');
          const locality = 'locality' in lead ? lead.locality : (lead as LeadRow).preferredLocalities?.join(', ');
          const id = lead.id;
          const draft = mode === 'demo'
            ? answerDemoCopilot(`${name} ko follow-up draft karo`, {
              leads,
              properties: [],
              visits: [],
              deals: [],
              commissions: [],
            }).draft
            : null;
          const high = tab === 'Overdue';
          return (
            <li key={id} className={`space-y-2 rounded-2xl border p-4 text-sm shadow-sm ${tab === 'Overdue' ? 'border-rose-200 bg-rose-50/80' : tab === 'Today' ? 'border-amber-200 bg-amber-50/80' : tab === 'Completed' ? 'border-emerald-200 bg-emerald-50/70' : 'border-sky-200 bg-sky-50/80'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {high ? '🔥 ' : ''}{name} · {locality || 'Locality not set'} · {hint}
                  <span className="mt-1 block"><PhoneChip phone={phone} /></span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <CallButton phone={phone} />
                  <WhatsAppButton phone={phone} />
                  <Button asChild size="sm"><Link href={`/dealer/leads/${id}`}>Open buyer</Link></Button>
                  {tab !== 'Completed' && (
                    <Button size="sm" variant="outline" onClick={() => (mode === 'live' ? completeLive(id) : completeDemo(id))}>
                      Complete reminder
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dealer/copilot?q=${encodeURIComponent(`${name} ko follow-up draft karo`)}`}>Edit in Copilot</Link>
                  </Button>
                </div>
              </div>
              {draft && tab !== 'Completed' && (
                <p className="rounded-md bg-muted/40 p-2 text-meta">Suggested draft (simulated, send nahi hoga): {draft}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function liveBuckets(items: LeadRow[]) {
  const now = Date.now();
  const day = 86_400_000;
  const overdue: LeadRow[] = [];
  const today: LeadRow[] = [];
  const upcoming: LeadRow[] = [];
  const completed: LeadRow[] = [];
  for (const row of items) {
    if (!row.nextFollowUpAt) {
      const idle = Date.now() - new Date(row.updatedAt).getTime() > 3 * day;
      if (idle) overdue.push(row);
      continue;
    }
    const due = new Date(row.nextFollowUpAt).getTime();
    if (due < now) overdue.push(row);
    else if (due < now + day) today.push(row);
    else upcoming.push(row);
  }
  return { Overdue: overdue, Today: today, Upcoming: upcoming, Completed: completed };
}
