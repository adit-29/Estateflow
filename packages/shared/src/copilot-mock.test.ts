import { describe, expect, it } from 'vitest';
import { answerDemoCopilot, type CopilotSnapshot } from './copilot-mock';

const base: CopilotSnapshot = {
  leads: [
    { id: 'l1', name: 'Ananya Sharma', locality: 'Koramangala', status: 'New', followUp: 'Today', summary: '3 BHK' },
    { id: 'l2', name: 'Rahul Mehta', locality: 'Dwarka', status: 'Qualified', followUp: 'Tomorrow' },
    { id: 'l3', name: 'Rahul Iyer', locality: 'HSR Layout', status: 'New' },
  ],
  properties: [
    { id: 'p1', title: '3 BHK Dwarka', locality: 'Dwarka', price: 1_20_00_000, beds: 3, status: 'Active' },
    { id: 'p2', title: '3 BHK Dwarka premium', locality: 'Dwarka', price: 2_10_00_000, beds: 3, status: 'Active' },
  ],
  visits: [{ id: 'v1', propertyTitle: '3 BHK Dwarka', buyerName: 'Ananya Sharma', when: 'Tomorrow 11:00 AM', status: 'Proposed' }],
  deals: [],
  commissions: [{ id: 'c1', dealTitle: 'Ananya', amount: 50000, status: 'pending' }],
};

describe('answerDemoCopilot', () => {
  it('builds priorities from follow-ups marked today', () => {
    const answer = answerDemoCopilot('Aaj kya karna hai?', base);
    expect(answer.simulated).toBe(true);
    expect(answer.cards.some((c) => c.title.includes('Ananya Sharma'))).toBe(true);
    expect(answer.text).not.toMatch(/connected to live/i);
  });

  it('filters inventory by locality, budget and bedrooms', () => {
    const answer = answerDemoCopilot('Dwarka mein 1.5 crore ke andar 3BHK', base);
    expect(answer.cards).toHaveLength(1);
    expect(answer.cards[0].title).toBe('3 BHK Dwarka');
  });

  it('asks which Rahul when names collide', () => {
    const answer = answerDemoCopilot('Rahul ko message draft karo', base);
    expect(answer.text).toMatch(/more than one/i);
    expect(answer.draft).toBeUndefined();
  });

  it('drafts from a lead-page follow-up prompt without inventing extra buyers', () => {
    const answer = answerDemoCopilot('Ananya Sharma ko follow-up draft karo', base);
    expect(answer.draft).toMatch(/Ananya/);
    expect(answer.text).toMatch(/not been sent/i);
  });

  it('pitches from stored notes only', () => {
    const answer = answerDemoCopilot('Ananya Sharma ka pitch prepare karo', base);
    expect(answer.text).toMatch(/recorded CRM/);
    expect(answer.blocks.some((b) => /3 BHK|Koramangala/.test(b.body))).toBe(true);
    expect(answer.draft).toBeUndefined();
  });

  it('never calls a live provider and later answers reflect demo mutations', () => {
    const data = { ...base, leads: base.leads.map((l) => ({ ...l })) };
    const first = answerDemoCopilot('Aaj kya karna hai?', data);
    expect(first.simulated).toBe(true);
    const ananya = data.leads.find((l) => l.id === 'l1')!;
    ananya.followUp = 'Done';
    const second = answerDemoCopilot('Aaj kya karna hai?', data);
    expect(second.cards.some((c) => c.title.includes('Ananya Sharma'))).toBe(false);
  });

  it('keeps "uske" attached to the last named buyer', () => {
    const first = answerDemoCopilot('Ananya Sharma ka update batao', base);
    const second = answerDemoCopilot('Uske liye property dhoondo', base, first.memory);
    expect(second.text).toMatch(/Ananya/);
    expect(second.toolActivity.some((t) => t.tool === 'find_matches' || t.label.includes('matching'))).toBe(true);
  });
});
