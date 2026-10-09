import { intentBand, scoreBuyerIntent, type IntentFeatures } from '@estateflow/shared';
import type { DemoLead } from '@/lib/demo-data';

export function featuresFromDemoLead(lead: DemoLead): IntentFeatures {
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

export function intentForLead(lead: DemoLead) {
  return scoreBuyerIntent(featuresFromDemoLead(lead), { demo: true });
}

export function bandForLead(lead: DemoLead) {
  return intentBand(intentForLead(lead).score);
}
