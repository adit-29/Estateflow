'use client';

import { useParams } from 'next/navigation';
import { LEAD_STAGE_LABEL, LEAD_STAGES, rankDealers, requirementFromLead, type LeadStage } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass, inr, when } from '@/features/builder/format';
import { CallButton, PhoneChip, WhatsAppButton } from '@/features/dealer/contact-actions';
import { AccentCard } from '@/components/ux';

export default function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { workspace, run } = useBuilderWorkspace();
  const lead = workspace?.leads.find((item) => item.id === leadId);
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  if (!lead) return <p>Lead not found.</p>;
  const ranked = rankDealers(workspace, requirementFromLead(lead));
  const history = workspace.assignments.filter((row) => row.leadId === lead.id);
  const events = workspace.timeline.filter((event) => event.entityId === lead.id);
  const open = history.find((row) => row.status === 'assigned' || row.status === 'accepted');
  const project = workspace.projects.find((item) => item.id === lead.projectId);
  const accepted = history.find((row) => row.status === 'accepted');

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Assign this buyer</p>
        <h2 className="mt-1 text-2xl font-bold">{lead.buyerName}</h2>
        <p className="mt-1 text-lg font-semibold">{lead.phone || 'Phone not recorded'}</p>
        <p className="mt-2 text-sm text-white/85">{lead.configuration} · {lead.locality} · {inr(lead.budgetMin)}–{inr(lead.budgetMax)}</p>
        <p className="mt-1 text-sm text-white/80">{project?.name} · {lead.requirementNote}</p>
        <Badge className="mt-3 bg-white/20 text-white">{LEAD_STAGE_LABEL[lead.stage]}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PhoneChip phone={lead.phone} />
        <CallButton phone={lead.phone} size="default" />
        <WhatsAppButton phone={lead.phone} size="default" />
      </div>
      <AccentCard tone="indigo">
        <p className="text-sm">First contact {when(lead.firstContactAt)} · Visit {when(lead.visitAt)} {lead.visitOutcome ? `· ${lead.visitOutcome}` : ''} · Booking {lead.bookingStatus ?? '—'} · Commission {lead.commissionStatus ?? 'not recorded'}</p>
      </AccentCard>
      {accepted && <p className="text-sm">Response time: {accepted.respondedAt ? minutesBetween(accepted.assignedAt, accepted.respondedAt) : '—'}</p>}

      <section className="space-y-3">
        <h3 className="font-medium">Recommended dealers</h3>
        <p className="text-sm text-muted-foreground">Assignment compatibility is a weighted score from the rules below. It is not a prediction of who will close.</p>
        {ranked.eligible.map((dealer) => (
          <article key={dealer.dealerId} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
            <p className="font-medium">{dealer.name} · {dealer.score} assignment compatibility</p>
            <p className="text-sm text-muted-foreground">{dealer.agencyName}</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {dealer.factors.filter((factor) => factor.points > 0).map((factor) => <li key={factor.key}>{factor.reason} ({factor.points}/{factor.max})</li>)}
            </ul>
            <Button className="mt-3" type="button" size="sm" onClick={() => run({ type: 'assign_lead', leadId: lead.id, mode: open ? 'manual' : 'recommended', dealerId: dealer.dealerId })}>
              {open ? `Reassign to ${dealer.name}` : `Assign to ${dealer.name}`}
            </Button>
          </article>
        ))}
        {ranked.excluded.length > 0 && (
          <p className="text-sm text-muted-foreground">Filtered out: {ranked.excluded.map((row) => `${row.name} (${row.reason})`).join('; ')}</p>
        )}
        <Button type="button" onClick={() => run({ type: 'assign_lead', leadId: lead.id, mode: 'auto' })} disabled={Boolean(open)}>Auto-assign the highest eligible dealer</Button>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Assignment history</h3>
        {events.map((event) => <p key={event.id} className="text-sm">{when(event.at)} — {event.detail}</p>)}
        {!events.length && <p className="text-sm text-muted-foreground">No assignment events yet.</p>}
      </section>

      <label className="block text-sm">
        Deal stage
        <select
          className={`${fieldClass} mt-1 max-w-xs`}
          value={lead.stage}
          onChange={(event) => run({ type: 'advance_lead', leadId: lead.id, stage: event.target.value as LeadStage, visitAt: event.target.value === 'visited' ? new Date().toISOString() : lead.visitAt })}
        >
          {LEAD_STAGES.map((stage) => <option key={stage} value={stage}>{LEAD_STAGE_LABEL[stage]}</option>)}
        </select>
      </label>
    </div>
  );
}

function minutesBetween(start: string, end: string) {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return `${minutes} min`;
}
