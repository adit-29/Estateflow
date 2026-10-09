'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatInr } from '@estateflow/shared';
import { getDemoStore, type DemoDeal } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type DealRow } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';
import { DEAL_STAGE_LABEL, prettyStatus } from '@/features/dealer/labels';
import { useToast } from '@/components/toast';

const DEMO_STAGES = ['New lead', 'Qualified', 'Site visit', 'Negotiation', 'Booking', 'Closed won', 'Closed lost'];
const LIVE_STAGES = ['new_lead', 'qualified', 'site_visit', 'negotiation', 'booking', 'closed_won', 'closed_lost'];

export default function DealsPage() {
  const [deals, setDeals] = useState<DemoDeal[]>([]);
  const [live, setLive] = useState<DealRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = useLiveMode();
  const { notify } = useToast();

  const loadLive = useCallback(() => {
    setError(null);
    api.listDeals('table')
      .then((page) => setLive(page.items ?? []))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load deals.'));
  }, []);

  useEffect(() => {
    if (mode === 'demo') setDeals(getDemoStore().dealer.deals);
    if (mode === 'live') loadLive();
  }, [mode, loadLive]);

  async function move(id: string, pipelineStage: string) {
    if (!window.confirm(`Move this deal to ${prettyStatus(pipelineStage, DEAL_STAGE_LABEL)}?`)) return;
    try {
      await api.updateDealStage(id, { pipelineStage, confirmImportant: true });
      notify('Deal stage updated');
      loadLive();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not update the deal.');
    }
  }

  if (mode === 'loading') return <PageSkeleton />;
  if (error) return <ErrorState title="Deals unavailable" body={error} onRetry={loadLive} />;
  if (mode === 'live' && live === null) return <PageSkeleton />;

  const stages = mode === 'live' ? LIVE_STAGES : DEMO_STAGES;
  const empty = mode === 'live' ? (live ?? []).length === 0 : deals.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description="Pipeline from stored records. Commission that is not marked paid is still expected, not received."
        primary={{ href: '/dealer/deals/commissions', label: 'Review commissions' }}
        secondary={{ href: '/dealer/site-visits/new', label: 'Schedule visit' }}
      />
      {empty && <EmptyState title="No deals yet" body="Deals appear after you attach a buyer to a property and start negotiation." action={{ href: '/dealer/leads', label: 'Open leads' }} />}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const rows = mode === 'live'
            ? (live ?? []).filter((d) => d.pipelineStage === stage)
            : deals.filter((d) => d.stage === stage || (stage === 'Negotiation' && d.stage === 'Negotiation'));
          return (
            <div key={stage} className="min-w-[200px] rounded-xl border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-medium">{prettyStatus(stage, DEAL_STAGE_LABEL)}</p>
              <p className="mb-3 text-helper text-muted-foreground">{rows.length} · potential {sumLabel(rows)}</p>
              {rows.map((d) => (
                <div key={d.id} className="mb-2 rounded-lg border bg-card p-3 text-sm">
                  <p className="font-medium">{'title' in d ? d.title : ''}</p>
                  <p className="text-xs text-muted-foreground">{valueLabel(d)}</p>
                  {mode === 'live' && 'pipelineStage' in d && d.pipelineStage !== 'closed_won' && d.pipelineStage !== 'closed_lost' && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => move(d.id, nextStage(d.pipelineStage))}>
                      Advance
                    </Button>
                  )}
                </div>
              ))}
              {rows.length === 0 && <p className="text-xs text-muted-foreground">No deals</p>}
            </div>
          );
        })}
      </div>
      {mode === 'demo' && <Badge variant="muted">Demo · Stage changes stay in this browser only when you use Copilot or forms that write the store.</Badge>}
    </div>
  );
}

function valueLabel(d: DemoDeal | DealRow) {
  if ('value' in d && typeof d.value === 'number') return formatInr(d.value);
  if ('value' in d && d.value) return formatInr(Number(d.value));
  return 'Value not recorded';
}

function sumLabel(rows: (DemoDeal | DealRow)[]) {
  const total = rows.reduce((s, row) => {
    if ('value' in row && typeof row.value === 'number') return s + row.value;
    if ('value' in row && row.value) return s + Number(row.value);
    return s;
  }, 0);
  return total ? formatInr(total) : '—';
}

function nextStage(stage: string) {
  const i = LIVE_STAGES.indexOf(stage);
  return LIVE_STAGES[Math.min(i + 1, LIVE_STAGES.length - 2)] ?? stage;
}
