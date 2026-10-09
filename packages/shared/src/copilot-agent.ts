import { computeMatch } from './matching';
import { scoreBuyerIntent, type IntentFeatures } from './intent-score';
import { dealerPerformance } from './dealer-performance';
import { learnSpecialization, budgetBand } from './dealer-specialization';
import { formatInr, routeCopilotQuestion } from './copilot-tools';
import type {
  CopilotActionProposal,
  CopilotBlock,
  CopilotEvidence,
  CopilotToolActivity,
} from './copilot-tools';
import type {
  CopilotAnswer,
  CopilotCard,
  CopilotLead,
  CopilotProperty,
  CopilotProposal,
  CopilotSnapshot,
} from './copilot-mock';

export interface AgentMemory {
  lastLeadId?: string;
  lastLeadName?: string;
  lastPropertyIds: string[];
  lastSelectedPropertyId?: string;
  summary: string;
  pageEntityName?: string;
  pageEntityType?: 'lead' | 'property' | 'deal' | 'visit';
}

export function emptyAgentMemory(): AgentMemory {
  return { lastPropertyIds: [], summary: '' };
}

export interface DemoAgentAnswer extends CopilotAnswer {
  blocks: CopilotBlock[];
  toolActivity: CopilotToolActivity[];
  structuredEvidence: CopilotEvidence[];
  memory: AgentMemory;
}

function inr(n: number) {
  return formatInr(n);
}

function features(lead: CopilotLead): IntentFeatures {
  return {
    recentEnquiry: /new|enquiry/i.test(lead.status),
    propertyViews: lead.views ?? 0,
    siteVisits: lead.visitCount ?? 0,
    attendedVisits: lead.attendedCount ?? 0,
    savedProperties: lead.savedCount ?? 0,
    followUpEngaged: /today|overdue/i.test(lead.followUp ?? ''),
    timelineUrgent: /this month|immediate|2 weeks|1 month/i.test(lead.timeline ?? ''),
    negotiation: /negot/i.test(lead.status),
    repeatViews: lead.repeatViews ?? 0,
  };
}

function leadMatches(data: CopilotSnapshot, token: string): CopilotLead[] {
  const q = token.trim().toLowerCase();
  if (!q) return [];
  return data.leads.filter((l) => l.name.toLowerCase().includes(q) || l.id === token);
}

function resolveName(question: string, memory: AgentMemory, data: CopilotSnapshot): { leads: CopilotLead[]; token?: string; ambiguous?: boolean } {
  const lowered = question.toLowerCase();
  if (/\b(uske|uska|uski|usko|that buyer|this buyer)\b/.test(lowered) && memory.lastLeadId) {
    const lead = data.leads.find((l) => l.id === memory.lastLeadId);
    if (lead) return { leads: [lead], token: lead.name };
  }
  if (memory.pageEntityType === 'lead' && memory.pageEntityName && /is buyer|is lead/.test(lowered)) {
    return { leads: leadMatches(data, memory.pageEntityName), token: memory.pageEntityName };
  }
  const hindi = question.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:ko|ka|ki|ke)\b/);
  const named = hindi?.[1] ?? question.match(/\b([A-Z][a-z]{2,})\b/)?.[1];
  if (!named) return { leads: [], token: undefined };
  const hits = leadMatches(data, named);
  if (hits.length > 1) return { leads: hits, token: named, ambiguous: true };
  return { leads: hits, token: named };
}

function ordinalIndex(question: string): number | null {
  const q = question.toLowerCase();
  if (/pehli|first|1st/.test(q)) return 0;
  if (/second|dusri|2nd/.test(q)) return 1;
  if (/third|tisri|3rd/.test(q)) return 2;
  return null;
}

function matchLeadProperties(lead: CopilotLead, properties: CopilotProperty[]) {
  return properties
    .filter((p) => /active/i.test(p.status))
    .map((p) => {
      const result = computeMatch(
        {
          localities: [lead.locality],
          bedroomsMin: lead.beds ?? null,
          bedroomsMax: lead.beds ?? null,
          budgetMax: lead.budgetMax ?? null,
          propertyTypes: undefined,
        },
        {
          locality: p.locality,
          bedrooms: p.beds ?? null,
          priceAmount: p.price,
          listingStatus: /active/i.test(p.status) ? 'active' : p.status.toLowerCase(),
          propertyType: undefined,
        },
      );
      const why = Object.entries(result.breakdown)
        .filter(([, v]) => v !== 'unknown' && v >= 70)
        .map(([k, v]) => `${k}: ${v}`);
      return { property: p, percent: result.matchPercent, why, explanation: result.explanation };
    })
    .sort((a, b) => b.percent - a.percent);
}

