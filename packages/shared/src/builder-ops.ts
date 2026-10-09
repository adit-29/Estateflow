import { computeMatch } from './matching';
import {
  DEMO_RECONSTRUCTION_COMPLETE,
  PROVIDER_NOT_CONFIGURED_LABEL,
  publicListingBlockers,
  rankDealers,
  requirementFromLead,
  unitTotalPrice,
  type AssignmentRequirement,
  type BuilderDealer,
  type BuilderLead,
  type BuilderProject,
  type BuilderWorkspace,
  type LeadStage,
} from './builder-portal';

export const MATCH_NOTE = 'This is a rule-based fit between the recorded requirement and available units. It is not a statement that the buyer will purchase.';

export interface UnitMatch {
  unitId: string;
  projectId: string;
  projectName: string;
  towerName: string;
  floorLabel: string;
  unitNumber: string;
  configuration: string;
  price: number;
  availability: string;
  matchPercent: number;
  explanation: string;
}

export interface BuyerMatchReport {
  units: UnitMatch[];
  dealers: ReturnType<typeof rankDealers> | null;
  note: string;
}

export function matchBuyerRequirement(
  ws: BuilderWorkspace,
  input: Partial<AssignmentRequirement> & { readiness?: string | null; bedrooms?: number | null },
  now = new Date(),
): BuyerMatchReport {
  const locality = input.locality?.trim() || '';
  const propertyType = input.propertyType?.trim() || '';
  const bedrooms = input.bedrooms ?? null;
  const units = ws.units
    .filter((unit) => unit.availability === 'available')
    .filter((unit) => !input.projectId || unit.projectId === input.projectId)
    .map((unit) => {
      const project = ws.projects.find((item) => item.id === unit.projectId);
      const tower = ws.towers.find((item) => item.id === unit.towerId);
      const floor = ws.floors.find((item) => item.id === unit.floorId);
      const readiness = project?.constructionStatus === 'ready_to_move' || project?.constructionStatus === 'completed' ? 'ready' : 'under_construction';
      const match = computeMatch(
        {
          localities: locality ? [locality] : [],
          propertyTypes: propertyType ? [propertyType] : [],
          bedroomsMin: bedrooms,
          bedroomsMax: bedrooms,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? null,
          readiness: input.readiness ?? null,
        },
        {
          locality: project?.locality ?? null,
          propertyType: project?.projectType ?? null,
          bedrooms: unit.bedrooms,
          priceAmount: unitTotalPrice(unit),
          listingStatus: readiness === 'ready' ? 'active' : 'active',
        },
      );
      const configOk = !input.configuration || norm(unit.configuration) === norm(input.configuration);
      return {
        unitId: unit.id,
        projectId: unit.projectId,
        projectName: project?.name ?? 'Project',
        towerName: tower?.name ?? 'Tower',
        floorLabel: floor?.label ?? 'Floor',
        unitNumber: unit.unitNumber,
        configuration: unit.configuration,
        price: unitTotalPrice(unit),
        availability: unit.availability,
        matchPercent: configOk ? match.matchPercent : Math.round(match.matchPercent * 0.5),
        explanation: match.explanation,
      };
    })
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 8);
  const projectId = input.projectId ?? units[0]?.projectId ?? null;
  const dealers = projectId
    ? rankDealers(ws, {
      projectId,
      unitId: units[0]?.unitId ?? null,
      locality: locality || (ws.projects.find((item) => item.id === projectId)?.locality ?? ''),
      propertyType: propertyType || (ws.projects.find((item) => item.id === projectId)?.projectType ?? 'residential'),
      configuration: input.configuration ?? units[0]?.configuration ?? '',
      transactionType: input.transactionType ?? 'sale',
      budgetMin: input.budgetMin ?? 0,
      budgetMax: input.budgetMax ?? 0,
    }, now)
    : null;
  return { units, dealers, note: MATCH_NOTE };
}

export interface ExtractedRequirement {
  configuration: string | null;
  bedrooms: number | null;
  locality: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  missing: string[];
  label: string;
}

