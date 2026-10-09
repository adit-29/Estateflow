export interface AnalyticsInput {
  leads: { createdAt: string; status: string; source: string; nextFollowUpAt?: string | null; updatedAt?: string }[];
  visits: { status: string; scheduledAt: string }[];
  deals: { pipelineStage: string; value?: number | null; updatedAt: string }[];
  commissions: { paymentStatus: string; amount: number | null; dueDate?: string | null; createdAt?: string | null }[];
  shortlists: { createdAt: string }[];
  matchingDrafts?: { createdAt: string }[];
  followUpsCompleted: number;
}

export interface AnalyticsSummary {
  definitions: Record<string, string>;
  leadsCreated: number;
  leadsQualified: number;
  visits: { scheduled: number; completed: number; cancelled: number };
  dealsWon: number;
  dealsLost: number;
  pipelineByStage: { stage: string; count: number; value: number }[];
  commissions: { agreed: number; paid: number; pending: number; overdue: number };
  leadSources: { source: string; count: number }[];
  followUpsCompleted: number;
  savedMatches: number;
  matchingActivity: number;
  empty: boolean;
}

const QUALIFIED = new Set(['qualified', 'visit_scheduled', 'negotiation', 'won']);

export function aggregateAnalytics(input: AnalyticsInput, from?: string, to?: string): AnalyticsSummary {
  const start = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const end = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  const inRange = (iso?: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= start && t <= end;
  };

  const leads = input.leads.filter((l) => inRange(l.createdAt));
  const visits = input.visits.filter((v) => inRange(v.scheduledAt));
  const deals = input.deals.filter((d) => inRange(d.updatedAt));
  const shortlists = input.shortlists.filter((s) => inRange(s.createdAt));
  const drafts = (input.matchingDrafts ?? []).filter((d) => inRange(d.createdAt));
  const commissionsInRange = input.commissions.filter((row) => (row.createdAt ? inRange(row.createdAt) : true));

  const sources = new Map<string, number>();
  for (const lead of leads) sources.set(lead.source, (sources.get(lead.source) ?? 0) + 1);

  const stages = new Map<string, { count: number; value: number }>();
  for (const deal of deals) {
    const row = stages.get(deal.pipelineStage) ?? { count: 0, value: 0 };
    row.count += 1;
    row.value += Number(deal.value ?? 0);
    stages.set(deal.pipelineStage, row);
  }

  const now = Date.now();
  const commissions = { agreed: 0, paid: 0, pending: 0, overdue: 0 };
  for (const row of commissionsInRange) {
    const amount = row.amount ?? 0;
    commissions.agreed += amount;
    if (row.paymentStatus === 'paid') commissions.paid += amount;
    else if (row.paymentStatus === 'overdue' || (row.dueDate && new Date(row.dueDate).getTime() < now && row.paymentStatus === 'pending')) {
      commissions.overdue += amount;
    } else commissions.pending += amount;
  }

  const summary: AnalyticsSummary = {
    definitions: {
      leadsCreated: 'Leads whose createdAt falls in the selected range.',
      leadsQualified: 'Those leads whose status is qualified or later. This is not a claim that a specific action caused qualification.',
      visits: 'Site visits scheduled in the range, grouped by stored status.',
      pipelineByStage: 'Sum of recorded deal values by current stage. Missing values count as zero and are not estimated.',
      savedMatches: 'Shortlisted matches created in the range.',
      matchingActivity: 'Saved matches plus draft messages created in the range. This does not claim a match caused a deal.',
      commissions: 'Sums of stored commission amounts. Rows with createdAt are limited to the range. Missing amounts count as zero and are not estimated.',
    },
    leadsCreated: leads.length,
    leadsQualified: leads.filter((l) => QUALIFIED.has(l.status)).length,
    visits: {
      scheduled: visits.filter((v) => v.status === 'proposed' || v.status === 'confirmed').length,
      completed: visits.filter((v) => v.status === 'completed').length,
      cancelled: visits.filter((v) => v.status === 'cancelled' || v.status === 'no_show').length,
    },
    dealsWon: deals.filter((d) => d.pipelineStage === 'closed_won').length,
    dealsLost: deals.filter((d) => d.pipelineStage === 'closed_lost').length,
    pipelineByStage: [...stages.entries()].map(([stage, row]) => ({ stage, ...row })),
    commissions,
    leadSources: [...sources.entries()].map(([source, count]) => ({ source, count })),
    followUpsCompleted: input.followUpsCompleted,
    savedMatches: shortlists.length,
    matchingActivity: shortlists.length + drafts.length,
    empty: leads.length + visits.length + deals.length + shortlists.length + drafts.length + commissionsInRange.length === 0,
  };
  return summary;
}