function toneForFollowUp(followUp?: string): CopilotBlock['tone'] {
  if (/overdue/i.test(followUp ?? '')) return 'critical';
  if (/today/i.test(followUp ?? '')) return 'warn';
  return 'info';
}

function rewrite(question: string, memory: AgentMemory): string {
  let q = question;
  if (memory.lastLeadName) {
    q = q.replace(/\b(uske|uska|uski|usko)\b/gi, memory.lastLeadName);
  }
  if (memory.pageEntityName && /is (buyer|lead|property|deal|visit)/i.test(q)) {
    q = `${memory.pageEntityName} ${q}`;
  }
  return q;
}

function activity(tool: string, label: string): CopilotToolActivity {
  return { tool, label };
}

function evidenceOf(lead?: CopilotLead, property?: CopilotProperty): CopilotEvidence[] {
  const out: CopilotEvidence[] = [];
  if (lead) out.push({ entityType: 'lead', entityId: lead.id, reason: 'Named buyer record', href: `/dealer/leads/${lead.id}` });
  if (property) out.push({ entityType: 'property', entityId: property.id, reason: 'Inventory record', href: `/dealer/inventory/${property.id}` });
  return out;
}

function toCards(blocks: CopilotBlock[]): CopilotCard[] {
  return blocks.map((b) => ({ title: b.title, detail: [b.body, ...(b.meta ?? [])].filter(Boolean).join(' · '), href: b.href }));
}

