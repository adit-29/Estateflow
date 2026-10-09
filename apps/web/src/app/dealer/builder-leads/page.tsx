'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DECLINE_REASONS, DECLINE_REASON_LABEL, dealerAccessNotices, dealerLeadViews, type DeclineReason, type DealerLeadView, type DealerNotice } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMode } from '@/components/use-live-mode';
import { api } from '@/lib/api-client';
import { loadDemoBuilderWorkspace, saveDemoBuilderWorkspace } from '@/lib/builder-workspace';
import { applyBuilderAction } from '@estateflow/shared';
import { EmptyState, PageHeader } from '@/components/ux';
import { inr } from '@/features/builder/format';

export default function DealerBuilderLeadsPage() {
  const mode = useLiveMode();
  const [rows, setRows] = useState<DealerLeadView[]>([]);
  const [notices, setNotices] = useState<DealerNotice[]>([]);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<DeclineReason>('not_my_area');
  const [busy, setBusy] = useState<string | null>(null);

  function reloadDemo() {
    const ws = loadDemoBuilderWorkspace();
    const dealer = ws.dealers.find((item) => item.platformDealerId === 'demo-dealer-001');
    setRows(dealer ? dealerLeadViews(ws, dealer) : []);
    setNotices(dealer ? dealerAccessNotices(ws, dealer) : []);
  }

  useEffect(() => {
    if (mode === 'demo') reloadDemo();
    if (mode === 'live') {
      api.dealerBuilderLeads().then(setRows).catch(() => setRows([]));
    }
  }, [mode]);

  async function respond(assignmentId: string, decision: 'accept' | 'decline') {
    setBusy(`${assignmentId}-${decision}`);
    try {
      if (mode === 'demo') {
        const ws = loadDemoBuilderWorkspace();
        const dealer = ws.dealers.find((item) => item.platformDealerId === 'demo-dealer-001');
        const next = applyBuilderAction(ws, {
          type: 'respond_assignment',
          assignmentId,
          decision,
          reason: decision === 'decline' ? reason : undefined,
          actorDealerId: dealer?.id,
        });
        saveDemoBuilderWorkspace(next);
        reloadDemo();
        return;
      }
      await api.respondBuilderLead(assignmentId, { decision, reason: decision === 'decline' ? reason : undefined });
      setRows(await api.dealerBuilderLeads());
    } finally {
      setBusy(null);
    }
  }

  async function ask(assignmentId: string) {
    if (!note.trim()) return;
    if (mode === 'demo') {
      const ws = loadDemoBuilderWorkspace();
      const dealer = ws.dealers.find((item) => item.platformDealerId === 'demo-dealer-001');
      const next = applyBuilderAction(ws, { type: 'ask_builder', assignmentId, note, actorDealerId: dealer?.id });
      saveDemoBuilderWorkspace(next);
      setNote('');
      return;
    }
    await api.askBuilder(assignmentId, note);
    setNote('');
  }

  const groups = [
    ['New builder leads', rows.filter((row) => row.status === 'assigned')],
    ['Accepted', rows.filter((row) => row.status === 'accepted')],
    ['Declined', rows.filter((row) => row.status === 'declined')],
    ['Reassignment required', rows.filter((row) => row.status === 'timed_out' || row.status === 'reassigned')],
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Builder leads"
        description="Accept blue, decline red. Buyer contact accept ke baad hi dikhega."
      />
      {mode === 'demo' && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-meta text-amber-950">Demo notification. Buyer contact stays hidden until you accept.</p>}
      {notices.map((item) => (
        <p key={item.id} className="rounded-lg border px-3 py-2 text-body">{item.title}. {item.detail}</p>
      ))}
      {!rows.length && <EmptyState title="No builder lead assigned" body="Jab builder aapko lead assign karega, yahan Accept / Decline dikhega." />}
      {groups.map(([title, group]) => (
        <section key={title} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3>{title}</h3>
            <Badge variant="muted">{group.length}</Badge>
          </div>
          {!group.length && <p className="text-body text-muted-foreground">Is bucket mein koi lead nahi.</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            {group.map((row) => (
              <article key={row.assignmentId} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-card">{row.configuration} buyer</p>
                    <p className="text-meta text-muted-foreground">{row.locality} · {row.projectName}</p>
                  </div>
                  <Badge variant="outline">{row.status}</Badge>
                </div>
                <p className="text-body">Budget {inr(row.budgetMin)}–{inr(row.budgetMax)}</p>
                <p className="text-body">{row.requirementNote}</p>
                <div>
                  <p className="text-meta font-semibold">Why you received it</p>
                  <ul className="mt-1 list-disc pl-5 text-meta text-muted-foreground">
                    {row.reasons.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </div>
                {row.status === 'accepted' ? (
                  <p className="rounded-lg bg-blue-50 px-3 py-2 text-body text-blue-950">Buyer: {row.buyerName} · {row.phone}</p>
                ) : (
                  <p className="text-meta text-muted-foreground">Buyer contact accept ke baad dikhega.</p>
                )}
                {row.status === 'assigned' && (
                  <div className="mt-auto space-y-2 border-t pt-3">
                    <label className="block text-meta">
                      Decline reason
                      <select className="mt-1 h-10 w-full rounded-md border-2 px-2 text-body" value={reason} onChange={(event) => setReason(event.target.value as DeclineReason)} aria-label="Decline reason">
                        {DECLINE_REASONS.map((item) => <option key={item} value={item}>{DECLINE_REASON_LABEL[item]}</option>)}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="accept" disabled={busy === `${row.assignmentId}-accept`} onClick={() => respond(row.assignmentId, 'accept')}>
                        {busy === `${row.assignmentId}-accept` ? 'Accepting…' : 'Accept lead'}
                      </Button>
                      <Button type="button" variant="destructive" disabled={busy === `${row.assignmentId}-decline`} onClick={() => respond(row.assignmentId, 'decline')}>
                        {busy === `${row.assignmentId}-decline` ? 'Declining…' : 'Decline'}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm"><Link href="/dealer/inventory">Open project inventory</Link></Button>
                  {row.status === 'accepted' && <Button asChild variant="outline" size="sm"><Link href="/dealer/leads">Open buyer</Link></Button>}
                </div>
                <div className="flex gap-2">
                  <input className="h-10 flex-1 rounded-md border-2 px-3 text-body" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ask the builder" aria-label="Note to builder" />
                  <Button type="button" variant="outline" onClick={() => ask(row.assignmentId)}>Ask builder</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
