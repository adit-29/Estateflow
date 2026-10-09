export const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  visit_scheduled: 'Site visit',
  negotiation: 'Negotiation',
  won: 'Closed',
  lost: 'Lost',
  archived: 'Archived',
  New: 'New',
  Contacted: 'Contacted',
  Qualified: 'Qualified',
};

export const LISTING_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Available',
  paused: 'Hold',
  sold_rented: 'Sold / rented',
  archived: 'Unavailable',
};

export const VISIT_STATUS_LABEL: Record<string, string> = {
  proposed: 'Pending confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const DEAL_STAGE_LABEL: Record<string, string> = {
  new_lead: 'New',
  qualified: 'Qualified',
  site_visit: 'Site visit',
  negotiation: 'Negotiation',
  booking: 'Booked',
  closed_won: 'Closed',
  closed_lost: 'Lost',
};

export function prettyStatus(value: string, map: Record<string, string>) {
  return map[value] ?? value.replace(/_/g, ' ');
}

export function rupees(value: string | number | null | undefined) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}
