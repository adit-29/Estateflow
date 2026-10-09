import {
  CALL_PRIORITY_RULES,
  formatInr,
  isStale,
  prioritizeLeads,
  type CopilotRecord,
  type CopilotToolCall,
  type CopilotToolResult,
} from '@estateflow/shared';
import { computeMatch } from '@estateflow/shared';
import { dealerPerformance } from '@estateflow/shared';
import { learnSpecialization, budgetBand } from '@estateflow/shared';
import type { CopilotDataSource, LeadRow, PropertyRow } from './copilot-data';

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Start of the India calendar day containing `now`, shifted by `offsetDays`. */
export function istDayStart(now: Date, offsetDays = 0): Date {
  const local = now.getTime() + IST_OFFSET_MS;
  return new Date(local - (local % DAY_MS) - IST_OFFSET_MS + offsetDays * DAY_MS);
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const istLabel = (d: Date) =>
  d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function leadRecord(l: LeadRow, extra: Record<string, string | number | null> = {}): CopilotRecord {
  return {
    type: 'lead',
    id: l.id,
    label: l.name,
    href: `/dealer/leads/${l.id}`,
    fields: {
      status: l.status,
      nextFollowUpAt: iso(l.nextFollowUpAt),
      preferredLocalities: l.preferredLocalities.join(', ') || null,
      budgetBand: l.budgetBand,
      requirementSummary: l.requirementSummary,
      notes: l.notes,
      ...extra,
    },
    updatedAt: l.updatedAt.toISOString(),
  };
}

function propertyRecord(p: PropertyRow, now: Date): CopilotRecord {
  return {
    type: 'property',
    id: p.id,
    label: p.title,
    href: `/dealer/inventory/${p.id}`,
    fields: {
      locality: p.locality,
      propertyType: p.propertyType,
      bedrooms: p.bedrooms,
      priceInr: p.priceAmount,
      listingStatus: p.listingStatus,
      lastConfirmedAt: iso(p.lastConfirmedAt),
      availabilityStale: isStale(p.lastConfirmedAt?.toISOString(), now),
      area: p.areaValue != null ? `${p.areaValue} ${p.areaUnit ?? ''}`.trim() : null,
      photoUrl: p.photoUrl,
      freshness: isStale(p.lastConfirmedAt?.toISOString(), now) ? 'stale' : 'fresh',
      source: 'agency inventory',
    },
    updatedAt: p.updatedAt.toISOString(),
  };
}

function propertyGaps(rows: PropertyRow[], now: Date): string[] {
  const gaps: string[] = [];
  for (const p of rows) {
    if (p.priceAmount == null) gaps.push(`${p.title}: price not recorded.`);
    if (isStale(p.lastConfirmedAt?.toISOString(), now)) {
      gaps.push(`${p.title}: availability not confirmed in the last 30 days${p.lastConfirmedAt ? '' : ' (never confirmed)'}.`);
    }
  }
  return gaps;
}

async function resolveLeadByName(data: CopilotDataSource, agencyId: string, name: string) {
  const rows = await data.leads(agencyId, { name, take: 5 });
  if (rows.length === 1) return { lead: rows[0] } as const;
  if (rows.length === 0) {
    return { question: `I could not find a lead named "${name}" in your account. What is the exact name as saved in Leads?` } as const;
  }
  return {
    question: `More than one lead matches "${name}": ${rows.map((r) => r.name).join(', ')}. Which one do you mean?`,
    candidates: rows,
  } as const;
}

/**
 * Runs one allowlisted tool against the session agency. `agencyId` must come from the server session,
 * never from tool arguments (the schemas reject unknown keys).
 */
export async function executeCopilotTool(
  call: CopilotToolCall,
  ctx: { agencyId: string; now: Date; accountId?: string },
  data: CopilotDataSource,
): Promise<CopilotToolResult> {
  const { agencyId, now, accountId } = ctx;

  switch (call.tool) {
    case 'daily_brief': {
      const tomorrow = istDayStart(now, 1);
      const [due, visits, allActive] = await Promise.all([
        data.leads(agencyId, { dueBefore: tomorrow, activeOnly: true, take: 10 }),
        data.visits(agencyId, { from: istDayStart(now), to: tomorrow, take: 10 }),
        data.leads(agencyId, { activeOnly: true, take: 200 }),
      ]);
      const noDate = allActive.filter((l) => !l.nextFollowUpAt).length;
      const records = [
        ...due.map((l) => leadRecord(l)),
        ...visits.map<CopilotRecord>((v) => ({
          type: 'visit',
          id: v.id,
          label: `${v.buyerName ?? 'Buyer not linked'} · ${v.propertyTitle ?? 'Property not linked'}`,
          href: '/dealer/site-visits',
          fields: { scheduledAt: v.scheduledAt.toISOString(), status: v.status, meetingPoint: v.meetingPoint },
          updatedAt: v.updatedAt.toISOString(),
        })),
      ];
      return {
        tool: call.tool,
        records,
        summary: `${due.length} follow-up${due.length === 1 ? '' : 's'} due by end of today and ${visits.length} site visit${visits.length === 1 ? '' : 's'} today.`,
        missing: noDate ? [`${noDate} active lead${noDate === 1 ? ' has' : 's have'} no follow-up date set.`] : [],
        followUpQuestion: records.length ? undefined : 'Nothing is due today. Do you want to see leads without a follow-up date?',
      };
    }

    case 'prioritize_calls': {
      const leads = await data.leads(agencyId, { activeOnly: true, take: 200 });
      const ranked = prioritizeLeads(
        leads.map((l) => ({ ...l, nextFollowUpAt: iso(l.nextFollowUpAt), updatedAt: l.updatedAt.toISOString(), row: l })),
        now,
      ).slice(0, call.args.limit);
      return {
        tool: call.tool,
        records: ranked.map((r, i) => leadRecord(r.row, { priority: i + 1, reason: r.reason })),
        summary: ranked.length
          ? `Call order by the rules below: ${ranked.map((r) => `${r.name} (${r.reason.toLowerCase()})`).join(', ')}.`
          : 'No active leads found.',
        missing: [],
        rules: CALL_PRIORITY_RULES,
        followUpQuestion: ranked.length ? undefined : 'Add a lead first, or check whether your leads are all marked won or lost.',
      };
    }

    case 'search_leads': {
      const rows = await data.leads(agencyId, {
        query: call.args.query,
        dueBefore: call.args.dueOnly ? istDayStart(now, 1) : undefined,
        activeOnly: true,
        take: call.args.limit,
      });
      return {
        tool: call.tool,
        records: rows.map((l) => leadRecord(l)),
        summary: rows.length ? `${rows.length} lead${rows.length === 1 ? '' : 's'} found.` : 'No matching leads in your account.',
        missing: [],
        followUpQuestion: rows.length ? undefined : 'Try a different name or locality?',
      };
    }

    case 'search_inventory': {
      const rows = await data.activeProperties(agencyId, {
        locality: call.args.locality,
        maxPrice: call.args.maxPriceInr,
        bedrooms: call.args.bedrooms,
        take: call.args.limit,
      });
      const criteria = [
        call.args.locality,
        call.args.bedrooms != null ? `${call.args.bedrooms} BHK` : null,
        call.args.maxPriceInr ? `up to ${formatInr(call.args.maxPriceInr)}` : null,
      ].filter(Boolean);
      return {
        tool: call.tool,
        records: rows.map((p) => propertyRecord(p, now)),
        summary: rows.length
          ? `${rows.length} active listing${rows.length === 1 ? '' : 's'} match ${criteria.join(', ') || 'your search'}.`
          : `No active listings match ${criteria.join(', ') || 'your search'}.`,
        missing: propertyGaps(rows, now),
        followUpQuestion: !call.args.locality
          ? 'Which locality should I search in?'
          : rows.length
            ? undefined
            : 'Should I widen the budget or drop the bedroom filter?',
      };
    }

    case 'list_visits': {
      const from = call.args.day === 'tomorrow' ? istDayStart(now, 1) : call.args.day === 'today' ? istDayStart(now) : now;
      const to = call.args.day === 'upcoming' ? undefined : new Date(from.getTime() + DAY_MS);
      const rows = await data.visits(agencyId, { from, to, take: call.args.limit });
      const label = call.args.day === 'tomorrow' ? 'tomorrow' : call.args.day === 'today' ? 'today' : 'upcoming';
      return {
        tool: call.tool,
        records: rows.map((v) => ({
          type: 'visit',
          id: v.id,
          label: `${istLabel(v.scheduledAt)} · ${v.buyerName ?? 'Buyer not linked'}`,
          href: '/dealer/site-visits',
          fields: {
            scheduledAt: v.scheduledAt.toISOString(),
            status: v.status,
            property: v.propertyTitle,
            meetingPoint: v.meetingPoint,
          },
          updatedAt: v.updatedAt.toISOString(),
        })),
        summary: rows.length ? `${rows.length} ${label} site visit${rows.length === 1 ? '' : 's'}.` : `No ${label} site visits scheduled.`,
        missing: rows.filter((v) => v.status === 'proposed').map((v) => `Visit at ${istLabel(v.scheduledAt)} is still proposed, not confirmed.`),
      };
    }

    case 'pipeline_summary': {
      const deals = await data.deals(agencyId);
      const byStage = new Map<string, { count: number; value: number; unvalued: number }>();
      for (const d of deals) {
        const s = byStage.get(d.pipelineStage) ?? { count: 0, value: 0, unvalued: 0 };
        s.count += 1;
        if (d.value == null) s.unvalued += 1;
        else s.value += d.value;
        byStage.set(d.pipelineStage, s);
      }
      const unvalued = deals.filter((d) => d.value == null).length;
      return {
        tool: call.tool,
        records: [...byStage.entries()].map(([stage, s]) => ({
          type: 'deal',
          id: `stage:${stage}`,
          label: stage.replace(/_/g, ' '),
          href: '/dealer/deals',
          fields: { stage, deals: s.count, recordedValueInr: s.value, dealsWithoutValue: s.unvalued },
        })),
        summary: deals.length
          ? `${deals.length} deals across ${byStage.size} stages, sum of recorded values ${formatInr(deals.reduce((a, d) => a + (d.value ?? 0), 0))}.`
          : 'No deals recorded yet.',
        missing: unvalued ? [`${unvalued} deal${unvalued === 1 ? ' has' : 's have'} no value recorded, so totals are incomplete.`] : [],
      };
    }

    case 'pending_commissions': {
      const rows = await data.openCommissions(agencyId, call.args.limit);
      const records: CopilotRecord[] = rows.map((c) => {
        const amount = c.fixedAmount ?? (c.percentage != null && c.dealValue != null ? Math.round((c.percentage * c.dealValue) / 100) : null);
        return {
          type: 'commission',
          id: c.id,
          label: c.dealTitle,
          href: '/dealer/deals/commissions',
          fields: {
            paymentStatus: c.paymentStatus,
            amountInr: amount,
            percentage: c.percentage,
            dealValueInr: c.dealValue,
            dueDate: iso(c.dueDate),
            amountSource: c.fixedAmount != null ? 'fixed amount' : amount != null ? 'percentage × deal value' : 'not recorded',
          },
          updatedAt: c.updatedAt.toISOString(),
        };
      });
      const total = records.reduce((a, r) => a + (typeof r.fields.amountInr === 'number' ? r.fields.amountInr : 0), 0);
      const unknown = records.filter((r) => r.fields.amountInr == null);
      return {
        tool: call.tool,
        records,
        summary: rows.length
          ? `${rows.length} open commission${rows.length === 1 ? '' : 's'}; recorded amounts add up to ${formatInr(total)}.`
          : 'No pending, overdue, or disputed commissions recorded.',
        missing: unknown.map((r) => `${r.label}: commission amount cannot be calculated (no fixed amount, or percentage/deal value missing).`),
      };
    }

    case 'find_matches': {
      let buyers = await data.buyers(agencyId, { name: call.args.buyerName, take: 20 });
      if (!buyers.length) {
        const leads = await data.leads(agencyId, { name: call.args.buyerName, query: call.args.buyerName, activeOnly: true, take: 20 });
        buyers = leads.map((l) => ({
          id: l.id,
          contactName: l.name,
          leadId: l.id,
          localities: l.preferredLocalities,
          bedroomsMin: null,
          bedroomsMax: null,
          budgetMax: null,
          updatedAt: l.updatedAt,
        }));
      }
      const properties = await data.activeProperties(agencyId, { take: 80 });
      const scored: CopilotRecord[] = [];
      const missing: string[] = [];
      for (const b of buyers) {
        for (const p of properties) {
          const result = computeMatch(
            { localities: b.localities, bedroomsMin: b.bedroomsMin, bedroomsMax: b.bedroomsMax, budgetMax: b.budgetMax },
            { locality: p.locality, bedrooms: p.bedrooms, priceAmount: p.priceAmount, listingStatus: p.listingStatus, propertyType: p.propertyType },
          );
          if (result.matchPercent <= 0) continue;
          scored.push({
            type: 'property',
            id: `${b.id}:${p.id}`,
            label: `${b.contactName} → ${p.title}`,
            href: `/dealer/inventory/${p.id}`,
            fields: {
              buyer: b.contactName,
              buyerHref: b.leadId ? `/dealer/leads/${b.leadId}` : `/dealer/buyers/${b.id}`,
              locality: p.locality,
              priceInr: p.priceAmount,
              buyerBudgetMaxInr: b.budgetMax,
              bedrooms: p.bedrooms,
              matchPercent: result.matchPercent,
              why: result.explanation,
            },
          });
        }
      }
      scored.sort((a, b) => Number(b.fields.matchPercent ?? 0) - Number(a.fields.matchPercent ?? 0));
      const records = scored.slice(0, call.args.limit);
      return {
        tool: call.tool,
        records,
        summary: records.length
          ? `${records.length} matches — percentage comes from the matching engine, not the model.`
          : buyers.length
            ? 'No active listing meets saved locality, budget, or bedroom criteria.'
            : 'No buyer requirements saved yet.',
        missing: missing.slice(0, 10),
        rules: ['Match % is computeMatch over recorded dimensions. Unknown fields are excluded, not assumed.'],
        followUpQuestion: buyers.length ? undefined : 'Add a buyer requirement first under Buyers.',
      };
    }

    case 'draft_follow_up': {
      const found = await resolveLeadByName(data, agencyId, call.args.leadName);
      if (!('lead' in found) || !found.lead) {
        return {
          tool: call.tool,
          records: (found.candidates ?? []).map((l) => leadRecord(l)),
          summary: found.question,
          missing: [],
          followUpQuestion: found.question,
        };
      }
      const lead = found.lead;
      const first = lead.name.split(' ')[0];
      const localities = lead.preferredLocalities.join(', ');
      const draft =
        call.args.purpose === 'visit_reminder'
          ? `Namaste ${first} ji, a reminder about your upcoming site visit. Please let me know if the time still works.`
          : call.args.purpose === 'new_listing'
            ? `Namaste ${first} ji, I have a new listing${localities ? ` in ${localities}` : ''} that may suit your requirement. Shall I share details?`
            : `Namaste ${first} ji, checking in on your property search${localities ? ` in ${localities}` : ''}. Is your requirement still the same?`;
      return {
        tool: call.tool,
        records: [leadRecord(lead)],
        summary: `Draft ready for ${lead.name}. Review and send it yourself; EstateFlow will not send it.`,
        missing: localities ? [] : [`${lead.name} has no preferred localities saved, so the draft stays generic.`],
        draft,
      };
    }

    case 'propose_follow_up': {
      const found = await resolveLeadByName(data, agencyId, call.args.leadName);
      if (!('lead' in found) || !found.lead) {
        return {
          tool: call.tool,
          records: (found.candidates ?? []).map((l) => leadRecord(l)),
          summary: found.question,
          missing: [],
          followUpQuestion: found.question,
        };
      }
      const lead = found.lead;
      const dueAt = new Date(istDayStart(now, call.args.due === 'today' ? 0 : 1).getTime() + 10 * 3_600_000);
      const effectiveDue = dueAt.getTime() < now.getTime() ? new Date(now.getTime() + 3_600_000) : dueAt;
      return {
        tool: call.tool,
        records: [leadRecord(lead)],
        summary: `Proposed: follow-up with ${lead.name} at ${istLabel(effectiveDue)}. Nothing is saved until you confirm.`,
        missing: lead.nextFollowUpAt ? [`${lead.name} already has a follow-up at ${istLabel(lead.nextFollowUpAt)}; confirming replaces it.`] : [],
        proposal: {
          kind: 'follow_up',
          leadId: lead.id,
          leadName: lead.name,
          dueAt: effectiveDue.toISOString(),
          note: call.args.note,
          label: `Set follow-up for ${lead.name} at ${istLabel(effectiveDue)}`,
        },
      };
    }

    case 'propose_site_visit': {
      const found = await resolveLeadByName(data, agencyId, call.args.leadName);
      if (!('lead' in found) || !found.lead) {
        return {
          tool: call.tool,
          records: (found.candidates ?? []).map((l) => leadRecord(l)),
          summary: found.question,
          missing: [],
          followUpQuestion: found.question,
        };
      }
      const lead = found.lead;
      const when = call.args.when === 'today' ? 'aaj' : 'kal';
      return {
        tool: call.tool,
        records: [leadRecord(lead)],
        summary: `Proposed: site visit for ${lead.name} (${when}). Property still choose karni hogi. Confirm yahan record nahi banata — visit form kholo.`,
        missing: ['Property is not selected in this proposal. Open the site visit form to pick a listing.'],
        proposal: {
          kind: 'site_visit',
          leadId: lead.id,
          leadName: lead.name,
          dueAt: new Date(istDayStart(now, call.args.when === 'today' ? 0 : 1).getTime() + 17 * 3_600_000).toISOString(),
          label: `Open site visit form for ${lead.name}`,
          href: '/dealer/site-visits/new',
          requiresConfirmation: true,
        },
      };
    }
    case 'get_lead': {
      if (call.args.leadId) {
        const row = await data.lead(agencyId, call.args.leadId);
        if (!row) {
          return { tool: call.tool, records: [], summary: 'Mujhe CRM mein is waqt koi matching record nahi mila.', missing: ['Lead not found in this agency.'] };
        }
        return { tool: call.tool, records: [leadRecord(row)], summary: `${row.name} · ${row.status}.`, missing: [] };
      }
      if (!call.args.leadName) {
        const rows = await data.leads(agencyId, { activeOnly: true, take: 10 });
        return {
          tool: call.tool,
          records: rows.map((l) => leadRecord(l)),
          summary: rows.length ? `${rows.length} active leads.` : 'Abhi aapke CRM mein data nahi hai.',
          missing: [],
        };
      }
      const found = await resolveLeadByName(data, agencyId, call.args.leadName);
      if (!('lead' in found) || !found.lead) {
        return {
          tool: call.tool,
          records: (found.candidates ?? []).map((l) => leadRecord(l)),
          summary: found.question,
          missing: [],
          followUpQuestion: found.question,
        };
      }
      return { tool: call.tool, records: [leadRecord(found.lead)], summary: `${found.lead.name} · ${found.lead.status}.`, missing: [] };
    }
    case 'search_buyers': {
      const buyers = await data.buyers(agencyId, { name: call.args.query, take: call.args.limit });
      const leads = buyers.length ? [] : await data.leads(agencyId, { query: call.args.query, activeOnly: true, take: call.args.limit });
      const records: CopilotRecord[] = buyers.length
        ? buyers.map((b) => ({
            type: 'buyer' as const,
            id: b.id,
            label: b.contactName,
            href: `/dealer/buyers/${b.id}`,
            fields: { localities: b.localities.join(', ') || null, bedroomsMin: b.bedroomsMin, bedroomsMax: b.bedroomsMax, budgetMaxInr: b.budgetMax },
            updatedAt: b.updatedAt.toISOString(),
          }))
        : leads.map((l) => leadRecord(l));
      return {
        tool: call.tool,
        records,
        summary: records.length ? `${records.length} buyers.` : 'Mujhe CRM mein is waqt koi matching record nahi mila.',
        missing: [],
      };
    }
    case 'get_buyer': {
      if (call.args.buyerId) {
        const rows = await data.buyers(agencyId, { take: 20 });
        const hit = rows.find((b) => b.id === call.args.buyerId);
        if (!hit) return { tool: call.tool, records: [], summary: 'Mujhe CRM mein is waqt koi matching record nahi mila.', missing: ['Buyer not found in this agency.'] };
        return {
          tool: call.tool,
          records: [{ type: 'buyer', id: hit.id, label: hit.contactName, href: `/dealer/buyers/${hit.id}`, fields: { localities: hit.localities.join(', ') || null, budgetMaxInr: hit.budgetMax }, updatedAt: hit.updatedAt.toISOString() }],
          summary: hit.contactName,
          missing: [],
        };
      }
      return executeCopilotTool({ tool: 'get_lead', args: { leadName: call.args.name } }, ctx, data);
    }
    case 'get_property': {
      if (call.args.propertyId) {
        const row = await data.property(agencyId, call.args.propertyId);
        if (!row) return { tool: call.tool, records: [], summary: 'Mujhe CRM mein is waqt koi matching record nahi mila.', missing: ['Property not found in this agency.'] };
        return { tool: call.tool, records: [propertyRecord(row, now)], summary: row.title, missing: propertyGaps([row], now) };
      }
      const rows = await data.activeProperties(agencyId, { query: call.args.query, locality: call.args.query, take: 10 });
      return {
        tool: call.tool,
        records: rows.map((p) => propertyRecord(p, now)),
        summary: rows.length ? `${rows.length} listings.` : 'No active listings match that query.',
        missing: propertyGaps(rows, now),
      };
    }
    case 'get_network_dealers': {
      const rows = await data.network(agencyId, call.args.limit);
      return {
        tool: call.tool,
        records: rows.map((r) => ({ type: 'network' as const, id: r.id, label: r.label, href: '/dealer/network', fields: { status: r.status } })),
        summary: rows.length ? `${rows.length} network contacts recorded for this agency.` : 'Koi network dealer recorded nahi hai.',
        missing: [],
      };
    }
    case 'get_builder_leads': {
      return {
        tool: call.tool,
        records: [],
        summary: 'Builder lead inbox is on Builder leads. Live Copilot lists assignments only when this dealer is linked on a builder org — that link is not on this account.',
        missing: ['No builder-org link on this live dealer.'],
      };
    }
    case 'get_notifications': {
      if (!accountId) {
        return { tool: call.tool, records: [], summary: 'Notifications need the signed-in account.', missing: ['Account id missing from session.'] };
      }
      const rows = await data.notifications(agencyId, accountId, call.args.limit);
      return {
        tool: call.tool,
        records: rows.map((n) => ({
          type: 'notification' as const,
          id: n.id,
          label: n.title,
          href: '/dealer/notifications',
          fields: { body: n.body, createdAt: n.createdAt.toISOString() },
        })),
        summary: rows.length ? `${rows.length} notifications.` : 'No notifications recorded.',
        missing: [],
      };
    }
    case 'get_dealer_performance': {
      const [leads, visits, deals, commissions] = await Promise.all([
        data.leads(agencyId, { take: 200, activeOnly: false }),
        data.visits(agencyId, { from: new Date(0), take: 200 }),
        data.deals(agencyId),
        data.openCommissions(agencyId, 50),
      ]);
      const snap = dealerPerformance({
        periodLabel: 'Current CRM',
        leads,
        visits,
        deals: deals.map((d) => ({ stage: d.pipelineStage, value: d.value ?? 0 })),
        commissions: commissions.map((c) => ({
          amount: c.fixedAmount ?? (c.percentage != null && c.dealValue != null ? Math.round((c.percentage * c.dealValue) / 100) : null),
          status: c.paymentStatus,
        })),
      });
      return {
        tool: call.tool,
        records: [{
          type: 'metric',
          id: 'performance',
          label: 'Dealer performance',
          href: '/dealer/performance',
          fields: {
            leads: snap.funnel.lead,
            visits: snap.funnel.visit,
            negotiation: snap.funnel.negotiation,
            pipelineValueInr: snap.pipelineValue,
            expectedCommissionInr: snap.expectedCommission,
          },
        }],
        summary: snap.dropOffNote,
        missing: [],
        rules: ['Same aggregator as the Performance page. No invented conversion percentiles.'],
      };
    }
    case 'get_dealer_specialization': {
      const properties = await data.activeProperties(agencyId, { take: 80 });
      const spec = learnSpecialization(
        properties.map((p) => ({
          locality: p.locality,
          configuration: p.bedrooms != null ? `${p.bedrooms}BHK` : '',
          propertyType: p.propertyType,
          budgetBand: budgetBand(p.priceAmount),
          transaction: 'sale',
        })),
        'Current inventory',
      );
      return {
        tool: call.tool,
        records: [{
          type: 'metric',
          id: 'specialization',
          label: spec.ready ? spec.strongestLocality ?? 'Specialization' : 'Not enough activity',
          href: '/dealer/passport',
          fields: {
            ready: spec.ready,
            strongestLocality: spec.strongestLocality,
            typicalConfiguration: spec.typicalConfiguration,
            sampleSize: spec.sampleSize,
          },
        }],
        summary: spec.note,
        missing: spec.ready ? [] : [spec.note],
      };
    }
    case 'get_assignment_capacity': {
      return {
        tool: call.tool,
        records: [],
        summary: 'Assignment capacity is recorded on the builder portal, not as a dealer CRM metric.',
        missing: ['No assignment-capacity row on this live dealer account.'],
      };
    }
    case 'prepare_lead_update': {
      const found = await resolveLeadByName(data, agencyId, call.args.leadName);
      if (!('lead' in found) || !found.lead) {
        return { tool: call.tool, records: (found.candidates ?? []).map((l) => leadRecord(l)), summary: found.question, missing: [], followUpQuestion: found.question };
      }
      return {
        tool: call.tool,
        records: [leadRecord(found.lead)],
        summary: `Lead update proposal for ${found.lead.name}. Copilot will not write the note until you edit it on the lead page.`,
        missing: [],
        proposal: {
          kind: 'open_page',
          leadId: found.lead.id,
          leadName: found.lead.name,
          dueAt: now.toISOString(),
          note: call.args.note,
          label: `Open ${found.lead.name} to apply this note`,
          href: `/dealer/leads/${found.lead.id}`,
          requiresConfirmation: true,
        },
      };
    }
    case 'prepare_property_update': {
      const rows = await data.activeProperties(agencyId, { query: call.args.query, locality: call.args.query, take: 5 });
      if (!rows.length) {
        return { tool: call.tool, records: [], summary: 'Mujhe CRM mein is waqt koi matching record nahi mila.', missing: [] };
      }
      const p = rows[0];
      return {
        tool: call.tool,
        records: [propertyRecord(p, now)],
        summary: `Property update proposal for ${p.title}. Inventory status Copilot se change nahi hoga.`,
        missing: [],
        proposal: {
          kind: 'open_page',
          leadId: '',
          leadName: p.title,
          dueAt: now.toISOString(),
          note: call.args.note,
          label: `Open ${p.title}`,
          propertyId: p.id,
          propertyTitle: p.title,
          href: `/dealer/inventory/${p.id}`,
          requiresConfirmation: true,
        },
      };
    }
    case 'prepare_deal_stage_update': {
      return {
        tool: call.tool,
        records: [],
        summary: 'Deal stage Copilot se close nahi hota. Open the deal page to change stage after you confirm there.',
        missing: [],
        proposal: {
          kind: 'open_page',
          leadId: '',
          leadName: call.args.query,
          dueAt: now.toISOString(),
          note: call.args.stage,
          label: 'Open deals',
          href: '/dealer/deals',
          requiresConfirmation: true,
        },
      };
    }
    case 'prepare_assignment': {
      return {
        tool: call.tool,
        records: [],
        summary: 'Builder-lead accept/decline Copilot se execute nahi hota. Open Builder leads.',
        missing: [],
        proposal: {
          kind: 'open_page',
          leadId: '',
          leadName: 'Builder leads',
          dueAt: now.toISOString(),
          label: 'Open builder leads',
          href: '/dealer/builder-leads',
          requiresConfirmation: true,
        },
      };
    }
    case 'prepare_collaboration_request': {
      return {
        tool: call.tool,
        records: [],
        summary: `Collaboration request for ${call.args.dealerName} — open Network to send it. Copilot invite nahi bhejega.`,
        missing: [],
        proposal: {
          kind: 'open_page',
          leadId: '',
          leadName: call.args.dealerName,
          dueAt: now.toISOString(),
          note: call.args.note,
          label: 'Open network',
          href: '/dealer/network',
          requiresConfirmation: true,
        },
      };
    }
  }
}