/** Rule extraction from enquiry text. A language model is not called. */
export function extractBuilderEnquiry(text: string): ExtractedRequirement {
  const config = text.match(/\b(\d)\s*bhk\b/i);
  const locality = text.match(/\b(Dwarka|Janakpuri|Palam|Gurugram|Noida|Rohini)\b/i);
  const range = text.match(/₹?\s*(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*₹?\s*(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh)/i);
  const single = text.match(/₹?\s*(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh)/i);
  let budgetMin: number | null = null;
  let budgetMax: number | null = null;
  if (range) {
    budgetMin = moneyFrom(range[1], range[3]);
    budgetMax = moneyFrom(range[2], range[3]);
  } else if (single) {
    budgetMax = moneyFrom(single[1], single[2]);
  }
  const missing: string[] = [];
  if (!config) missing.push('configuration');
  if (!locality) missing.push('locality');
  if (budgetMin == null && budgetMax == null) missing.push('budget');
  return {
    configuration: config ? `${config[1]}BHK` : null,
    bedrooms: config ? Number(config[1]) : null,
    locality: locality ? locality[1] : null,
    budgetMin,
    budgetMax,
    missing,
    label: 'Extracted with rules from the enquiry text. A language model was not called.',
  };
}

function moneyFrom(amount: string, unit: string): number {
  const value = parseFloat(amount);
  if (/cr|crore/i.test(unit)) return Math.round(value * 1_00_00_000);
  return Math.round(value * 1_00_000);
}

export const ROUTING_BUCKETS = [
  'new',
  'awaiting',
  'assigned',
  'accepted',
  'declined',
  'reassignment',
  'qualified',
  'visit',
  'booking',
  'lost',
] as const;
export type RoutingBucket = (typeof ROUTING_BUCKETS)[number];

export const ROUTING_BUCKET_LABEL: Record<RoutingBucket, string> = {
  new: 'New',
  awaiting: 'Awaiting assignment',
  assigned: 'Assigned',
  accepted: 'Accepted',
  declined: 'Declined',
  reassignment: 'Reassignment needed',
  qualified: 'Qualified',
  visit: 'Visit',
  booking: 'Booking',
  lost: 'Lost',
};

export interface RoutingRow {
  leadId: string;
  summary: string;
  projectName: string;
  unitNumber: string | null;
  dealerName: string | null;
  score: number | null;
  reasons: string[];
  responseMinutesLeft: number | null;
  lastActivity: string;
  nextAction: string;
  buckets: RoutingBucket[];
  stage: LeadStage;
  updatedAt: string;
  projectId: string;
  dealerId: string | null;
}

export function leadRoutingRows(ws: BuilderWorkspace, now = new Date()): RoutingRow[] {
  return ws.leads.map((lead) => {
    const project = ws.projects.find((item) => item.id === lead.projectId);
    const unit = ws.units.find((item) => item.id === lead.unitId);
    const rows = ws.assignments.filter((item) => item.leadId === lead.id);
    const open = rows.find((item) => item.status === 'assigned' || item.status === 'accepted');
    const latest = rows[0];
    const declined = latest?.status === 'declined';
    const buckets = bucketsFor(lead, declined);
    const deadline = open?.status === 'assigned'
      ? new Date(open.assignedAt).getTime() + open.responseWindowMinutes * 60 * 1000
      : null;
    return {
      leadId: lead.id,
      summary: `${lead.configuration} · ${lead.locality} · ₹${lead.budgetMin.toLocaleString('en-IN')}–₹${lead.budgetMax.toLocaleString('en-IN')}`,
      projectName: project?.name ?? 'Project',
      unitNumber: unit?.unitNumber ?? null,
      dealerName: open?.dealerName ?? latest?.dealerName ?? null,
      score: open?.score ?? latest?.score ?? null,
      reasons: (open ?? latest)?.factors.filter((factor) => factor.points > 0).map((factor) => factor.reason) ?? [],
      responseMinutesLeft: deadline == null ? null : Math.max(0, Math.round((deadline - now.getTime()) / 60000)),
      lastActivity: lead.updatedAt,
      nextAction: nextAction(lead.stage, Boolean(open && open.status === 'assigned')),
      buckets,
      stage: lead.stage,
      updatedAt: lead.updatedAt,
      projectId: lead.projectId,
      dealerId: open?.dealerId ?? latest?.dealerId ?? null,
    };
  });
}

function bucketsFor(lead: BuilderLead, declined: boolean): RoutingBucket[] {
  const buckets: RoutingBucket[] = [];
  if (lead.stage === 'new_lead') buckets.push('new', 'awaiting');
  if (lead.stage === 'needs_reassignment' || declined) buckets.push('reassignment');
  if (declined) buckets.push('declined');
  if (lead.stage === 'assigned') buckets.push('assigned');
  if (['accepted', 'contacted'].includes(lead.stage)) buckets.push('accepted');
  if (lead.stage === 'qualified') buckets.push('qualified');
  if (lead.stage === 'visit_planned' || lead.stage === 'visited') buckets.push('visit');
  if (['negotiation', 'booking', 'won'].includes(lead.stage)) buckets.push('booking');
  if (lead.stage === 'lost') buckets.push('lost');
  return buckets.length ? buckets : ['new'];
}

function nextAction(stage: LeadStage, waiting: boolean): string {
  if (stage === 'new_lead') return 'Review compatible dealers and assign';
  if (waiting || stage === 'assigned') return 'Wait for the dealer response, or reassign';
  if (stage === 'needs_reassignment') return 'Choose the next eligible dealer';
  if (stage === 'accepted' || stage === 'contacted') return 'Record contact and qualification';
  if (stage === 'qualified' || stage === 'visit_planned') return 'Record the site visit';
  if (stage === 'visited' || stage === 'negotiation') return 'Record the booking outcome';
  if (stage === 'booking' || stage === 'won') return 'Booking is recorded on the lead';
  return 'No further assignment step';
}

export interface QualitySignal {
  code: string;
  label: 'Needs verification' | 'Possible duplicate';
  detail: string;
  href: string;
}

export function qualitySignals(ws: BuilderWorkspace, now = new Date()): QualitySignal[] {
  const signals: QualitySignal[] = [];
  const seenUnits = new Map<string, string>();
  for (const unit of ws.units) {
    const key = `${unit.projectId}:${unit.unitNumber.toLowerCase()}`;
    const previous = seenUnits.get(key);
    if (previous) {
      signals.push({ code: 'duplicate_unit', label: 'Possible duplicate', detail: `Unit ${unit.unitNumber} is stored more than once.`, href: `/builder/projects/${unit.projectId}` });
    }
    seenUnits.set(key, unit.id);
    if (unit.availability === 'sold' && unit.bookingStatus !== 'sold') {
      signals.push({ code: 'sold_available', label: 'Needs verification', detail: `${unit.unitNumber} is marked sold, but the booking status does not say sold.`, href: `/builder/projects/${unit.projectId}` });
    }
    if (unit.availability === 'available' && (unit.bookingStatus === 'sold' || unit.bookingStatus === 'booked')) {
      signals.push({ code: 'sold_available', label: 'Needs verification', detail: `${unit.unitNumber} is shown as available while booking status is ${unit.bookingStatus}.`, href: `/builder/projects/${unit.projectId}` });
    }
    if (unit.availability === 'available' && unit.lastConfirmedAt && now.getTime() - new Date(unit.lastConfirmedAt).getTime() > 30 * 24 * 60 * 60 * 1000) {
      signals.push({ code: 'stale', label: 'Needs verification', detail: `${unit.unitNumber} availability was last confirmed more than 30 days ago.`, href: `/builder/projects/${unit.projectId}` });
    }
  }
  const available = ws.units.filter((unit) => unit.availability === 'available');
  for (const unit of available) {
    const peers = available.filter((item) => item.id !== unit.id && item.projectId === unit.projectId && item.towerId === unit.towerId && norm(item.configuration) === norm(unit.configuration));
    const price = unitTotalPrice(unit);
    if (peers.some((peer) => {
      const other = unitTotalPrice(peer);
      return price > 0 && other > 0 && Math.max(price, other) / Math.min(price, other) >= 1.4;
    })) {
      signals.push({ code: 'price', label: 'Needs verification', detail: `${unit.unitNumber} price differs sharply from another available ${unit.configuration} in the same tower.`, href: `/builder/projects/${unit.projectId}` });
      break;
    }
  }
  let missingPlans = 0;
  for (const unit of available) {
    if (missingPlans >= 4) break;
    const plan = ws.media.some((item) => item.unitId === unit.id && item.kind === 'floor_plan');
    if (!plan) {
      missingPlans += 1;
      signals.push({ code: 'floor_plan', label: 'Needs verification', detail: `${unit.unitNumber} has no floor plan on file.`, href: `/builder/projects/${unit.projectId}?tab=floor-plans` });
    }
  }
  const files = new Map<string, string>();
  for (const item of ws.media) {
    const key = `${item.projectId}:${item.fileName.toLowerCase()}:${item.sizeBytes}`;
    if (files.has(key)) {
      signals.push({ code: 'duplicate_media', label: 'Possible duplicate', detail: `${item.fileName} matches another file name and size on this project.`, href: `/builder/projects/${item.projectId}?tab=media` });
    }
    files.set(key, item.id);
  }
  for (const project of ws.projects) {
    const blockers = publicListingBlockers(project);
    if (project.status !== 'archived' && blockers.length && project.visibility !== 'private') {
      signals.push({ code: 'project_data', label: 'Needs verification', detail: `${project.name}: ${blockers[0]}`, href: `/builder/projects/${project.id}?tab=settings` });
    } else if (!project.address.trim() || !project.description.trim()) {
      signals.push({ code: 'project_data', label: 'Needs verification', detail: `${project.name} is missing an address or description.`, href: `/builder/projects/${project.id}?tab=settings` });
    }
  }
  const phones = new Map<string, string>();
  for (const lead of ws.leads) {
    const phone = lead.phone.replace(/\D/g, '');
    if (phone.length < 8) continue;
    const previous = phones.get(phone);
    if (previous && previous !== lead.id) {
      signals.push({ code: 'duplicate_lead', label: 'Possible duplicate', detail: `${lead.buyerName} shares a phone number with another enquiry.`, href: `/builder/leads/${lead.id}` });
    }
    phones.set(phone, lead.id);
  }
  for (const row of ws.assignments) {
    if (row.status === 'reassigned' || row.status === 'declined' || row.status === 'timed_out') continue;
    const lead = ws.leads.find((item) => item.id === row.leadId);
    if (!lead) continue;
    const access = ws.access.find((item) => item.dealerId === row.dealerId && item.projectId === lead.projectId && item.permissions.includes('RECEIVE_LEADS') && (!item.expiresAt || item.expiresAt > now.toISOString()));
    if (!access) {
      signals.push({ code: 'unauthorized_assignment', label: 'Needs verification', detail: `${row.dealerName} is assigned without current lead access for the project.`, href: `/builder/leads/${lead.id}` });
    }
  }
  return signals;
}

export interface AnalyticsSnapshot {
  definition: string;
  unitsByStatus: { status: string; count: number }[];
  leadsByStage: { stage: string; count: number }[];
  visits: number;
  responseRate: number | null;
  toursByStatus: { status: string; count: number }[];
}

export function builderAnalytics(ws: BuilderWorkspace, projectId?: string | null, now = new Date()): AnalyticsSnapshot {
  const units = ws.units.filter((unit) => !projectId || unit.projectId === projectId);
  const leads = ws.leads.filter((lead) => !projectId || lead.projectId === projectId);
  const tours = ws.tours.filter((tour) => !projectId || tour.projectId === projectId);
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const leadIds = new Set(leads.map((lead) => lead.id));
  const decided = ws.assignments.filter((row) => leadIds.has(row.leadId) && new Date(row.assignedAt).getTime() >= monthAgo && (row.status === 'accepted' || row.status === 'declined' || row.status === 'timed_out'));
  const answered = decided.filter((row) => row.status === 'accepted' || row.status === 'declined');
  const count = <T extends string>(rows: T[]) => {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row, (map.get(row) ?? 0) + 1);
    return [...map.entries()].map(([status, total]) => ({ status, count: total }));
  };
  return {
    definition: 'Counts of stored records for the selected project. Not a forecast.',
    unitsByStatus: count(units.map((unit) => unit.availability)),
    leadsByStage: count(leads.map((lead) => lead.stage)).map((row) => ({ stage: row.status, count: row.count })),
    visits: leads.filter((lead) => lead.visitAt && new Date(lead.visitAt).getTime() >= weekAgo && new Date(lead.visitAt).getTime() <= now.getTime()).length,
    responseRate: decided.length === 0 ? null : answered.length / decided.length,
    toursByStatus: count(tours.map((tour) => tour.status)),
  };
}

