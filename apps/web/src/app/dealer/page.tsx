'use client';

import { useEffect, useState } from 'react';
import { formatInr } from '@estateflow/shared';
import { getDemoStore } from '@/lib/demo-data';
import { getDemoSession } from '@/lib/demo-auth';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError } from '@/lib/api-client';
import { cachedMe } from '@/lib/session-cache';
import { DealerHome, greetingFor, type DealerHomeModel, type HomePriority } from '@/features/dealer/dealer-home';
import { DEAL_STAGE_LABEL, prettyStatus, VISIT_STATUS_LABEL } from '@/features/dealer/labels';
import { ErrorState, PageSkeleton } from '@/components/ux';

export default function DealerOverviewPage() {
  const mode = useLiveMode();
  const [model, setModel] = useState<DealerHomeModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'loading') return;
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const greeting = greetingFor(now);

    if (mode === 'demo') {
      const store = getDemoStore().dealer;
      const session = getDemoSession();
      const followUps = store.leads.filter((l) => /today|overdue/i.test(l.followUp ?? ''));
      const openDeals = store.deals.filter((deal) => !/closed/i.test(deal.stage));
      const pipeline = openDeals.reduce((s, x) => s + x.value, 0);
      const expectedCommission = (store.commissions ?? [])
        .filter((row) => !/paid/i.test(row.status))
        .reduce((sum, row) => sum + (row.amount ?? 0), 0);
      const priorities: HomePriority[] = store.leads
        .filter((l) => /today|overdue/i.test(l.followUp ?? ''))
        .map((lead) => ({
          id: lead.id,
          tone: /overdue/i.test(lead.followUp ?? '') ? 'critical' : 'warn',
          title: lead.name,
          reason: `${lead.followUp ?? 'Follow-up due'}${lead.summary ? ` · ${lead.summary}` : ''}${lead.locality ? ` · ${lead.locality}` : ''}`,
          href: `/dealer/leads/${lead.id}`,
          actionLabel: 'Open lead',
          actionHref: `/dealer/leads/${lead.id}`,
          extraHref: lead.phone ? `tel:${lead.phone.replace(/\D/g, '')}` : undefined,
          extraLabel: lead.phone ? 'Call' : undefined,
        }));
      const stages = ['Qualified', 'Site visit', 'Negotiation', 'Booking', 'Closed'];
      setModel({
        demo: true,
        name: (session?.name ?? 'there').split(' ')[0],
        greeting,
        dateLabel,
        empty: store.leads.length === 0 && store.properties.length === 0,
        metrics: [
          { label: 'Active leads', value: store.leads.length, definition: 'Buyer conversations in this demo workspace.', href: '/dealer/leads' },
          { label: 'Follow-ups due', value: followUps.length, definition: 'Leads marked due today or overdue.', href: '/dealer/follow-ups' },
          { label: 'Site visits', value: store.visits.length, definition: 'Scheduled demo visits on file.', href: '/dealer/site-visits' },
          { label: 'Expected commission', value: expectedCommission ? formatInr(expectedCommission) : 'Not recorded', definition: 'From recorded agreements — not money received.', href: '/dealer/deals/commissions' },
        ],
        priorities,
        visits: store.visits.slice(0, 6).map((visit) => ({
          id: visit.id,
          when: visit.when,
          buyer: visit.buyerName,
          property: visit.propertyTitle,
          status: visit.status,
          pendingConfirm: /propos|pending/i.test(visit.status),
        })),
        pipeline: stages.map((stage) => {
          const rows = store.deals.filter((deal) => deal.stage.toLowerCase().includes(stage.toLowerCase().split(' ')[0]));
          const value = rows.reduce((s, row) => s + row.value, 0);
          return { stage, count: rows.length, valueLabel: value ? formatInr(value) : undefined };
        }),
      });
      return;
    }

    let cancelled = false;
    Promise.all([api.dashboardOverview(), cachedMe().catch(() => null)])
      .then(([overview, account]) => {
        if (cancelled) return;
        const commission = Number(overview.expectedCommission);
        setModel({
          demo: false,
          name: account?.email?.split('@')[0] ?? 'there',
          greeting,
          dateLabel,
          empty: overview.isEmpty,
          metrics: [
            { label: 'Active leads', value: overview.totalLeads, definition: overview.definitions.pipelineValue ? 'Leads stored for this agency.' : 'Leads on file.', href: '/dealer/leads' },
            { label: 'Follow-ups due', value: overview.followUpsDue, definition: 'Leads whose next follow-up is due now.', href: '/dealer/follow-ups' },
            { label: 'Upcoming visits', value: overview.upcomingVisits, definition: overview.definitions.upcomingVisits, href: '/dealer/site-visits' },
            { label: 'Expected commission', value: commission ? formatInr(commission) : 'Not recorded', definition: overview.definitions.expectedCommission, href: '/dealer/deals/commissions' },
          ],
          priorities: (overview.priorities ?? []).map((item) => ({
            id: item.id,
            tone: item.tone,
            title: item.title,
            reason: item.reason,
            href: item.href,
            actionLabel: item.actionLabel,
            actionHref: item.actionHref,
            extraHref: item.extraHref,
            extraLabel: item.extraLabel,
          })),
          visits: (overview.todayVisits ?? []).map((visit) => ({
            id: visit.id,
            when: new Date(visit.scheduledAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
            buyer: visit.buyer ?? 'Buyer not linked',
            property: visit.property ?? visit.meetingPoint,
            status: prettyStatus(visit.status, VISIT_STATUS_LABEL),
            pendingConfirm: visit.status === 'proposed',
          })),
          pipeline: (overview.pipeline ?? []).map((col) => ({
            stage: prettyStatus(col.stage, DEAL_STAGE_LABEL),
            count: col.count,
            valueLabel: Number(col.value) ? formatInr(Number(col.value)) : undefined,
          })),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'We could not load your dashboard.');
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (mode === 'loading' || (!model && !error)) return <PageSkeleton />;
  if (error) return <ErrorState title="Dashboard unavailable" body={error} onRetry={() => window.location.reload()} />;
  if (!model) return <PageSkeleton />;
  return <DealerHome model={model} />;
}
