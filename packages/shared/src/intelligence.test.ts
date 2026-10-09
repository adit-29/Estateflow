import { describe, expect, it } from 'vitest';
import { intentBand, scoreBuyerIntent } from './intent-score';
import { extractIntentTrainingRow, resolveScorer } from './ml-registry';
import { dealerPerformance } from './dealer-performance';
import { learnSpecialization } from './dealer-specialization';
import { layoutToBoxes, roomAreaSqft, totalLayoutArea } from './unit-layout';
import { matchPublicListings } from './public-requirement';
import { applyBuilderAction } from './builder-actions';
import { createDemoBuilderWorkspace } from './builder-demo';

describe('buyer intent', () => {
  it('scores recorded signals on a 0–10 scale and is not 100%', () => {
    const high = scoreBuyerIntent({
      recentEnquiry: true,
      propertyViews: 5,
      siteVisits: 3,
      attendedVisits: 2,
      savedProperties: 2,
      followUpEngaged: true,
      timelineUrgent: true,
      negotiation: true,
      repeatViews: 2,
    }, { demo: true });
    expect(high.score).toBeGreaterThan(7);
    expect(high.score).toBeLessThanOrEqual(10);
    expect(high.disclaimer).toMatch(/guarantee nahi/);
    expect(high.model.trainedAt).toBeNull();
    expect(intentBand(high.score)).toBe('hot');
    const low = scoreBuyerIntent({
      recentEnquiry: false,
      propertyViews: 0,
      siteVisits: 0,
      attendedVisits: 0,
      savedProperties: 0,
      followUpEngaged: false,
      timelineUrgent: false,
      negotiation: false,
      repeatViews: 0,
    });
    expect(low.score).toBe(0);
    expect(intentBand(low.score)).toBe('cold');
  });
});

describe('ml registry', () => {
  it('stays on the rules baseline without labelled history', () => {
    const resolved = resolveScorer({ models: [{ id: 'x', task: 'buyer_intent', version: '0', featureVersion: 'v1', trainedAt: null, labelledOutcomes: 12, metrics: null, status: 'candidate' }] }, 'buyer_intent');
    expect(resolved.mode).toBe('rules_baseline');
    expect(extractIntentTrainingRow({ buyerId: 'b1', features: { views: 2 }, outcome: null }).trainable).toBe(false);
  });
});

describe('performance and specialization', () => {
  it('builds a funnel from stored rows and withholds Delhi rank', () => {
    const snap = dealerPerformance({
      periodLabel: 'Demo store',
      leads: [{ status: 'New' }, { status: 'Qualified' }, { status: 'Lost' }],
      visits: [{ status: 'Completed' }],
      deals: [{ stage: 'Negotiation', value: 100 }, { stage: 'Lost', value: 50 }],
      commissions: [{ amount: 10, status: 'expected' }, { amount: 5, status: 'paid' }],
    });
    expect(snap.funnel.lead).toBe(3);
    expect(snap.expectedCommission).toBe(10);
    expect(snap.cohort.available).toBe(false);
  });

  it('does not invent specialization for a tiny sample', () => {
    expect(learnSpecialization([{ locality: 'Dwarka', configuration: '3BHK', propertyType: 'Flat', budgetBand: '₹80L–₹1.5Cr', transaction: 'sale' }], '6 months').ready).toBe(false);
  });
});

describe('layout geometry', () => {
  it('computes area and extrudes boxes without claiming a scan', () => {
    const layout = { version: 1 as const, unit: 'ft' as const, rooms: [{ id: 'r1', type: 'bedroom' as const, label: 'Bed 1', x: 0, y: 0, width: 12, length: 14, rotation: 0 }] };
    expect(roomAreaSqft(layout.rooms[0])).toBe(168);
    expect(totalLayoutArea(layout)).toBe(168);
    expect(layoutToBoxes(layout)[0].height).toBe(9);
  });

  it('stores a structured unit layout through the builder action', () => {
    const ws = createDemoBuilderWorkspace(new Date('2026-10-01T10:00:00+05:30'));
    const next = applyBuilderAction(ws, {
      type: 'save_unit_layout',
      unitId: 'unt-a101',
      layout: { version: 1, unit: 'ft', rooms: [{ id: 'r-bed', type: 'bedroom', label: 'Bed', x: 0, y: 0, width: 10, length: 12, rotation: 0 }] },
    });
    expect(next.units.find((unit) => unit.id === 'unt-a101')?.layout?.rooms).toHaveLength(1);
    expect(next.timeline[0]?.detail).toMatch(/not a photo reconstruction/i);
  });
});

describe('public requirement matching', () => {
  it('keeps rent listings out of a buy search', () => {
    const rows = matchPublicListings(
      [
        { id: 'a', title: 'Buy', locality: 'Dwarka', city: 'Delhi', purpose: 'buy', type: 'Flat', beds: 3, areaSqft: 1400, price: 14000000, status: 'Active', features: [] },
        { id: 'b', title: 'Rent', locality: 'Dwarka', city: 'Delhi', purpose: 'rent', type: 'Flat', beds: 3, areaSqft: 1400, price: 32000, status: 'Active', features: [] },
      ],
      { purpose: 'buy', localities: ['Dwarka'], propertyType: 'Flat', beds: '3', minArea: '', maxArea: '', areaUnit: 'sqft', minPrice: '', maxPrice: '15000000', readiness: '', extras: [] },
    );
    expect(rows.map((row) => row.listing.id)).toEqual(['a']);
  });
});
