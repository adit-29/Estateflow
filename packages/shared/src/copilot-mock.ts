import { runDemoAgent, type AgentMemory } from './copilot-agent';

export interface CopilotLead {
  id: string;
  name: string;
  locality: string;
  status: string;
  followUp?: string;
  summary?: string;
  phone?: string;
  budgetMax?: number;
  beds?: number;
  timeline?: string;
  views?: number;
  savedCount?: number;
  visitCount?: number;
  attendedCount?: number;
  repeatViews?: number;
  objection?: string;
  journeys?: { property: string; stages: string[]; stop?: string }[];
}

export interface CopilotProperty {
  id: string;
  title: string;
  locality: string;
  price: number;
  beds?: number;
  status: string;
}

export interface CopilotVisit {
  id: string;
  propertyTitle: string;
  buyerName: string;
  when: string;
  status: string;
}

export interface CopilotDeal {
  id: string;
  title: string;
  stage: string;
  value: number;
}

export interface CopilotCommission {
  id: string;
  dealTitle: string;
  amount: number | null;
  status: string;
}

export interface CopilotSnapshot {
  leads: CopilotLead[];
  properties: CopilotProperty[];
  visits: CopilotVisit[];
  deals: CopilotDeal[];
  commissions: CopilotCommission[];
  builderLeads?: {
    assignmentId: string;
    configuration: string;
    locality: string;
    projectName: string;
    requirementNote: string;
    status: string;
  }[];
  network?: { id: string; name: string; agency: string; areas: string }[];
}

export interface CopilotCard {
  title: string;
  detail: string;
  href?: string;
}

export interface CopilotProposal {
  kind: 'follow_up' | 'site_visit';
  leadId: string;
  label: string;
}

export interface CopilotAnswer {
  mode: 'demo';
  simulated: true;
  text: string;
  cards: CopilotCard[];
  evidence: { label: string; href?: string }[];
  draft?: string;
  proposal?: CopilotProposal;
  actionProposal?: import('./copilot-tools').CopilotActionProposal;
  blocks?: import('./copilot-tools').CopilotBlock[];
  toolActivity?: import('./copilot-tools').CopilotToolActivity[];
  memory?: AgentMemory;
}

/** Deterministic demo answers. Does not call a model API. */
export function answerDemoCopilot(question: string, data: CopilotSnapshot, memory?: Partial<AgentMemory>) {
  return runDemoAgent(question, data, memory);
}
