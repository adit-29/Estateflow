export interface FunnelCounts {
  lead: number;
  contacted: number;
  qualified: number;
  visit: number;
  negotiation: number;
  booking: number;
  closed: number;
  lost: number;
}

export interface PerformanceSnapshot {
  periodLabel: string;
  funnel: FunnelCounts;
  conversion: { from: keyof FunnelCounts; to: keyof FunnelCounts; rate: number | null; sample: number }[];
  dropOffNote: string;
  pipelineValue: number;
  expectedCommission: number;
  cohort: {
    available: false;
    reason: string;
  };
}

function rate(from: number, to: number): number | null {
  if (from <= 0) return null;
  return Math.round((to / from) * 1000) / 10;
}

export function dealerPerformance(input: {
  periodLabel: string;
  leads: { status: string }[];
  visits: { status: string }[];
  deals: { stage: string; value: number }[];
  commissions: { amount: number | null; status: string }[];
}): PerformanceSnapshot {
  const status = (row: { status: string }) => row.status.toLowerCase();
  const stage = (row: { stage: string }) => row.stage.toLowerCase();
  const funnel: FunnelCounts = {
    lead: input.leads.length,
    contacted: input.leads.filter((row) => !status(row).includes('new')).length,
    qualified: input.leads.filter((row) => /qualif|visit|negot|book|won/.test(status(row))).length,
    visit: input.visits.filter((row) => /confirm|complet|attend/.test(status(row).toLowerCase()) || /visit/.test(status(row))).length,
    negotiation: input.deals.filter((row) => stage(row).includes('negot')).length,
    booking: input.deals.filter((row) => stage(row).includes('book')).length,
    closed: input.deals.filter((row) => /won|closed won/.test(stage(row))).length,
    lost: input.leads.filter((row) => status(row).includes('lost')).length + input.deals.filter((row) => stage(row).includes('lost')).length,
  };
  const conversion: PerformanceSnapshot['conversion'] = [
    { from: 'lead', to: 'qualified', rate: rate(funnel.lead, funnel.qualified), sample: funnel.lead },
    { from: 'qualified', to: 'visit', rate: rate(funnel.qualified, funnel.visit), sample: funnel.qualified },
    { from: 'visit', to: 'negotiation', rate: rate(funnel.visit, funnel.negotiation), sample: funnel.visit },
    { from: 'negotiation', to: 'booking', rate: rate(funnel.negotiation, funnel.booking), sample: funnel.negotiation },
  ];
  const weakest = [...conversion].filter((row) => row.rate != null).sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100))[0];
  const dropOffNote = weakest
    ? `Is period mein sabse zyada drop ${weakest.from} → ${weakest.to} par dikha (${weakest.rate}% conversion, n=${weakest.sample}).`
    : 'Is period ke records se drop-off nahi nikal sakte.';
  return {
    periodLabel: input.periodLabel,
    funnel,
    conversion,
    dropOffNote,
    pipelineValue: input.deals.filter((row) => !/closed|lost|won/.test(stage(row))).reduce((sum, row) => sum + row.value, 0),
    expectedCommission: input.commissions.filter((row) => !/paid/i.test(row.status)).reduce((sum, row) => sum + (row.amount ?? 0), 0),
    cohort: {
      available: false,
      reason: 'Delhi/NCR percentile tabhi dikhega jab platform par defined participating dealer population aur date range ho. Abhi ye comparison available nahi hai.',
    },
  };
}
