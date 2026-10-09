export type IntentFeatureKey =
  | 'recent_enquiry'
  | 'views'
  | 'visits'
  | 'attended'
  | 'saved'
  | 'follow_up'
  | 'timeline'
  | 'negotiation'
  | 'repeat_views';

export interface IntentFeatures {
  recentEnquiry: boolean;
  propertyViews: number;
  siteVisits: number;
  attendedVisits: number;
  savedProperties: number;
  followUpEngaged: boolean;
  timelineUrgent: boolean;
  negotiation: boolean;
  repeatViews: number;
}

export interface IntentContribution {
  key: IntentFeatureKey;
  label: string;
  points: number;
  max: number;
  evidence: string;
}

export interface BuyerIntentScore {
  score: number;
  max: 10;
  model: { id: string; kind: 'rules_v1' | 'demo_rules_v1'; trainedAt: null; label: string };
  contributions: IntentContribution[];
  disclaimer: string;
}

const CAPS: Record<IntentFeatureKey, number> = {
  recent_enquiry: 0.8,
  views: 1.5,
  visits: 2.0,
  attended: 1.0,
  saved: 0.8,
  follow_up: 1.0,
  timeline: 1.2,
  negotiation: 1.5,
  repeat_views: 0.5,
};

function clip(n: number, max: number) {
  return Math.min(max, Math.max(0, n));
}

/** Explainable 0–10 score from recorded CRM signals. Not a purchase probability. */
export function scoreBuyerIntent(features: IntentFeatures, opts?: { demo?: boolean }): BuyerIntentScore {
  const contributions: IntentContribution[] = [];
  const add = (key: IntentFeatureKey, label: string, points: number, evidence: string) => {
    contributions.push({ key, label, points: Math.round(clip(points, CAPS[key]) * 10) / 10, max: CAPS[key], evidence });
  };

  add('recent_enquiry', 'Recent enquiry', features.recentEnquiry ? 0.8 : 0, features.recentEnquiry ? 'Lead is new or recently recorded.' : 'No recent enquiry flag.');
  add('views', 'Properties viewed', clip(features.propertyViews * 0.3, 1.5), `${features.propertyViews} recorded view${features.propertyViews === 1 ? '' : 's'}.`);
  add('visits', 'Site visits', clip(features.siteVisits * 0.7, 2), `${features.siteVisits} visit record${features.siteVisits === 1 ? '' : 's'}.`);
  add('attended', 'Attended visits', clip(features.attendedVisits * 0.8, 1), `${features.attendedVisits} attended/completed.`);
  add('saved', 'Saved properties', clip(features.savedProperties * 0.4, 0.8), `${features.savedProperties} saved.`);
  add('follow_up', 'Follow-up engagement', features.followUpEngaged ? 1 : 0, features.followUpEngaged ? 'A due or overdue follow-up is stored.' : 'No due follow-up.');
  add('timeline', 'Stated timeline', features.timelineUrgent ? 1.2 : 0, features.timelineUrgent ? 'Timeline is this month or sooner.' : 'No urgent timeline recorded.');
  add('negotiation', 'Negotiation', features.negotiation ? 1.5 : 0, features.negotiation ? 'Negotiation stage is recorded.' : 'Not in negotiation.');
  add('repeat_views', 'Repeat views', clip(features.repeatViews * 0.25, 0.5), `${features.repeatViews} repeat view${features.repeatViews === 1 ? '' : 's'}.`);

  const raw = contributions.reduce((sum, row) => sum + row.points, 0);
  const score = Math.round(clip(raw, 10) * 10) / 10;
  const demo = Boolean(opts?.demo);
  return {
    score,
    max: 10,
    model: {
      id: demo ? 'demo_rules_v1' : 'intent_rules_v1',
      kind: demo ? 'demo_rules_v1' : 'rules_v1',
      trainedAt: null,
      label: demo ? 'Demo model · rules, not a trained purchase predictor' : 'Rules baseline · not a trained purchase predictor',
    },
    contributions,
    disclaimer: 'Platform engagement and recorded buying signals. Ye is baat ka guarantee nahi hai ki buyer purchase karega.',
  };
}

export function intentBand(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 7) return 'hot';
  if (score >= 4) return 'warm';
  return 'cold';
}
