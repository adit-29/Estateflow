import { describe, expect, it } from 'vitest';
import { applyBuilderAction } from './builder-actions';
import { createDemoBuilderWorkspace } from './builder-demo';
import {
  BuilderConfiguredReconstructionProvider,
  DEMO_PROCESSING_MESSAGE,
  BuilderMockReconstructionProvider,
  BuilderUnconfiguredReconstructionProvider,
  assignmentWeightsFromEnv,
  builderKpis,
  canTransitionTour,
  createBuilderReconstructionProvider,
  dealerLeadViews,
  publicListingBlockers,
  rankDealers,
  requirementFromLead,
  unitTotalPrice,
} from './builder-portal';

const NOW = new Date('2026-09-27T07:00:00.000Z');

describe('builder tour transitions', () => {
  it('rejects publishing a job that is still processing', () => {
    expect(canTransitionTour('processing', 'published')).toBe(false);
    expect(canTransitionTour('uploaded', 'queued')).toBe(true);
    expect(canTransitionTour('failed', 'queued')).toBe(true);
    const ws = createDemoBuilderWorkspace(NOW);
    const uploaded = applyBuilderAction(ws, {
      type: 'create_tour',
      tour: {
        projectId: 'prj-heights',
        unitId: 'unt-a101',
        source: 'video',
        fileName: 'walk.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 2_000_000,
        durationSeconds: 40,
        consent: true,
      },
    }, { now: NOW });
    const tour = uploaded.tours[0];
    expect(() => applyBuilderAction(uploaded, { type: 'transition_tour', id: tour.id, to: 'published' }, { now: NOW })).toThrow(/processing|uploaded/);
  });

  it('keeps demo processing labelled and does not invent a percentage', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const uploaded = applyBuilderAction(ws, {
      type: 'create_tour',
      tour: {
        projectId: 'prj-heights',
        unitId: 'unt-b101',
        source: 'video',
        fileName: 'walk.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 2_000_000,
        durationSeconds: 40,
        consent: true,
      },
    }, { now: NOW });
    const done = applyBuilderAction(uploaded, { type: 'demo_process_tour', id: uploaded.tours[0].id }, { now: NOW });
    const tour = done.tours[0];
    expect(tour.status).toBe('ready_for_review');
    expect(tour.progress).toBeNull();
    expect(tour.providerMessage).toBe(DEMO_PROCESSING_MESSAGE);
    expect(tour.resultKind).toBe('sample');
    expect(() => applyBuilderAction(done, { type: 'demo_process_tour', id: tour.id }, { now: NOW })).toThrow(/Upload the media/);
  });

  it('does not queue a live tour without a provider job reference', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    ws.dataSource = 'live';
    const uploaded = applyBuilderAction(ws, {
      type: 'create_tour',
      tour: {
        projectId: 'prj-heights',
        unitId: 'unt-a101',
        source: 'video',
        fileName: 'walk.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 2_000_000,
        durationSeconds: 40,
        consent: true,
      },
    }, { now: NOW });
    expect(() => applyBuilderAction(uploaded, { type: 'transition_tour', id: uploaded.tours[0].id, to: 'queued' }, { now: NOW })).toThrow(/not sent for processing/);
  });
});

describe('reconstruction provider selection', () => {
  it('never selects the mock provider for a configured environment', () => {
    expect(createBuilderReconstructionProvider({})).toBeInstanceOf(BuilderUnconfiguredReconstructionProvider);
    expect(createBuilderReconstructionProvider({ RECONSTRUCTION_PROVIDER: 'mock', RECONSTRUCTION_API_KEY: 'x' })).toBeInstanceOf(BuilderUnconfiguredReconstructionProvider);
    const named = createBuilderReconstructionProvider({ RECONSTRUCTION_PROVIDER: 'some-vendor', RECONSTRUCTION_API_KEY: 'x' });
    expect(named).toBeInstanceOf(BuilderConfiguredReconstructionProvider);
    expect(named.configured).toBe(false);
    expect(new BuilderMockReconstructionProvider().configured).toBe(true);
  });

  it('rejects undocumented vendor calls', async () => {
    const provider = new BuilderConfiguredReconstructionProvider('some-vendor');
    await expect(provider.createJob({
      jobId: '1',
      organizationId: 'o',
      projectId: 'p',
      unitId: null,
      mode: 'video',
      objectKeys: [],
    })).rejects.toThrow(/no adapter/);
  });
});

