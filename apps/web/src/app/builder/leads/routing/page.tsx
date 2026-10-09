'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ROUTING_BUCKETS, ROUTING_BUCKET_LABEL, leadRoutingRows, pageItems, type RoutingBucket } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass, when } from '@/features/builder/format';

export default function LeadRoutingPage() {
  const { workspace } = useBuilderWorkspace();
  const [projectId, setProjectId] = useState('');
  const [stage, setStage] = useState<RoutingBucket | ''>('');
  const [dealerId, setDealerId] = useState('');
  const [response, setResponse] = useState('');
  const [from, setFrom] = useState('');
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    if (!workspace) return [];
    return leadRoutingRows(workspace).filter((row) => {
      if (projectId && row.projectId !== projectId) return false;
      if (stage && !row.buckets.includes(stage)) return false;
      if (dealerId && row.dealerId !== dealerId) return false;
      if (response === 'waiting' && row.responseMinutesLeft == null) return false;
      if (response === 'answered' && row.responseMinutesLeft != null) return false;
      if (from && row.updatedAt < new Date(from).toISOString()) return false;
      return true;
    });
  }, [workspace, projectId, stage, dealerId, response, from]);
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const paged = pageItems(rows, page, 8);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Lead routing</h2>
        <p className="text-sm text-muted-foreground">Scores are assignment compatibility from stored rules, not a prediction of who will close.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select className={fieldClass} aria-label="Project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setPage(0); }}>
          <option value="">All projects</option>
          {workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select className={fieldClass} aria-label="Stage" value={stage} onChange={(event) => { setStage(event.target.value as RoutingBucket | ''); setPage(0); }}>
          <option value="">All stages</option>
          {ROUTING_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{ROUTING_BUCKET_LABEL[bucket]}</option>)}
        </select>
        <select className={fieldClass} aria-label="Dealer" value={dealerId} onChange={(event) => { setDealerId(event.target.value); setPage(0); }}>
          <option value="">All dealers</option>
          {workspace.dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}
        </select>
        <select className={fieldClass} aria-label="Response state" value={response} onChange={(event) => { setResponse(event.target.value); setPage(0); }}>
          <option value="">Any response</option>
          <option value="waiting">Waiting</option>
          <option value="answered">Answered or closed</option>
        </select>
        <input className={fieldClass} type="date" aria-label="Updated from" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} />
      </div>
      {!workspace.leads.length && <p className="text-sm text-muted-foreground">No buyer leads yet. New enquiries will appear here for assignment.</p>}
      <div className="space-y-3 md:hidden">
        {paged.items.map((row) => <RoutingCard key={row.leadId} leadId={row.leadId} />)}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Requirement</th>
              <th className="py-2 pr-3">Project</th>
              <th className="py-2 pr-3">Dealer</th>
              <th className="py-2 pr-3">Score</th>
              <th className="py-2 pr-3">Timer</th>
              <th className="py-2">Next</th>
            </tr>
          </thead>
          <tbody>
            {paged.items.map((row) => (
              <tr key={row.leadId} className="border-t align-top">
                <td className="py-2 pr-3"><Link className="font-medium" href={`/builder/leads/${row.leadId}`}>{row.summary}</Link><p className="text-xs text-muted-foreground">{row.unitNumber ?? 'No unit'}</p></td>
                <td className="py-2 pr-3">{row.projectName}</td>
                <td className="py-2 pr-3">{row.dealerName ?? 'Unassigned'}</td>
                <td className="py-2 pr-3">{row.score ?? '—'}</td>
                <td className="py-2 pr-3">{row.responseMinutesLeft == null ? '—' : `${row.responseMinutesLeft} min`}</td>
                <td className="py-2">{row.nextAction}<p className="text-xs text-muted-foreground">{when(row.lastActivity)}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button type="button" variant="outline" size="sm" disabled={(page + 1) * 8 >= rows.length} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function RoutingCard({ leadId }: { leadId: string }) {
  const { workspace } = useBuilderWorkspace();
  const row = leadRoutingRows(workspace!).find((item) => item.leadId === leadId);
  if (!row) return null;
  return (
    <article className="rounded-xl border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/builder/leads/${row.leadId}`} className="font-medium">{row.summary}</Link>
        <Badge variant="outline">{row.buckets[0]}</Badge>
      </div>
      <p className="text-muted-foreground">{row.projectName}{row.unitNumber ? ` · ${row.unitNumber}` : ''}</p>
      <p>{row.dealerName ?? 'Unassigned'}{row.score != null ? ` · ${row.score} assignment compatibility` : ''}</p>
      <p className="text-muted-foreground">{row.reasons[0] ?? 'No score yet'}</p>
      <p className="mt-1">{row.nextAction}</p>
    </article>
  );
}