export function runDemoAgent(question: string, data: CopilotSnapshot, memoryInput?: Partial<AgentMemory>): DemoAgentAnswer {
  const memory: AgentMemory = { ...emptyAgentMemory(), ...memoryInput, lastPropertyIds: memoryInput?.lastPropertyIds ?? [] };
  const raw = question.trim();
  const q = rewrite(raw, memory);
  const lowered = q.toLowerCase();
  const tools: CopilotToolActivity[] = [];
  const namedFromRaw = resolveName(raw, memory, data);
  const named = namedFromRaw.leads.length || namedFromRaw.ambiguous ? namedFromRaw : resolveName(q, memory, data);

  if (named.ambiguous) {
    return finish(
      `Aap ${named.leads.map((l) => l.name).join(' ki baat kar rahe hain ya ')} ki? CRM mein more than one ${named.token} mila. Guess nahi karunga.`,
      named.leads.map((l) => ({
        title: l.name,
        body: `${l.locality} · ${l.status} · ${l.summary ?? 'requirement on file'}`,
        href: `/dealer/leads/${l.id}`,
        actions: [{ label: 'Open buyer', href: `/dealer/leads/${l.id}` }],
      })),
      [activity('search_leads', 'Searching buyers...')],
      named.leads.flatMap((l) => evidenceOf(l)),
      memory,
    );
  }

  const ordinal = ordinalIndex(lowered);
  if (ordinal != null && memory.lastPropertyIds.length && (/message|draft|visit|pitch/.test(lowered) || /wali/.test(lowered))) {
    const property = data.properties.find((p) => p.id === memory.lastPropertyIds[ordinal]);
    const lead = data.leads.find((l) => l.id === memory.lastLeadId) ?? named.leads[0];
    if (!property) {
      return finish('Us list mein itni properties nahi thi. Pehle matching dubara chalao.', [], tools, [], memory);
    }
    tools.push(activity('get_property', 'Checking matching inventory...'));
    if (/visit/.test(lowered)) {
      tools.push(activity('propose_site_visit', 'Preparing a visit proposal...'));
      const proposal: CopilotProposal = { kind: 'site_visit', leadId: lead?.id ?? '', label: `Schedule visit: ${lead?.name ?? 'buyer'} × ${property.title}` };
      return finish(
        `Proposed visit: ${lead?.name ?? 'buyer'} · ${property.title}. Confirm ke baad demo calendar update hoga. WhatsApp send nahi hoga.`,
        [{ title: property.title, body: `${property.locality} · ${inr(property.price)} · kal 5:00 PM (requested)`, href: `/dealer/inventory/${property.id}`, actions: [{ label: 'Confirm & schedule', prompt: '__confirm__' }] }],
        tools,
        evidenceOf(lead, property),
        { ...memory, lastPropertyIds: memory.lastPropertyIds, lastSelectedPropertyId: property.id },
        { proposal, extraProposal: { kind: 'site_visit', leadId: lead?.id ?? '', leadName: lead?.name ?? '', dueAt: 'tomorrow-17:00', propertyId: property.id, propertyTitle: property.title, label: proposal.label } },
      );
    }
    tools.push(activity('draft_follow_up', 'Drafting a message...'));
    const draft = `Hi ${lead?.name.split(' ')[0] ?? 'there'}, sharing ${property.title} (${property.locality}, ${inr(property.price)}) against your recorded ${lead?.summary ?? 'requirement'}. — Demo draft`;
    return finish(
      'AI suggestion based on recorded CRM information. EstateFlow send nahi karega.',
      [{ title: 'Suggested message', body: draft, href: lead ? `/dealer/leads/${lead.id}` : undefined }],
      tools,
      evidenceOf(lead, property),
      { ...memory, lastSelectedPropertyId: property.id },
      { draft },
    );
  }

  if (/drop|kaha drop|journey/.test(lowered) && named.leads[0]) {
    const lead = named.leads[0];
    tools.push(activity('get_lead', 'Reading recorded journeys...'));
    if (!lead.journeys?.length) {
      return finish('Enough CRM data nahi hai.', [{ title: lead.name, body: 'Koi drop-off journey recorded nahi hai.', href: `/dealer/leads/${lead.id}` }], tools, evidenceOf(lead), { ...memory, lastLeadId: lead.id, lastLeadName: lead.name });
    }
    const blocks = lead.journeys.map((j) => ({
      title: j.property,
      body: `${j.stages.join(' → ')}${j.stop ? ` → ${j.stop}` : ''}`,
      href: `/dealer/leads/${lead.id}`,
    }));
    const stops = lead.journeys.map((j) => j.stop).filter(Boolean);
    const pattern = stops.length
      ? `Pattern: recent recorded drop-offs mostly ${[...new Set(stops)].join('/')} concerns par hue — sirf stored journeys se.`
      : 'Journeys recorded hain, ek common stop nahi nikal saka.';
    return finish(pattern, blocks, tools, evidenceOf(lead), { ...memory, lastLeadId: lead.id, lastLeadName: lead.name });
  }

  if (/pitch|kaise pitch|talking point/.test(lowered) && (named.leads[0] || memory.lastLeadId)) {
    const lead = named.leads[0] ?? data.leads.find((l) => l.id === memory.lastLeadId);
    if (!lead) return finish('CRM mein enough information nahi hai.', [], tools, [], memory);
    tools.push(activity('get_lead', 'Reading requirement and objections...'));
    const highlights = [lead.summary, lead.locality, lead.budgetMax ? `budget ${inr(lead.budgetMax)}` : null].filter(Boolean) as string[];
    return finish(
      'AI suggestion based on recorded CRM information.',
      [
        { title: 'Buyer ke liye highlight karein', body: highlights.join(' · ') || 'Sirf stored requirement use karein.' },
        { title: 'Avoid', body: lead.objection ? `${lead.objection} invent mat karo jo record mein nahi.` : 'Unrecorded psychology invent mat karo.' },
        { title: 'Suggested pitch', body: `Namaste ${lead.name.split(' ')[0]} ji, aapke ${lead.locality} ${lead.summary ?? 'requirement'} ke hisaab se options ready hain.` },
      ],
      tools,
      evidenceOf(lead),
      { ...memory, lastLeadId: lead.id, lastLeadName: lead.name },
    );
  }

  const routed = routeCopilotQuestion(q);

  if ((routed?.tool === 'find_matches' || /best propert|matching|unke liye|uske liye|liye property|ke liye.*propert/.test(lowered) || (/propert/.test(lowered) && /dhoond|find|match/.test(lowered) && (named.leads[0] || memory.lastLeadId))) && (named.leads[0] || memory.lastLeadId)) {
    const lead = named.leads[0] ?? data.leads.find((l) => l.id === memory.lastLeadId);
    if (!lead) return finish('CRM mein enough information nahi hai.', [], tools, [], memory);
    tools.push(activity('get_lead', 'Reading the buyer...'), activity('find_matches', 'Checking matching inventory...'));
    const ranked = matchLeadProperties(lead, data.properties).slice(0, 3);
    if (!ranked.length) {
      return finish(`Koi active listing ${lead.name} ke recorded locality/budget/BHK se match nahi karti.`, [], tools, evidenceOf(lead), { ...memory, lastLeadId: lead.id, lastLeadName: lead.name, lastPropertyIds: [] });
    }
    const blocks: CopilotBlock[] = ranked.map((row) => ({
      title: `${row.percent}%  ${row.property.title}`,
      body: `${inr(row.property.price)} · ${row.property.beds ?? '—'} BHK · ${row.property.status}`,
      meta: row.why.length ? row.why : [row.explanation],
      href: `/dealer/inventory/${row.property.id}`,
      matchPercent: row.percent,
      matchWhy: row.why,
      actions: [
        { label: 'Open property', href: `/dealer/inventory/${row.property.id}` },
        { label: 'Draft message', prompt: `${lead.name} ko ${row.property.title} ka message draft karo` },
      ],
    }));
    return finish(
      `${lead.name} ke liye ${ranked.length} matches — percentage existing matching engine se aaya, model se nahi.`,
      blocks,
      tools,
      evidenceOf(lead, ranked[0]?.property),
      { ...memory, lastLeadId: lead.id, lastLeadName: lead.name, lastPropertyIds: ranked.map((r) => r.property.id) },
    );
  }

  if (routed?.tool === 'get_builder_leads' || (/builder/.test(lowered) && /lead/.test(lowered))) {
    tools.push(activity('get_builder_leads', 'Reading builder assignments...'));
    const rows = data.builderLeads ?? [];
    const open = rows.filter((r) => r.status === 'assigned');
    if (!open.length) {
      return finish('Is demo workspace mein koi new builder lead assigned nahi hai.', [], tools, [], memory);
    }
    return finish(
      `${open.length} builder lead${open.length === 1 ? '' : 's'} assigned. Buyer contact accept ke baad dikhega.`,
      open.map((r) => ({
        title: `${r.configuration} · ${r.locality}`,
        body: `${r.projectName} · ${r.requirementNote}`,
        href: '/dealer/builder-leads',
        actions: [{ label: 'Open builder leads', href: '/dealer/builder-leads' }],
      })),
      tools,
      open.map((r) => ({ entityType: 'builder_lead' as const, entityId: r.assignmentId, reason: 'Demo builder assignment', href: '/dealer/builder-leads' })),
      memory,
    );
  }

  if (routed?.tool === 'pending_commissions' || /commission/.test(lowered)) {
    tools.push(activity('pending_commissions', 'Reading commission agreements...'));
    const pending = data.commissions.filter((c) => !/paid/i.test(c.status));
    if (!pending.length) {
      return finish('No commission amounts are recorded in this demo workspace. Not recorded — do not assume a percentage.', [], tools, [], memory);
    }
    const total = pending.reduce((s, c) => s + (c.amount ?? 0), 0);
    return finish(
      `Pending demo commissions total ${inr(total)}, summed only from records that store an amount.`,
      pending.map((c) => ({
        title: c.dealTitle,
        body: c.amount == null ? 'Amount not recorded' : `${inr(c.amount)} · ${c.status}`,
        href: '/dealer/deals/commissions',
      })),
      tools,
      pending.map((c) => ({ entityType: 'commission' as const, entityId: c.id, reason: 'Stored commission row', href: '/dealer/deals/commissions' })),
      memory,
    );
  }

  if (
    !( /visit/.test(lowered) && /schedule|propose/.test(lowered) && (named.leads[0] || memory.lastLeadId) ) &&
    (routed?.tool === 'list_visits' || (/visit/.test(lowered) && !/schedule|propose/.test(lowered)))
  ) {
    tools.push(activity('list_visits', 'Checking site visits...'));
    const upcoming = data.visits.filter((v) => /tomorrow|kal|today/i.test(v.when));
    return finish(
      upcoming.length ? 'Ye visits demo calendar text se aayi hain — live booking feed nahi.' : 'No demo visits are marked for today or tomorrow.',
      upcoming.map((v) => ({ title: v.propertyTitle, body: `${v.buyerName} · ${v.when} · ${v.status}`, href: '/dealer/site-visits', actions: [{ label: 'Open visit', href: '/dealer/site-visits' }] })),
      tools,
      upcoming.map((v) => ({ entityType: 'visit' as const, entityId: v.id, reason: 'Demo visit row', href: '/dealer/site-visits' })),
      memory,
    );
  }

  if (routed?.tool === 'pipeline_summary' || /deal/.test(lowered)) {
    tools.push(activity('pipeline_summary', 'Reading deals...'));
    const open = data.deals.filter((d) => !/closed|lost/i.test(d.stage));
    const stuck = open.filter((d) => /negot/i.test(d.stage));
    return finish(
      open.length ? `${open.length} open deals. Stuck = negotiation stage on file, purchase prediction nahi.` : 'No deals recorded.',
      (stuck.length ? stuck : open).map((d) => ({ title: d.title, body: `${d.stage} · ${inr(d.value)}`, href: '/dealer/deals' })),
      tools,
      open.slice(0, 5).map((d) => ({ entityType: 'deal' as const, entityId: d.id, reason: 'Demo deal', href: '/dealer/deals' })),
      memory,
    );
  }

  if (routed?.tool === 'search_inventory' || (/\b(dhoond|dhund|search|find)\b/.test(lowered) && /bhk|crore|\bcr\b|property/.test(lowered)) || (/bhk/.test(lowered) && /crore|\bcr\b|lakh/.test(lowered))) {
    tools.push(activity('search_inventory', 'Searching inventory...'));
    const locality = q.match(/\b(dwarka|janakpuri|koramangala|hsr|indiranagar|whitefield|yelahanka|palam|uttam nagar)\b/i)?.[1];
    const beds = lowered.match(/(\d)\s*bhk/)?.[1];
    const crore = lowered.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore)/);
    const maxPrice = crore ? Math.round(parseFloat(crore[1]) * 1_00_00_000) : undefined;
    const hits = data.properties.filter((p) => {
      if (locality && !p.locality.toLowerCase().includes(locality.toLowerCase())) return false;
      if (beds && p.beds !== Number(beds)) return false;
      if (maxPrice && p.price > maxPrice) return false;
      return true;
    });
    memory.lastPropertyIds = hits.map((p) => p.id);
    return finish(
      hits.length ? `${hits.length} demo listing${hits.length === 1 ? '' : 's'} in current filters. Draft listings availability-confirmed nahi.` : 'No demo listings match those filters.',
      hits.map((p) => ({
        title: p.title,
        body: `${p.locality} · ${inr(p.price)} · ${p.beds ?? '—'} BHK · ${p.status}`,
        href: `/dealer/inventory/${p.id}`,
        actions: [{ label: 'Open property', href: `/dealer/inventory/${p.id}` }, { label: 'Matching buyers', prompt: `Is property ke matching buyers dhoondo: ${p.title}` }],
      })),
      tools,
      hits.map((p) => ({ entityType: 'property' as const, entityId: p.id, reason: 'Filtered listing', href: `/dealer/inventory/${p.id}` })),
      memory,
    );
  }

  if (/matching buyers|is property/.test(lowered) && (memory.pageEntityType === 'property' || /dhoondo/.test(lowered))) {
    tools.push(activity('find_matches', 'Matching buyers to this listing...'));
    const token = memory.pageEntityName ?? q;
    const property = data.properties.find((p) => token.toLowerCase().includes(p.title.toLowerCase()) || p.id === memory.lastPropertyIds[0]) ?? data.properties[0];
    if (!property) return finish('Koi listing context nahi mila.', [], tools, [], memory);
    const buyers = data.leads.filter((l) => l.locality.toLowerCase() === property.locality.toLowerCase() && (l.beds == null || property.beds == null || l.beds === property.beds));
    return finish(
      buyers.length ? `${buyers.length} buyers same locality${property.beds ? ` / ${property.beds} BHK` : ''} par.` : 'Is listing ke liye koi recorded buyer match nahi.',
      buyers.map((l) => ({ title: l.name, body: `${l.summary ?? l.locality} · ${l.status}`, href: `/dealer/leads/${l.id}` })),
      tools,
      evidenceOf(buyers[0], property),
      memory,
    );
  }

  if ((routed?.tool === 'draft_follow_up' || /draft|message/.test(lowered)) && (named.leads[0] || memory.lastLeadId)) {
    const lead = named.leads[0] ?? data.leads.find((l) => l.id === memory.lastLeadId);
    if (!lead) return finish('There is no demo lead to draft against.', [], tools, [], memory);
    tools.push(activity('draft_follow_up', 'Drafting a follow-up...'));
    const property = data.properties.find((p) => p.id === memory.lastPropertyIds[0]);
    const draft = `Hi ${lead.name.split(' ')[0]}, sharing a quick follow-up on your ${lead.locality} search${property ? ` — ${property.title}` : ''}. Happy to line up options that fit what you noted. — Demo draft`;
    return finish(
      'Simulated draft only. It has not been sent on WhatsApp, Instagram, or Messenger.',
      [{ title: 'Suggested message', body: draft, href: `/dealer/leads/${lead.id}`, actions: [{ label: 'Copy' }, { label: 'Edit' }] }],
      tools,
      evidenceOf(lead, property),
      { ...memory, lastLeadId: lead.id, lastLeadName: lead.name },
      { draft },
    );
  }

  if ((routed?.tool === 'propose_follow_up' || (/follow-up/.test(lowered) && /create|set|lagao|bana/.test(lowered))) && named.leads[0]) {
    const lead = named.leads[0];
    tools.push(activity('propose_follow_up', 'Preparing a follow-up proposal...'));
    const due = /\baaj\b|today/.test(lowered) ? 'Today 4:00 PM' : 'Tomorrow 4:00 PM';
    return finish(
      `Follow-up ready for ${lead.name} · ${due}. Confirm ke baad demo CRM update hoga.`,
      [{ title: 'Follow-up ready', body: `${lead.name} · ${due} · ${lead.summary ?? lead.locality}`, href: `/dealer/leads/${lead.id}` }],
      tools,
      evidenceOf(lead),
      { ...memory, lastLeadId: lead.id, lastLeadName: lead.name },
      { extraProposal: { kind: 'follow_up', leadId: lead.id, leadName: lead.name, dueAt: due, label: `Create follow-up for ${lead.name}` }, proposal: { kind: 'follow_up', leadId: lead.id, label: `Create follow-up for ${lead.name}` } },
    );
  }

  if ((routed?.tool === 'propose_site_visit' || (/visit/.test(lowered) && /schedule|propose/.test(lowered))) && (named.leads[0] || memory.lastLeadId)) {
    const lead = named.leads[0] ?? data.leads.find((l) => l.id === memory.lastLeadId);
    if (!lead) return finish('Koi demo lead nahi mili.', [], tools, [], memory);
    tools.push(activity('propose_site_visit', 'Preparing a visit proposal...'));
    const ranked = matchLeadProperties(lead, data.properties);
    const property = data.properties.find((p) => p.id === memory.lastSelectedPropertyId) ?? ranked[0]?.property;
    const conflicts = data.visits.filter((v) => v.buyerName === lead.name && /5:00|5 PM/i.test(v.when));
    if (conflicts.length) {
      return finish(`5 PM conflict hai for ${lead.name}. Recorded slot: ${conflicts.map((v) => v.when).join(', ')}. Invented availability nahi dikhai.`, [], tools, evidenceOf(lead), memory);
    }
    return finish(
      `Proposed demo site visit for ${lead.name}${property ? ` at ${property.title}` : ''}. Confirm ke baad record banega.`,
      [{ title: lead.name, body: `${property?.title ?? lead.locality} · kal 5:00 PM`, href: '/dealer/site-visits/new' }],
      tools,
      evidenceOf(lead, property),
      { ...memory, lastLeadId: lead.id, lastLeadName: lead.name, lastPropertyIds: property ? [property.id] : memory.lastPropertyIds },
      { extraProposal: { kind: 'site_visit', leadId: lead.id, leadName: lead.name, dueAt: 'Tomorrow 5:00 PM', propertyId: property?.id, propertyTitle: property?.title, label: `Create site visit for ${lead.name}` }, proposal: { kind: 'site_visit', leadId: lead.id, label: `Create site visit for ${lead.name}` } },
    );
  }

  if (routed?.tool === 'get_dealer_performance' || /performance|conversion/.test(lowered)) {
    tools.push(activity('get_dealer_performance', 'Aggregating recorded funnel...'));
    const snap = dealerPerformance({
      periodLabel: 'Demo workspace',
      leads: data.leads,
      visits: data.visits,
      deals: data.deals,
      commissions: data.commissions,
    });
    return finish(
      snap.dropOffNote,
      [{ title: 'Funnel', body: `Leads ${snap.funnel.lead} · visits ${snap.funnel.visit} · negotiation ${snap.funnel.negotiation}`, href: '/dealer/performance' }],
      tools,
      [{ entityType: 'metric', entityId: 'performance', reason: 'Same aggregator as Performance page', href: '/dealer/performance' }],
      memory,
    );
  }

  if (routed?.tool === 'get_network_dealers' || /network/.test(lowered)) {
    tools.push(activity('get_network_dealers', 'Reading network rows...'));
    const rows = data.network ?? [];
    return finish(
      rows.length ? `${rows.length} demo network contacts.` : 'Koi network dealer recorded nahi hai.',
      rows.map((n) => ({ title: n.name, body: `${n.agency} · ${n.areas}`, href: '/dealer/network' })),
      tools,
      rows.map((n) => ({ entityType: 'network' as const, entityId: n.id, reason: 'Demo network row', href: '/dealer/network' })),
      memory,
    );
  }

  if (/serious|hot buyers|3bhk buyers/.test(lowered)) {
    tools.push(activity('search_leads', 'Scoring recorded intent...'));
    const beds = lowered.match(/(\d)\s*bhk/)?.[1];
    const locality = lowered.match(/\b(dwarka|janakpuri)\b/)?.[1];
    const rows = data.leads
      .filter((l) => (beds ? l.beds === Number(beds) : true) && (locality ? l.locality.toLowerCase().includes(locality) : true))
      .map((l) => ({ lead: l, intent: scoreBuyerIntent(features(l), { demo: true }) }))
      .sort((a, b) => b.intent.score - a.intent.score);
    const serious = rows.filter((r) => r.intent.score >= 5);
    return finish(
      serious.length ? `Recorded intent 0–10 (rules, purchase guarantee nahi). ${serious.length} buyers ≥ 5.` : 'Is filter par koi buyer 5/10 se upar nahi.',
      (serious.length ? serious : rows).slice(0, 6).map((r) => ({
        title: `${r.lead.name} · ${r.intent.score.toFixed(1)}/10`,
        body: r.intent.disclaimer,
        href: `/dealer/leads/${r.lead.id}`,
      })),
      tools,
      rows.slice(0, 3).flatMap((r) => evidenceOf(r.lead)),
      memory,
    );
  }

  if (named.leads[0] || routed?.tool === 'get_lead') {
    const lead = named.leads[0];
    if (!lead) return finish('Mujhe CRM mein is waqt koi matching record nahi mila.', [], [activity('get_lead', 'Searching buyers...')], [], memory);
    tools.push(activity('get_lead', 'Reading the buyer...'));
    const intent = scoreBuyerIntent(features(lead), { demo: true });
    const spec = learnSpecialization(
      data.leads.map((l) => ({
        locality: l.locality,
        configuration: l.beds ? `${l.beds}BHK` : '',
        propertyType: 'flat',
        budgetBand: budgetBand(l.budgetMax),
        transaction: 'sale',
      })),
      'Demo',
    );
    void spec;
    const blocks: CopilotBlock[] = [
      { title: 'Buyer', body: `${lead.name} · ${lead.status} · ${lead.phone ?? 'phone on file'}`, href: `/dealer/leads/${lead.id}`, actions: [{ label: `Open ${lead.name.split(' ')[0]}`, href: `/dealer/leads/${lead.id}` }, { label: 'Draft follow-up', prompt: `${lead.name} ko follow-up message draft karo` }] },
      { title: 'Requirement', body: `${lead.beds ? `${lead.beds} BHK` : 'BHK not recorded'} · ${lead.locality} · ${lead.budgetMax ? inr(lead.budgetMax) : 'budget not recorded'}` },
      { title: 'Current intent/engagement', body: `${intent.score.toFixed(1)}/10 — ${intent.disclaimer}` },
      { title: 'Activity', body: `${lead.views ?? 0} views · ${lead.visitCount ?? 0} visits · ${lead.attendedCount ?? 0} attended · ${lead.savedCount ?? 0} saved` },
      { title: 'Known objections', body: lead.objection ?? 'Koi objection recorded nahi hai.' },
      { title: 'Best next action', body: /overdue|today/i.test(lead.followUp ?? '') ? `Follow-up (${lead.followUp}) — date CRM mein stored hai.` : `Stage ${lead.status}. Unrecorded next step invent nahi kiya.` },
    ];
    return finish(
      `${lead.name} demo CRM record. ${lead.followUp ? `Follow-up: ${lead.followUp}.` : ''} Intent rules se hai, purchase prediction nahi.`,
      blocks,
      tools,
      evidenceOf(lead),
      { ...memory, lastLeadId: lead.id, lastLeadName: lead.name },
    );
  }

  if (routed?.tool === 'prioritize_calls' || /kisko pehle|call karun|kaun hot/.test(lowered)) {
    tools.push(activity('prioritize_calls', 'Ranking follow-ups...'));
    const ranked = [...data.leads]
      .filter((l) => !/lost|won|archived/i.test(l.status))
      .sort((a, b) => {
        const rank = (l: CopilotLead) => (/overdue/i.test(l.followUp ?? '') ? 0 : /today/i.test(l.followUp ?? '') ? 1 : /negot/i.test(l.status) ? 2 : 3);
        return rank(a) - rank(b);
      })
      .slice(0, 6);
    const blocks: CopilotBlock[] = ranked.map((l, i) => ({
      tone: toneForFollowUp(l.followUp),
      title: `${i + 1}. ${l.name}`,
      body: `${l.followUp ?? 'No follow-up date'} · ${l.summary ?? l.locality}`,
      meta: [`Last recorded stage: ${l.status}`, l.visitCount ? `Recent visits: ${l.visitCount}` : 'Visit count not recorded'],
      href: `/dealer/leads/${l.id}`,
      actions: [{ label: `Open ${l.name.split(' ')[0]}`, href: `/dealer/leads/${l.id}` }, { label: 'Draft follow-up', prompt: `${l.name} ko follow-up message draft karo` }],
    }));
    return finish(
      `Meri recommendation: ${ranked[0]?.name ?? 'kisi recorded lead'} se pehle baat karo. Ye overdue/today/negotiation order hai — purchase guarantee nahi.`,
      blocks,
      tools,
      ranked.slice(0, 3).flatMap((l) => evidenceOf(l)),
      { ...memory, lastLeadId: ranked[0]?.id, lastLeadName: ranked[0]?.name },
    );
  }

  if (routed?.tool === 'daily_brief' || /aaj kya|aaj ka scene|kya karna/.test(lowered)) {
    tools.push(activity('daily_brief', 'Reading today\'s follow-ups and visits...'));
    const due = data.leads.filter((l) => /today|overdue/i.test(l.followUp ?? ''));
    const visits = data.visits.filter((v) => /today|tomorrow|kal/i.test(v.when));
    const blocks: CopilotBlock[] = [
      ...due.map((l, i) => ({
        tone: toneForFollowUp(l.followUp),
        title: `${i + 1}. ${l.name}`,
        body: `${l.followUp ?? ''} · ${l.summary ?? l.locality}`,
        href: `/dealer/leads/${l.id}`,
        actions: [{ label: `Open ${l.name.split(' ')[0]}`, href: `/dealer/leads/${l.id}` }, { label: 'Draft follow-up', prompt: `${l.name} ko follow-up message draft karo` }],
      })),
      ...visits.slice(0, 4).map((v) => ({
        tone: 'warn' as const,
        title: v.propertyTitle,
        body: `${v.buyerName} · ${v.when} · ${v.status}`,
        href: '/dealer/site-visits',
        actions: [{ label: 'Open visit', href: '/dealer/site-visits' }],
      })),
    ];
    return finish(
      due.length || visits.length
        ? `Aaj ${due.length} follow-up${due.length === 1 ? '' : 's'} aur ${visits.length} visit records hain.`
        : 'The demo CRM has no follow-ups due today and no upcoming visits.',
      blocks,
      tools,
      [...due.slice(0, 3).flatMap((l) => evidenceOf(l))],
      { ...memory, lastLeadId: due[0]?.id, lastLeadName: due[0]?.name },
      due[0] ? { proposal: { kind: 'follow_up', leadId: due[0].id, label: `Mark ${due[0].name} follow-up as done` } } : undefined,
    );
  }

  tools.push(activity('search_leads', 'Checking whether a tool fits...'));
  return finish(
    'Main aaj ke follow-ups, inventory search, visits, commissions, builder leads, ya drafts kar sakta hoon — sirf is browser ke demo records se.',
    [],
    tools,
    [],
    memory,
  );
}

