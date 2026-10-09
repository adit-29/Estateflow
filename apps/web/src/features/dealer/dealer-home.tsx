'use client';

import Link from 'next/link';
import { formatInr } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState, MetricCard, StatusDot } from '@/components/ux';
import { cn } from '@/lib/utils';

export interface HomePriority {
  id: string;
  tone: 'critical' | 'warn' | 'info';
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
  actionHref: string;
  extraHref?: string;
  extraLabel?: string;
}

export interface HomeVisit {
  id: string;
  when: string;
  buyer: string;
  property: string;
  status: string;
  pendingConfirm?: boolean;
}

export interface HomePipeline {
  stage: string;
  count: number;
  valueLabel?: string;
}

export interface DealerHomeModel {
  demo: boolean;
  name: string;
  greeting: string;
  dateLabel: string;
  metrics: { label: string; value: string | number; definition: string; href: string }[];
  priorities: HomePriority[];
  visits: HomeVisit[];
  pipeline: HomePipeline[];
  empty: boolean;
}

const METRIC_TONES = ['teal', 'amber', 'sky', 'violet'] as const;
const PIPELINE_TONES = [
  'border-sky-200 bg-sky-50',
  'border-teal-200 bg-teal-50',
  'border-amber-200 bg-amber-50',
  'border-orange-200 bg-orange-50',
  'border-emerald-200 bg-emerald-50',
];

export function DealerHome({ model }: { model: DealerHomeModel }) {
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-500 to-sky-500 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {model.demo && <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/80">Demo workspace · Sample data</p>}
            <h2 className="mt-1 text-page text-white">{model.greeting}, {model.name}</h2>
            <p className="mt-1 text-body text-white/90">{model.dateLabel}. Here&apos;s what needs your attention today.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/40 bg-white/15 text-white hover:bg-white/25"><Link href="/dealer/inventory/new">Add property</Link></Button>
            <Button asChild variant="outline" className="border-white/40 bg-white/15 text-white hover:bg-white/25"><Link href="/dealer/site-visits/new">Schedule visit</Link></Button>
            <Button asChild variant="outline" className="border-white/40 bg-white/15 text-white hover:bg-white/25"><Link href="/dealer/copilot">Ask AI</Link></Button>
            <Button asChild className="bg-white text-teal-800 hover:bg-white/90"><Link href="/dealer/leads/new">Add lead</Link></Button>
          </div>
        </div>
      </div>

      {model.empty ? (
        <EmptyState
          title="No records in this workspace yet"
          body="Add your first buyer and EstateFlow will start organizing follow-ups, matching, and today's work. Sample demo data is not shown on a live account."
          action={{ href: '/dealer/leads/new', label: 'Add your first lead' }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {model.metrics.map((metric, index) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} definition={metric.definition} href={metric.href} tone={METRIC_TONES[index % METRIC_TONES.length]} />
            ))}
          </div>

          <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">What needs attention</p>
                <h3 className="mt-1">Priorities</h3>
              </div>
              <Button asChild size="sm" variant="outline"><Link href="/dealer/follow-ups">All follow-ups</Link></Button>
            </div>
            {model.priorities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing overdue in the current records.</p>
            ) : (
              <ul className="space-y-3">
                {model.priorities.map((item) => (
                  <li key={item.id} className={cn(
                    'rounded-xl border p-4',
                    item.tone === 'critical' && 'border-rose-200 bg-rose-50/80',
                    item.tone === 'warn' && 'border-amber-200 bg-amber-50/80',
                    item.tone === 'info' && 'border-sky-200 bg-sky-50/80',
                  )}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          <StatusDot tone={item.tone} />
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="accept"><Link href={item.actionHref}>{item.actionLabel}</Link></Button>
                        {item.extraHref && item.extraLabel && (
                          <Button asChild size="sm" variant="outline">
                            {item.extraHref.startsWith('/') ? (
                              <Link href={item.extraHref}>{item.extraLabel}</Link>
                            ) : (
                              <a href={item.extraHref}>{item.extraLabel}</a>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3>Today&apos;s site visits</h3>
                <Button asChild size="sm" variant="outline"><Link href="/dealer/site-visits">Open calendar</Link></Button>
              </div>
              {model.visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits scheduled for the next 24 hours.</p>
              ) : (
                <ul className="space-y-3">
                  {model.visits.map((visit) => (
                    <li key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white p-3">
                      <div>
                        <p className="font-medium">{visit.property}</p>
                        <p className="text-sm text-muted-foreground">{visit.buyer} · {visit.when}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {visit.pendingConfirm && <Badge variant="outline">Confirmation pending</Badge>}
                        <Badge variant="muted">{visit.status}</Badge>
                        <Button asChild size="sm" variant="outline"><Link href="/dealer/site-visits">Open</Link></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3>Pipeline</h3>
                <Button asChild size="sm" variant="outline"><Link href="/dealer/deals">Open deals</Link></Button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {model.pipeline.map((col, index) => (
                  <Link key={col.stage} href="/dealer/deals" className={cn('min-w-[7.5rem] rounded-xl border p-3 hover:brightness-95', PIPELINE_TONES[index % PIPELINE_TONES.length])}>
                    <p className="text-helper capitalize text-muted-foreground">{col.stage.replace(/_/g, ' ')}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums">{col.count}</p>
                    {col.valueLabel && <p className="mt-1 text-helper text-muted-foreground">{col.valueLabel}</p>}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function inrLabel(amount: number) {
  return formatInr(amount);
}