export function draftProjectCopy(project: BuilderProject, ws: BuilderWorkspace): string {
  const units = ws.units.filter((unit) => unit.projectId === project.id && unit.availability === 'available');
  const prices = units.map((unit) => unitTotalPrice(unit)).filter((price) => price > 0);
  const configs = [...new Set(units.map((unit) => unit.configuration))];
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const priceLine = low == null ? 'Available prices are not recorded yet.' : `Available recorded prices run from ₹${low.toLocaleString('en-IN')} to ₹${high!.toLocaleString('en-IN')}.`;
  return [
    `${project.name}, ${project.locality}, ${project.city}.`,
    project.description || 'No description is recorded.',
    `Construction: ${project.constructionStatus.replaceAll('_', ' ')}. Possession: ${project.possessionDate ?? 'not recorded'}.`,
    configs.length ? `Available configurations on file: ${configs.join(', ')}.` : 'No available units are recorded.',
    priceLine,
    project.amenities.length ? `Amenities on file: ${project.amenities.join(', ')}.` : 'No amenities are recorded.',
    'Draft from recorded project facts. Not published.',
  ].join(' ');
}

export function draftDealerMessage(ws: BuilderWorkspace, leadId: string): string | null {
  const lead = ws.leads.find((item) => item.id === leadId);
  if (!lead) return null;
  const project = ws.projects.find((item) => item.id === lead.projectId);
  const unit = ws.units.find((item) => item.id === lead.unitId);
  return [
    `Buyer enquiry for ${project?.name ?? 'the project'}${unit ? `, unit ${unit.unitNumber}` : ''}.`,
    `Requirement on file: ${lead.configuration}, ${lead.locality}, budget ₹${lead.budgetMin.toLocaleString('en-IN')}–₹${lead.budgetMax.toLocaleString('en-IN')}.`,
    lead.requirementNote ? `Note: ${lead.requirementNote}` : '',
    'Draft from the lead record. Buyer contact is shared only after you accept the assignment.',
  ].filter(Boolean).join(' ');
}