function finish(
  text: string,
  blocks: CopilotBlock[],
  toolActivity: CopilotToolActivity[],
  structuredEvidence: CopilotEvidence[],
  memory: AgentMemory,
  extra?: {
    draft?: string;
    proposal?: CopilotProposal;
    extraProposal?: CopilotActionProposal;
  },
): DemoAgentAnswer {
  const next: AgentMemory = { ...memory, summary: text.slice(0, 180) };
  return {
    mode: 'demo',
    simulated: true,
    text,
    cards: toCards(blocks),
    evidence: structuredEvidence.map((e) => ({ label: e.reason, href: e.href })),
    draft: extra?.draft,
    proposal: extra?.proposal,
    actionProposal: extra?.extraProposal,
    blocks,
    toolActivity,
    structuredEvidence,
    memory: next,
  };
}

export function applyDemoVisitProposal(
  visits: CopilotSnapshot['visits'],
  proposal: { leadName: string; propertyTitle?: string; when?: string },
): CopilotSnapshot['visits'] {
  return [
    {
      id: `v-${Date.now()}`,
      propertyTitle: proposal.propertyTitle ?? 'Property chosen on confirm',
      buyerName: proposal.leadName,
      when: proposal.when ?? 'Tomorrow 5:00 PM',
      status: 'Proposed',
    },
    ...visits,
  ];
}

export const DEMO_PROMPT_GROUPS = {
  TODAY: ['Aaj kya karna hai?', 'Kaunse follow-ups overdue hain?', 'Kal ki site visits dikhao.'],
  BUYERS: ['Rahul ka update batao.', 'Kaunse buyers serious hain?', 'Mere 3BHK buyers dikhao.'],
  PROPERTIES: ['Dwarka mein 1.5Cr ke andar 3BHK dhoondo', 'Is property se matching buyers dhoondo.'],
  DEALS: ['Mere active deals batao.', 'Konsa deal stuck hai?'],
  ACTIONS: ['Rahul ke liye follow-up draft karo.', 'Kal 4 baje Rahul ka follow-up create karo.'],
} as const;
