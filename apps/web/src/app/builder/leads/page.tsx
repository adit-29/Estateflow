'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LEAD_STAGE_LABEL, rankDealers, type AssignmentRequirement } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass, inr } from '@/features/builder/format';
import { EmptyState, PageHeader } from '@/components/ux';

export default function LeadsPage() {
  const { workspace, run, projectId } = useBuilderWorkspace();
  const [draft, setDraft] = useState({
    buyerName: '',
    phone: '',
    configuration: '3BHK',
    locality: 'Dwarka',
    budgetMin: '12000000',
    budgetMax: '15000000',
    note: '',
  });
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const project = workspace.projects.find((item) => item.id === (projectId || workspace.projects[0]?.id));
  const requirement: AssignmentRequirement | null = project ? {
    projectId: project.id,
    unitId: null,
    locality: draft.locality,
    propertyType: project.projectType === 'commercial' ? 'commercial' : 'residential',
    configuration: draft.configuration,
    transactionType: 'sale',
    budgetMin: Number(draft.budgetMin) || 0,
    budgetMax: Number(draft.budgetMax) || 0,
  } : null;
  const ranked = requirement ? rankDealers(workspace, requirement) : { eligible: [], excluded: [] };
  const leads = workspace.leads.filter((lead) => !projectId || lead.projectId === projectId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyer enquiries"
        description="Assign each buyer to an eligible dealer. Compatibility is a weighted score, not a close prediction."
        primary={{ href: '/builder/leads/routing', label: 'Open assignment board' }}
      />
      {leads.length === 0 && (
        <EmptyState title="No buyer leads yet" body="Save an enquiry below. A real account will not inherit demo leads." />
      )}
      <div className="space-y-3">
        {leads.map((lead) => (
          <Link key={lead.id} href={`/builder/leads/${lead.id}`} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4 shadow-sm hover:brightness-95">
            <span className="absolute inset-y-0 left-0 w-1.5 bg-indigo-500" />
            <div className="pl-3">
              <p className="font-medium">{lead.buyerName}</p>
              <p className="text-sm text-muted-foreground">{lead.configuration} · {lead.locality} · {inr(lead.budgetMin)}–{inr(lead.budgetMax)}</p>
              {lead.phone ? <p className="mt-1 text-sm font-medium text-emerald-800">{lead.phone}</p> : null}
            </div>
            <Badge variant="info">{LEAD_STAGE_LABEL[lead.stage]}</Badge>
          </Link>
        ))}
      </div>
      <form
        className="space-y-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!project) return;
          void run({
            type: 'create_lead',
            lead: {
              projectId: project.id,
              unitId: null,
              buyerName: draft.buyerName,
              phone: draft.phone,
              budgetMin: Number(draft.budgetMin) || 0,
              budgetMax: Number(draft.budgetMax) || 0,
              bedrooms: Number(draft.configuration.replace(/\D/g, '')) || 0,
              configuration: draft.configuration,
              transactionType: 'sale',
              locality: draft.locality,
              propertyType: project.projectType === 'commercial' ? 'commercial' : 'residential',
              requirementNote: draft.note,
            },
          });
        }}
      >
        <h3 className="font-medium">New enquiry for {project?.name ?? 'a project'}</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={draft.buyerName} onChange={(event) => setDraft({ ...draft, buyerName: event.target.value })} placeholder="Buyer name" aria-label="Buyer name" required />
          <Input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Phone" aria-label="Phone" />
          <Input value={draft.configuration} onChange={(event) => setDraft({ ...draft, configuration: event.target.value })} aria-label="Configuration" />
          <Input value={draft.locality} onChange={(event) => setDraft({ ...draft, locality: event.target.value })} aria-label="Locality" />
          <Input value={draft.budgetMin} onChange={(event) => setDraft({ ...draft, budgetMin: event.target.value })} aria-label="Budget minimum" />
          <Input value={draft.budgetMax} onChange={(event) => setDraft({ ...draft, budgetMax: event.target.value })} aria-label="Budget maximum" />
        </div>
        <textarea className={`${fieldClass} h-20 py-2`} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Requirement" aria-label="Requirement" />
        <div className="space-y-2">
          <p className="text-sm font-medium">Assignment compatibility for this requirement</p>
          {ranked.eligible.slice(0, 3).map((dealer) => (
            <p key={dealer.dealerId} className="text-sm">{dealer.name} · {dealer.score} assignment compatibility · {dealer.factors.filter((factor) => factor.points > 0).slice(0, 3).map((factor) => factor.reason).join('; ')}</p>
          ))}
          {!ranked.eligible.length && <p className="text-sm text-muted-foreground">No eligible dealer for these inputs.</p>}
        </div>
        <Button type="submit">Save enquiry</Button>
      </form>
    </div>
  );
}