export interface BuilderCopilotRecord {
  type: string;
  id: string;
  label: string;
  href: string;
}

export interface BuilderCopilotAnswer {
  mode: 'records';
  label: string;
  text: string;
  records: BuilderCopilotRecord[];
  missing: string[];
  draft?: string;
  notices: string[];
}

export function answerBuilderQuestion(ws: BuilderWorkspace, question: string, now = new Date()): BuilderCopilotAnswer {
  const q = question.toLowerCase();
  const base = {
    mode: 'records' as const,
    label: ws.dataSource === 'demo' ? 'DEMO DATA · answers use demo records' : 'Answers use this organization’s records',
    notices: ['Inventory, price, booking, permissions, and assignment scores come from stored records. A language model did not calculate them.'],
    missing: [] as string[],
    records: [] as BuilderCopilotRecord[],
  };
  if (!question.trim()) {
    return { ...base, text: 'Ask about leads, dealers, inventory, visits, or assignment rules.' };
  }
  if (/rule|weight|assignment rule/.test(q)) {
    const weights = ws.settings.weights;
    return {
      ...base,
      text: `Assignment mode is ${ws.settings.mode}. Response window is ${ws.settings.responseWindowMinutes} minutes, with up to ${ws.settings.maxReassignments} reassignments. Weights: project access ${weights.projectAccess}, locality ${weights.locality}, specialization ${weights.specialization}, buyer fit ${weights.buyerFit}, response ${weights.response}, capacity ${weights.capacity}, preference ${weights.preference}.`,
    };
  }
  if (/visit/.test(q) && /week|is week|kitni|hui/.test(q)) {
    const snapshot = builderAnalytics(ws, null, now);
    return { ...base, text: `${snapshot.visits} site visit${snapshot.visits === 1 ? '' : 's'} recorded in the last 7 days.` };
  }
  if (/assign nahi|not assigned|unassigned|awaiting/.test(q) || /leads assign/.test(q)) {
    const rows = ws.leads.filter((lead) => lead.stage === 'new_lead' || lead.stage === 'needs_reassignment');
    return {
      ...base,
      text: rows.length ? `${rows.length} lead${rows.length === 1 ? '' : 's'} still need assignment.` : 'Every current lead has moved past an unassigned stage.',
      records: rows.map((lead) => ({ type: 'lead', id: lead.id, label: `${lead.buyerName} · ${lead.configuration}`, href: `/builder/leads/${lead.id}` })),
    };
  }
  if (/new lead|kitne new|aaj/.test(q) && /lead/.test(q)) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const today = ws.leads.filter((lead) => new Date(lead.createdAt).getTime() >= start.getTime());
    const fresh = ws.leads.filter((lead) => lead.stage === 'new_lead');
    return {
      ...base,
      text: `${today.length} lead${today.length === 1 ? '' : 's'} recorded today. ${fresh.length} still in New lead.`,
      records: fresh.slice(0, 8).map((lead) => ({ type: 'lead', id: lead.id, label: lead.buyerName, href: `/builder/leads/${lead.id}` })),
    };
  }
  const unitNumber = question.match(/\b([A-Z]-\d{3})\b/);
  if (unitNumber && /dealer|recommend|compatible/.test(q)) {
    const unit = ws.units.find((item) => item.unitNumber.toLowerCase() === unitNumber[1].toLowerCase());
    if (!unit) return { ...base, text: `No unit ${unitNumber[1]} is in this workspace.`, missing: ['unit'] };
    const project = ws.projects.find((item) => item.id === unit.projectId);
    const report = matchBuyerRequirement(ws, {
      projectId: unit.projectId,
      locality: project?.locality,
      propertyType: project?.projectType,
      configuration: unit.configuration,
      bedrooms: unit.bedrooms,
      budgetMin: Math.round(unitTotalPrice(unit) * 0.9),
      budgetMax: Math.round(unitTotalPrice(unit) * 1.1),
      transactionType: 'sale',
    }, now);
    const top = report.dealers?.eligible.slice(0, 3) ?? [];
    return {
      ...base,
      text: top.length
        ? `${unit.unitNumber} can be recommended to ${top.map((item) => `${item.name} (${item.score} assignment compatibility)`).join(', ')}. ${MATCH_NOTE}`
        : `No eligible dealer can receive a lead for ${unit.unitNumber}.`,
      records: top.map((item) => ({ type: 'dealer', id: item.dealerId, label: item.name, href: '/builder/dealers' })),
    };
  }
  if (/dealer/.test(q) && /compatible|recommend|kaun/.test(q)) {
    const locality = question.match(/\b(dwarka|janakpuri|palam|gurugram|noida|rohini)\b/i)?.[1] ?? '';
    const project = ws.projects.find((item) => locality && norm(item.locality) === norm(locality)) ?? ws.projects.find((item) => item.status === 'active') ?? ws.projects[0];
    if (!project) return { ...base, text: 'No project is recorded yet.', missing: ['project'] };
    const ranked = rankDealers(ws, {
      projectId: project.id,
      unitId: null,
      locality: locality || project.locality,
      propertyType: project.projectType === 'commercial' ? 'commercial' : 'residential',
      configuration: /2bhk/.test(q) ? '2BHK' : '3BHK',
      transactionType: 'sale',
      budgetMin: /2bhk/.test(q) ? 8_000_000 : 12_000_000,
      budgetMax: /2bhk/.test(q) ? 10_000_000 : 15_000_000,
    }, now);
    const top = ranked.eligible.slice(0, 3);
    return {
      ...base,
      text: top.length
        ? `For ${project.name}, assignment compatibility is highest for ${top.map((item) => `${item.name} (${item.score})`).join(', ')}.`
        : `No eligible dealer is available for ${project.name}.`,
      records: top.map((item) => ({ type: 'dealer', id: item.dealerId, label: `${item.name} · ${item.score}`, href: '/builder/dealers' })),
    };
  }
  if (/slow|inventory/.test(q)) {
    const quiet = ws.units.filter((unit) => unit.availability === 'available' && !ws.leads.some((lead) => lead.unitId === unit.id)).slice(0, 6);
    return {
      ...base,
      text: quiet.length
        ? `${quiet.length} available unit${quiet.length === 1 ? '' : 's'} have no linked enquiry: ${quiet.map((unit) => unit.unitNumber).join(', ')}. That is a count of records, not a prediction of how they will sell.`
        : 'Every available unit has at least one linked enquiry.',
      records: quiet.map((unit) => ({ type: 'unit', id: unit.id, label: unit.unitNumber, href: `/builder/projects/${unit.projectId}?tab=inventory` })),
    };
  }
  if (/demand|3bhk|budget/.test(q)) {
    const extracted = extractBuilderEnquiry(question);
    const config = extracted.configuration ?? '3BHK';
    const min = extracted.budgetMin ?? 12_000_000;
    const max = extracted.budgetMax ?? 15_000_000;
    const leads = ws.leads.filter((lead) => norm(lead.configuration) === norm(config) && rangesOverlap(lead.budgetMin, lead.budgetMax, min, max));
    return {
      ...base,
      text: `${leads.length} recorded ${config} enquir${leads.length === 1 ? 'y overlaps' : 'ies overlap'} ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}.`,
      records: leads.slice(0, 8).map((lead) => ({ type: 'lead', id: lead.id, label: lead.buyerName, href: `/builder/leads/${lead.id}` })),
    };
  }
  if (/summar|project info|project ke/.test(q) && /project/.test(q)) {
    const project = ws.projects[0];
    if (!project) return { ...base, text: 'No project is recorded yet.', missing: ['project'] };
    return { ...base, text: draftProjectCopy(project, ws), draft: draftProjectCopy(project, ws) };
  }
  if (/quality|duplicate|verification/.test(q)) {
    const signals = qualitySignals(ws, now).slice(0, 6);
    return {
      ...base,
      text: signals.length ? signals.map((item) => `${item.label}: ${item.detail}`).join(' ') : 'No data-quality signals on the current records.',
      records: signals.map((item, index) => ({ type: 'signal', id: String(index), label: item.detail, href: item.href })),
    };
  }
  if (/performance|response rate/.test(q)) {
    const lines = ws.dealers.slice(0, 6).map((dealer) => {
      const rate = dealer.assignmentsInWindow > 0 ? `${Math.round((dealer.responsesInWindow / dealer.assignmentsInWindow) * 100)}%` : 'no recorded assignments';
      return `${dealer.name}: ${rate} answered in the scoring window, ${dealer.openLeads} open of ${dealer.capacity}.`;
    });
    return { ...base, text: lines.join(' ') || 'No dealers are recorded.' };
  }
  return {
    ...base,
    text: 'I can answer from recorded leads, units, dealers, visits, assignment rules, and data-quality checks. Ask one of those.',
    missing: ['supported question'],
  };
}

