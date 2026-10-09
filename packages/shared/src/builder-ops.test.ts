import { describe, expect, it } from 'vitest';
import { applyBuilderAction } from './builder-actions';
import { createDemoBuilderWorkspace } from './builder-demo';
import {
  MATCH_NOTE,
  answerBuilderQuestion,
  assistProviderStatus,
  extractBuilderEnquiry,
  leadRoutingRows,
  matchBuyerRequirement,
  qualitySignals,
} from './builder-ops';
import { DEMO_RECONSTRUCTION_COMPLETE } from './builder-portal';

const NOW = new Date('2026-09-27T07:00:00.000Z');

describe('builder matching and copilot', () => {
  it('matches available units and ranks dealers without a purchase claim', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    expect(ws.organizationName).toBe('EstateFlow Developments');
    expect(ws.units.length).toBeGreaterThanOrEqual(15);
    expect(ws.units.length).toBeLessThanOrEqual(25);
    expect(ws.leads.length).toBeGreaterThanOrEqual(8);
    expect(ws.dealers.length).toBeGreaterThanOrEqual(5);
    expect(ws.dealers.length).toBeLessThanOrEqual(8);
    const report = matchBuyerRequirement(ws, {
      projectId: 'prj-heights',
      locality: 'Dwarka',
      propertyType: 'residential',
      configuration: '3BHK',
      bedrooms: 3,
      budgetMin: 12_000_000,
      budgetMax: 15_000_000,
      transactionType: 'sale',
    }, NOW);
    expect(report.note).toBe(MATCH_NOTE);
    expect(report.units[0]?.configuration).toBe('3BHK');
    expect(report.units.every((unit) => unit.availability === 'available')).toBe(true);
    expect(report.dealers?.eligible[0].name).toBe('Raj Mehta');
    expect(report.note).toBe(MATCH_NOTE);
  });

  it('answers from records and does not call an assist provider', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const leads = answerBuilderQuestion(ws, 'Kaunse leads assign nahi hue?', NOW);
    expect(leads.text).toMatch(/need assignment/);
    expect(leads.notices[0]).toMatch(/language model did not/);
    const dealers = answerBuilderQuestion(ws, 'Dwarka project ke liye kaunse dealers compatible hain?', NOW);
    expect(dealers.text).toMatch(/Raj Mehta/);
    const rules = answerBuilderQuestion(ws, 'Project ke liye dealer assignment rules batao.', NOW);
    expect(rules.text).toMatch(/project access 25/);
    expect(assistProviderStatus({ BUILDER_ASSIST_PROVIDER: 'some-vendor' }).configured).toBe(false);
    expect(assistProviderStatus({}).label).toMatch(/not connected/);
  });

  it('extracts a requirement with rules and flags data quality without calling anyone fraudulent', () => {
    const extracted = extractBuilderEnquiry('3BHK in Dwarka, budget 1.2 to 1.5 cr');
    expect(extracted.configuration).toBe('3BHK');
    expect(extracted.locality).toBe('Dwarka');
    expect(extracted.budgetMin).toBe(12_000_000);
    expect(extracted.label).toMatch(/language model was not called/);
    const ws = createDemoBuilderWorkspace(NOW);
    const signals = qualitySignals(ws, NOW);
    expect(signals.some((item) => item.label === 'Possible duplicate' && item.detail.includes('phone'))).toBe(true);
    expect(signals.some((item) => item.label === 'Needs verification' && item.code === 'price')).toBe(true);
    expect(signals.some((item) => /fraud/i.test(item.detail))).toBe(false);
    const routed = leadRoutingRows(ws, NOW);
    expect(routed.some((row) => row.buckets.includes('awaiting') || row.buckets.includes('new'))).toBe(true);
    expect(routed.some((row) => row.buckets.includes('visit'))).toBe(true);
  });

  it('records a price change and labels demo reconstruction', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const priced = applyBuilderAction(ws, { type: 'set_unit_price', unitId: 'unt-a101', basePrice: 13000000 }, { now: NOW });
    expect(priced.timeline[0].detail).toMatch(/Unit price changed/);
    expect(priced.timeline[0].actor).toBe('Builder');
    const uploaded = applyBuilderAction(ws, {
      type: 'create_tour',
      tour: { projectId: 'prj-heights', unitId: 'unt-b201', source: 'video', fileName: 'walk.mp4', mimeType: 'video/mp4', sizeBytes: 2_000_000, durationSeconds: 40, consent: true },
    }, { now: NOW });
    const done = applyBuilderAction(uploaded, { type: 'demo_process_tour', id: uploaded.tours[0].id }, { now: NOW });
    expect(done.timeline.some((event) => event.detail === DEMO_RECONSTRUCTION_COMPLETE)).toBe(true);
    expect(done.tours[0].providerMessage).not.toMatch(/reconstructed/);
  });
});