describe('dealer assignment', () => {
  it('changes the top dealer when the buyer requirement changes', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const open = ws.leads.find((lead) => lead.stage === 'new_lead');
    expect(open).toBeTruthy();
    const janakpuri = rankDealers(ws, requirementFromLead(open!), NOW);
    const dwarka = rankDealers(ws, {
      ...requirementFromLead(open!),
      locality: 'Dwarka',
      configuration: '3BHK',
      budgetMin: 12_000_000,
      budgetMax: 15_000_000,
    }, NOW);
    expect(janakpuri.eligible[0].name).toBe('Amit Kapoor');
    expect(dwarka.eligible[0].name).toBe('Raj Mehta');
    expect(janakpuri.eligible[0].dealerId).not.toBe(dwarka.eligible[0].dealerId);
    expect(janakpuri.eligible[0].label).toBe('Assignment compatibility');
    expect(janakpuri.excluded.map((row) => row.name)).toEqual(expect.arrayContaining(['Meera Iyer', 'Sunil Verma', 'Kavita Rao']));
  });

  it('auto-assigns from the score, then falls back after the response window', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const history = ws.leads.find((lead) => lead.buyerName === 'Ananya Deshmukh');
    expect(history?.stage).toBe('assigned');
    const rows = ws.assignments.filter((row) => row.leadId === history!.id);
    expect(rows.map((row) => `${row.dealerName}:${row.status}`).sort()).toEqual(['Amit Kapoor:assigned', 'Raj Mehta:timed_out']);
    expect(rows.every((row) => row.weights.projectAccess === 25)).toBe(true);
    const details = ws.timeline.filter((event) => event.entityId === history!.id).map((event) => event.detail);
    expect(details.some((detail) => detail.includes('No response'))).toBe(true);
    expect(details.some((detail) => detail.includes('Reassignment triggered'))).toBe(true);
  });

  it('hides the buyer until the dealer accepts, and a decline continues auto assignment', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const raj = ws.dealers.find((dealer) => dealer.id === 'd-raj')!;
    const views = dealerLeadViews(ws, raj);
    expect(views.every((view) => view.phone === null)).toBe(true);
    const open = ws.leads.find((lead) => lead.stage === 'new_lead')!;
    const assigned = applyBuilderAction(ws, { type: 'assign_lead', leadId: open.id, mode: 'auto' }, { now: NOW });
    const assignment = assigned.assignments.find((row) => row.leadId === open.id && row.status === 'assigned')!;
    expect(assignment.dealerName).toBe('Amit Kapoor');
    const declined = applyBuilderAction(assigned, {
      type: 'respond_assignment',
      assignmentId: assignment.id,
      decision: 'decline',
      reason: 'budget_mismatch',
      actorDealerId: assignment.dealerId,
    }, { now: NOW });
    const next = declined.assignments.find((row) => row.leadId === open.id && row.status === 'assigned');
    expect(next?.dealerId).not.toBe(assignment.dealerId);
    const acceptedLead = ws.leads.find((lead) => lead.buyerName === 'Sana Qureshi')!;
    const neeraj = ws.dealers.find((dealer) => dealer.id === 'd-neeraj')!;
    const visible = dealerLeadViews(ws, neeraj).find((view) => view.leadId === acceptedLead.id);
    expect(visible?.phone).toBe('9810000003');
    expect(visible?.buyerName).toBe('Sana Qureshi');
  });

  it('records a manual reassignment', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const lead = ws.leads.find((item) => item.buyerName === 'Ananya Deshmukh')!;
    const moved = applyBuilderAction(ws, { type: 'assign_lead', leadId: lead.id, mode: 'manual', dealerId: 'd-neeraj' }, { now: NOW });
    const current = moved.assignments.find((row) => row.leadId === lead.id && row.status === 'assigned');
    expect(current?.dealerName).toBe('Neeraj Sharma');
    expect(moved.timeline.some((event) => event.detail.includes('Reassigned away'))).toBe(true);
  });
});

describe('builder records', () => {
  it('derives KPIs and unit prices from stored rows', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const kpis = builderKpis(ws, { now: NOW });
    expect(kpis.availableUnits).toBe(ws.units.filter((unit) => unit.availability === 'available').length);
    expect(kpis.unitsOnHold).toBe(1);
    expect(kpis.bookedUnits).toBe(1);
    expect(kpis.soldUnits).toBe(1);
    expect(kpis.activeProjects).toBe(1);
    expect(kpis.newLeads).toBe(1);
    expect(kpis.visitsThisWeek).toBe(1);
    expect(kpis.pendingLeadAssignments).toBe(ws.assignments.filter((row) => row.status === 'assigned').length);
    expect(kpis.toursProcessing).toBe(1);
    expect(kpis.dealerResponseRate).not.toBeNull();
    const unit = ws.units.find((item) => item.unitNumber === 'A-101')!;
    expect(unitTotalPrice(unit)).toBe(unit.basePrice + unit.additionalCharges + unit.plc + unit.otherCharges);
  });

  it('audits availability changes and blocks an incomplete public listing', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    const river = ws.projects.find((project) => project.id === 'prj-riverside')!;
    expect(publicListingBlockers(river).length).toBeGreaterThan(0);
    expect(() => applyBuilderAction(ws, { type: 'update_project', id: river.id, patch: { visibility: 'public' } }, { now: NOW })).toThrow(/active project|registration|description/);
    const changed = applyBuilderAction(ws, { type: 'set_unit_status', unitId: 'unt-a101', availability: 'on_hold' }, { now: NOW });
    expect(changed.timeline[0].detail).toMatch(/available to on_hold/);
    expect(changed.units.find((unit) => unit.id === 'unt-a101')?.availability).toBe('on_hold');
  });

  it('refuses media for a unit outside the project and access removal is audited', () => {
    const ws = createDemoBuilderWorkspace(NOW);
    expect(() => applyBuilderAction(ws, {
      type: 'add_media',
      media: {
        projectId: 'prj-riverside',
        unitId: 'unt-a101',
        kind: 'image',
        category: 'Exterior',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        durationSeconds: null,
        objectKey: null,
        visibility: 'private',
        uploadedByName: 'Demo Builder',
      },
    }, { now: NOW })).toThrow(/not in this project/);
    const removed = applyBuilderAction(ws, { type: 'revoke_access', id: 'acc-amit' }, { now: NOW });
    expect(removed.access.some((row) => row.id === 'acc-amit')).toBe(false);
    expect(removed.timeline[0].detail).toMatch(/Access removed/);
  });

  it('reads assignment weights from configuration', () => {
    expect(assignmentWeightsFromEnv({}).projectAccess).toBe(25);
    expect(() => assignmentWeightsFromEnv({ ASSIGNMENT_WEIGHT_PROJECT_ACCESS: '10' })).toThrow(/total 100/);
  });
});