export function pageItems<T>(items: T[], page: number, pageSize = 20): { items: T[]; total: number; page: number; pageSize: number } {
  const size = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));
  const index = Math.max(0, Math.floor(page) || 0);
  const start = index * size;
  return { items: items.slice(start, start + size), total: items.length, page: index, pageSize: size };
}

export interface DealerNotice {
  id: string;
  title: string;
  detail: string;
  channel: 'demo' | 'account';
}

export function dealerAccessNotices(ws: BuilderWorkspace, dealer: BuilderDealer): DealerNotice[] {
  const channel: DealerNotice['channel'] = ws.dataSource === 'demo' ? 'demo' : 'account';
  const notices: DealerNotice[] = [];
  const access = ws.access.filter((item) => item.dealerId === dealer.id);
  for (const row of ws.assignments) {
    if (row.dealerId !== dealer.id || row.status !== 'assigned') continue;
    notices.push({ id: `lead-${row.id}`, title: 'New project lead assigned', detail: 'Buyer contact stays hidden until you accept. Demo/local until a live channel is connected.', channel });
  }
  for (const grant of access) {
    if (!grant.permissions.includes('VIEW_3D_TOUR')) continue;
    const published = ws.tours.find((tour) => tour.projectId === grant.projectId && tour.status === 'published');
    if (published) {
      notices.push({
        id: `tour-${published.id}`,
        title: '3D tour available',
        detail: published.demoSimulation ? `${DEMO_RECONSTRUCTION_COMPLETE}. Illustrative sample scene.` : 'A published tour is on a project shared with you.',
        channel,
      });
    }
  }
  return notices;
}

export function assistProviderStatus(env: Record<string, string | undefined> = process.env): { configured: boolean; label: string } {
  const name = env.BUILDER_ASSIST_PROVIDER?.trim();
  if (!name || name === 'none' || name === 'rules') {
    return { configured: false, label: 'Language model is not connected. Answers use recorded facts and rules.' };
  }
  return { configured: false, label: `BUILDER_ASSIST_PROVIDER is "${name}", but this build has no adapter. Nothing was sent. Answers use recorded facts and rules.` };
}

export function reconstructionStatusLabel(configured: boolean | undefined): string {
  return configured ? 'A reconstruction provider is selected.' : PROVIDER_NOT_CONFIGURED_LABEL;
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMin <= bMax && bMin <= aMax;
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function requirementForLead(ws: BuilderWorkspace, leadId: string): AssignmentRequirement | null {
  const lead = ws.leads.find((item) => item.id === leadId);
  return lead ? requirementFromLead(lead) : null;
}
