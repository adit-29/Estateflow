import { applyBuilderAction } from './builder-actions';
import {
  DEMO_PROCESSING_MESSAGE,
  DEFAULT_ASSIGNMENT_WEIGHTS,
  DEFAULT_NOTIFICATION_PREFS,
  DEMO_SEED_REVISION,
  type BuilderWorkspace,
} from './builder-portal';

const HEIGHTS = 'prj-heights';
const RIVER = 'prj-riverside';
const TOWER_A = 'twr-a';
const TOWER_B = 'twr-b';
const FLOOR_A1 = 'flr-a1';
const FLOOR_A2 = 'flr-a2';
const FLOOR_B1 = 'flr-b1';

const FULL_ACCESS = [
  'VIEW_PROJECT',
  'VIEW_INVENTORY',
  'VIEW_PRICING',
  'VIEW_MEDIA',
  'VIEW_3D_TOUR',
  'RECEIVE_LEADS',
  'PROMOTE_PROJECT',
] as const;

function access(id: string, dealerId: string, projectId: string, createdAt: string) {
  return {
    id,
    projectId,
    dealerId,
    towerId: null,
    unitId: null,
    campaignName: projectId === HEIGHTS ? 'Phase 1 launch' : null,
    permissions: [...FULL_ACCESS],
    expiresAt: null,
    createdAt,
  };
}

/** Fictional builder workspace. Counts and rankings come from these records. */
export function createDemoBuilderWorkspace(now = new Date()): BuilderWorkspace {
  const created = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const base: BuilderWorkspace = {
    version: 1,
    demoRevision: DEMO_SEED_REVISION,
    reconstructionConfigured: false,
    dataSource: 'demo',
    storageMode: 'demo_browser',
    organizationId: 'org-demo-builder',
    organizationName: 'EstateFlow Developments',
    settings: {
      mode: 'recommended',
      responseWindowMinutes: 15,
      maxReassignments: 2,
      monthlyLeadLimit: 20,
      weights: { ...DEFAULT_ASSIGNMENT_WEIGHTS },
      notifications: { ...DEFAULT_NOTIFICATION_PREFS },
    },
    projects: [
      {
        id: HEIGHTS,
        name: 'EstateFlow Heights',
        projectType: 'residential',
        developerName: 'EstateFlow Developments',
        city: 'Delhi',
        locality: 'Dwarka',
        address: 'Sector 12, Dwarka (fictional)',
        description: 'Fictional residential project used to demonstrate inventory, media, and dealer assignment.',
        reraNumber: 'DEMO-RERA-EFH-001',
        constructionStatus: 'under_construction',
        possessionDate: '2027-06-30',
        amenities: ['Clubhouse', 'Lift', 'Power backup', 'Visitor parking'],
        visibility: 'dealers',
        status: 'active',
        latitude: 28.5921,
        longitude: 77.046,
        updatedAt: created,
      },
      {
        id: RIVER,
        name: 'Riverside Enclave',
        projectType: 'residential',
        developerName: 'EstateFlow Developments',
        city: 'Delhi',
        locality: 'Janakpuri',
        address: 'Block C, Janakpuri (fictional)',
        description: 'Fictional upcoming project. Not a public listing.',
        reraNumber: null,
        constructionStatus: 'pre_launch',
        possessionDate: '2028-03-31',
        amenities: ['Garden'],
        visibility: 'private',
        status: 'upcoming',
        latitude: null,
        longitude: null,
        updatedAt: created,
      },
    ],
    towers: [
      { id: TOWER_A, projectId: HEIGHTS, name: 'Tower A', sortOrder: 0 },
      { id: TOWER_B, projectId: HEIGHTS, name: 'Tower B', sortOrder: 1 },
      { id: 'twr-r1', projectId: RIVER, name: 'Tower 1', sortOrder: 0 },
    ],
    floors: [
      { id: FLOOR_A1, projectId: HEIGHTS, towerId: TOWER_A, label: 'Floor 1', level: 1 },
      { id: FLOOR_A2, projectId: HEIGHTS, towerId: TOWER_A, label: 'Floor 2', level: 2 },
      { id: FLOOR_B1, projectId: HEIGHTS, towerId: TOWER_B, label: 'Floor 1', level: 1 },
      { id: 'flr-a3', projectId: HEIGHTS, towerId: TOWER_A, label: 'Floor 3', level: 3 },
      { id: 'flr-a4', projectId: HEIGHTS, towerId: TOWER_A, label: 'Floor 4', level: 4 },
      { id: 'flr-a5', projectId: HEIGHTS, towerId: TOWER_A, label: 'Floor 5', level: 5 },
      { id: 'flr-b2', projectId: HEIGHTS, towerId: TOWER_B, label: 'Floor 2', level: 2 },
      { id: 'flr-r1', projectId: RIVER, towerId: 'twr-r1', label: 'Floor 1', level: 1 },
    ],
    units: [
      unit('unt-a101', FLOOR_A1, TOWER_A, HEIGHTS, 'A-101', '3BHK', 3, 2, 1180, 1450, 'Park', true, '1 covered', 12500000, 600000, 250000, 150000, 'available', null, created),
      unit('unt-a102', FLOOR_A1, TOWER_A, HEIGHTS, 'A-102', '3BHK', 3, 2, 1160, 1420, 'Road', true, '1 covered', 12100000, 600000, 400000, 150000, 'on_hold', new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString(), created),
      unit('unt-a201', FLOOR_A2, TOWER_A, HEIGHTS, 'A-201', '3BHK', 3, 2, 1180, 1450, 'Park', true, '1 covered', 12800000, 600000, 250000, 150000, 'booked', null, created),
      unit('unt-a202', FLOOR_A2, TOWER_A, HEIGHTS, 'A-202', '4BHK', 4, 3, 1560, 1890, 'Park', true, '2 covered', 16800000, 750000, 300000, 200000, 'sold', null, created),
      unit('unt-b101', FLOOR_B1, TOWER_B, HEIGHTS, 'B-101', '2BHK', 2, 2, 820, 1040, 'Garden', false, '1 open', 8600000, 400000, 0, 100000, 'available', null, created),
      unit('unt-b102', FLOOR_B1, TOWER_B, HEIGHTS, 'B-102', '2BHK', 2, 2, 840, 1060, 'Road', true, '1 covered', 8900000, 400000, 150000, 100000, 'unavailable', null, created),
      unit('unt-r101', 'flr-r1', 'twr-r1', RIVER, 'R-101', '3BHK', 3, 2, 1100, 1360, 'East', true, '1 covered', 9800000, 300000, 0, 0, 'available', null, created),
      unit('unt-a301', 'flr-a3', TOWER_A, HEIGHTS, 'A-301', '3BHK', 3, 2, 1180, 1450, 'Park', true, '1 covered', 12900000, 600000, 200000, 150000, 'available', null, created),
      unit('unt-a302', 'flr-a3', TOWER_A, HEIGHTS, 'A-302', '3BHK', 3, 2, 1160, 1420, 'Road', true, '1 covered', 12700000, 600000, 180000, 150000, 'available', null, created),
      unit('unt-a303', 'flr-a3', TOWER_A, HEIGHTS, 'A-303', '2BHK', 2, 2, 860, 1080, 'Garden', false, '1 open', 9200000, 400000, 0, 100000, 'available', null, created),
      unit('unt-a401', 'flr-a4', TOWER_A, HEIGHTS, 'A-401', '3BHK', 3, 2, 1200, 1480, 'Park', true, '1 covered', 13200000, 600000, 220000, 150000, 'available', null, created),
      unit('unt-a402', 'flr-a4', TOWER_A, HEIGHTS, 'A-402', '4BHK', 4, 3, 1500, 1820, 'Park', true, '2 covered', 16200000, 700000, 250000, 180000, 'available', null, created),
      unit('unt-a501', 'flr-a5', TOWER_A, HEIGHTS, 'A-501', '3BHK', 3, 2, 1180, 1450, 'Road', true, '1 covered', 21000000, 600000, 200000, 150000, 'available', null, created),
      unit('unt-a502', 'flr-a5', TOWER_A, HEIGHTS, 'A-502', '3BHK', 3, 2, 1170, 1440, 'Garden', true, '1 covered', 13100000, 600000, 180000, 150000, 'available', null, created),
      unit('unt-b201', 'flr-b2', TOWER_B, HEIGHTS, 'B-201', '2BHK', 2, 2, 830, 1050, 'Garden', true, '1 covered', 9000000, 400000, 0, 100000, 'available', null, created),
      unit('unt-b202', 'flr-b2', TOWER_B, HEIGHTS, 'B-202', '2BHK', 2, 2, 840, 1060, 'Road', false, '1 open', 8800000, 350000, 0, 100000, 'available', null, created),
      unit('unt-b203', 'flr-b2', TOWER_B, HEIGHTS, 'B-203', '3BHK', 3, 2, 1120, 1380, 'Park', true, '1 covered', 12400000, 500000, 150000, 120000, 'available', null, created),
      unit('unt-b204', 'flr-b2', TOWER_B, HEIGHTS, 'B-204', '3BHK', 3, 2, 1140, 1400, 'Park', true, '1 covered', 12600000, 500000, 150000, 120000, 'available', null, created),
    ],
    media: [
      media('med-ext', HEIGHTS, null, 'image', 'Exterior', 'heights-exterior.jpg', 'image/jpeg', 2400000, 0, created),
      media('med-lobby', HEIGHTS, null, 'image', 'Lobby', 'heights-lobby.jpg', 'image/jpeg', 1800000, 1, created),
      media('med-plan', HEIGHTS, 'unt-a101', 'floor_plan', 'Floor plan', 'a101-plan.pdf', 'application/pdf', 420000, 2, created),
      media('med-walk', HEIGHTS, 'unt-a101', 'video', 'Unit walkthrough', 'a101-walkthrough.mp4', 'video/mp4', 48000000, 3, created, 95),
      media('med-plan-b', HEIGHTS, 'unt-b101', 'floor_plan', 'Floor plan', 'b101-plan.pdf', 'application/pdf', 380000, 4, created),
      media('med-amenity', HEIGHTS, null, 'video', 'Amenity video', 'heights-amenities.mp4', 'video/mp4', 36000000, 5, created, 70),
      media('med-ext-copy', HEIGHTS, null, 'image', 'Exterior', 'heights-exterior.jpg', 'image/jpeg', 2400000, 6, created),
    ],
    tours: [
      {
        id: 'tour-a101',
        projectId: HEIGHTS,
        unitId: 'unt-a101',
        source: 'existing_asset',
        status: 'published',
        fileName: null,
        mimeType: null,
        sizeBytes: null,
        durationSeconds: null,
        consentAt: created,
        demoSimulation: true,
        provider: 'demo',
        providerJobRef: null,
        progress: null,
        providerMessage: DEMO_PROCESSING_MESSAGE,
        resultKind: 'sample',
        resultAssetKey: null,
        resultVersion: 'illustrative-sample',
        resultCreatedAt: created,
        errorMessage: null,
        updatedAt: created,
      },
      {
        id: 'tour-processing',
        projectId: HEIGHTS,
        unitId: 'unt-a102',
        source: 'video',
        status: 'processing',
        fileName: 'a102-walkthrough.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 52000000,
        durationSeconds: 110,
        consentAt: created,
        demoSimulation: true,
        provider: 'demo',
        providerJobRef: null,
        progress: null,
        providerMessage: DEMO_PROCESSING_MESSAGE,
        resultKind: null,
        resultAssetKey: null,
        resultVersion: null,
        resultCreatedAt: null,
        errorMessage: null,
        updatedAt: created,
      },
    ],
    dealers: [
      dealer('d-raj', 'Raj Mehta', 'EstateFlow Demo Realty', ['Dwarka'], ['Janakpuri'], ['3BHK', '4BHK'], 10000000, 20000000, 2, 8, 23, 25, [HEIGHTS], 'demo-dealer-001', created, true),
      dealer('d-amit', 'Amit Kapoor', 'Kapoor Homes Demo', ['Janakpuri', 'Dwarka'], [], ['2BHK', '3BHK'], 7000000, 14000000, 1, 6, 16, 20, [], null, created, true),
      dealer('d-neeraj', 'Neeraj Sharma', 'Sharma Estates Demo', ['Palam'], ['Janakpuri', 'Dwarka'], ['3BHK'], 9000000, 16000000, 3, 8, 6, 11, [], null, created, false),
      dealer('d-meera', 'Meera Iyer', 'Iyer Associates Demo', ['Dwarka'], [], ['3BHK'], 10000000, 18000000, 6, 6, 12, 14, [], null, created, true),
      dealer('d-kavita', 'Kavita Rao', 'Rao Commercial Demo', ['Gurugram'], [], ['Office'], 20000000, 80000000, 0, 4, 4, 5, [], null, created, true, {
        propertyTypes: ['commercial'],
      }),
      dealer('d-sunil', 'Sunil Verma', 'Verma Realty Demo', ['Dwarka'], [], ['3BHK'], 8000000, 15000000, 0, 4, 1, 4, [], null, created, false, {
        suspended: true,
      }),
      dealer('d-farah', 'Farah Khan', 'Khan Homes Demo', ['Noida'], [], ['3BHK'], 9000000, 16000000, 0, 5, 8, 10, [], null, created, true),
      dealer('d-vikram', 'Vikram Sethi', 'Sethi Homes Demo', ['Rohini'], ['Dwarka'], ['2BHK'], 7000000, 11000000, 0, 5, 9, 12, [], null, created, true),
    ],
    access: [
      access('acc-raj', 'd-raj', HEIGHTS, created),
      access('acc-amit', 'd-amit', HEIGHTS, created),
      access('acc-neeraj', 'd-neeraj', HEIGHTS, created),
      access('acc-meera', 'd-meera', HEIGHTS, created),
      access('acc-sunil', 'd-sunil', HEIGHTS, created),
      access('acc-raj-r', 'd-raj', RIVER, created),
      access('acc-amit-r', 'd-amit', RIVER, created),
    ],
    groups: [{ id: 'grp-dwarka', name: 'Dwarka residential', campaignName: 'Phase 1 launch', dealerIds: ['d-raj', 'd-amit'] }],
    leads: [],
    assignments: [],
    timeline: [
      { id: 'evt-seed', at: created, kind: 'audit', entity: 'project', entityId: HEIGHTS, detail: 'Demo workspace seeded from fictional records' },
    ],
    seq: 200,
  };

  let ws = base;
  const past = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  ws = applyBuilderAction(ws, {
    type: 'create_lead',
    lead: {
      projectId: HEIGHTS,
      unitId: 'unt-a101',
      buyerName: 'Ananya Deshmukh',
      phone: '9810000001',
      budgetMin: 12000000,
      budgetMax: 15000000,
      bedrooms: 3,
      configuration: '3BHK',
      transactionType: 'sale',
      locality: 'Dwarka',
      propertyType: 'residential',
      requirementNote: '3BHK, ready or near possession',
    },
  }, { now: past });
  const historyId = ws.leads[0].id;
  ws = applyBuilderAction(ws, { type: 'assign_lead', leadId: historyId, mode: 'auto' }, { now: past });
  ws = applyBuilderAction(ws, { type: 'sweep_timeouts' }, { now: new Date(now.getTime() - 5 * 60 * 1000) });

  ws = applyBuilderAction(ws, {
    type: 'create_lead',
    lead: {
      projectId: HEIGHTS,
      unitId: 'unt-b101',
      buyerName: 'Rohit Khanna',
      phone: '9810000002',
      budgetMin: 8000000,
      budgetMax: 10000000,
      bedrooms: 2,
      configuration: '2BHK',
      transactionType: 'sale',
      locality: 'Janakpuri',
      propertyType: 'residential',
      requirementNote: '2BHK near Janakpuri',
    },
  }, { now });

  const visitAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  ws = applyBuilderAction(ws, {
    type: 'create_lead',
    lead: {
      projectId: HEIGHTS,
      unitId: 'unt-a201',
      buyerName: 'Sana Qureshi',
      phone: '9810000003',
      budgetMin: 11000000,
      budgetMax: 14000000,
      bedrooms: 3,
      configuration: '3BHK',
      transactionType: 'sale',
      locality: 'Dwarka',
      propertyType: 'residential',
      requirementNote: 'Site visit completed',
    },
  }, { now: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) });
  const visitLead = ws.leads[0].id;
  ws = applyBuilderAction(ws, { type: 'assign_lead', leadId: visitLead, mode: 'manual', dealerId: 'd-neeraj' }, { now: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) });
  const visitAssignment = ws.assignments.find((row) => row.leadId === visitLead && row.status === 'assigned');
  if (visitAssignment) {
    ws = applyBuilderAction(ws, { type: 'respond_assignment', assignmentId: visitAssignment.id, decision: 'accept' }, { now: new Date(now.getTime() - 36 * 60 * 60 * 1000) });
    ws = applyBuilderAction(ws, {
      type: 'advance_lead',
      leadId: visitLead,
      stage: 'visited',
      visitAt: visitAt.toISOString(),
      visitOutcome: 'Buyer wants a revised price',
      bookingStatus: null,
      commissionStatus: 'not_recorded',
    }, { now: visitAt });
  }

  ws = applyBuilderAction(ws, {
    type: 'create_lead',
    lead: {
      projectId: HEIGHTS,
      unitId: 'unt-a101',
      buyerName: 'Priya Nair',
      phone: '9810000004',
      budgetMin: 12000000,
      budgetMax: 15000000,
      bedrooms: 3,
      configuration: '3BHK',
      transactionType: 'sale',
      locality: 'Dwarka',
      propertyType: 'residential',
      requirementNote: '3BHK, ready or near possession',
    },
  }, { now });
  const openLead = ws.leads[0].id;
  ws = applyBuilderAction(ws, { type: 'assign_lead', leadId: openLead, mode: 'auto' }, { now });

  ws = applyBuilderAction(ws, {
    type: 'create_lead',
    lead: {
      projectId: HEIGHTS,
      unitId: 'unt-a102',
      buyerName: 'Tanya Mehra',
      phone: '9810000011',
      budgetMin: 12000000,
      budgetMax: 15500000,
      bedrooms: 3,
      configuration: '3BHK',
      transactionType: 'sale',
      locality: 'Dwarka',
      propertyType: 'residential',
      requirementNote: '3BHK park facing — waiting for dealer response',
    },
  }, { now });
  const rajLead = ws.leads[0].id;
  ws = applyBuilderAction(ws, { type: 'assign_lead', leadId: rajLead, mode: 'manual', dealerId: 'd-raj' }, { now });

  const older = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const stories: { name: string; phone: string; unitId: string; configuration: string; bedrooms: number; budgetMin: number; budgetMax: number; locality: string; note: string; stage: 'qualified' | 'booking' | 'lost' | 'visit_planned' | 'needs_reassignment'; dealer: 'd-amit' | 'd-neeraj' }[] = [
    { name: 'Kabir Anand', phone: '9810000005', unitId: 'unt-a301', configuration: '3BHK', bedrooms: 3, budgetMin: 12000000, budgetMax: 14500000, locality: 'Dwarka', note: 'Qualified after a call', stage: 'qualified', dealer: 'd-amit' },
    { name: 'Mehul Shah', phone: '9810000006', unitId: 'unt-a401', configuration: '3BHK', bedrooms: 3, budgetMin: 12500000, budgetMax: 15000000, locality: 'Dwarka', note: 'Booking form requested', stage: 'booking', dealer: 'd-amit' },
    { name: 'Isha Bansal', phone: '9810000007', unitId: 'unt-b203', configuration: '3BHK', bedrooms: 3, budgetMin: 11000000, budgetMax: 14000000, locality: 'Dwarka', note: 'Chose another project', stage: 'lost', dealer: 'd-amit' },
    { name: 'Dev Patel', phone: '9810000008', unitId: 'unt-a302', configuration: '3BHK', bedrooms: 3, budgetMin: 12000000, budgetMax: 14000000, locality: 'Dwarka', note: 'Visit planned earlier', stage: 'visit_planned', dealer: 'd-neeraj' },
    { name: 'Rohit Khanna', phone: '9810000002', unitId: 'unt-b202', configuration: '2BHK', bedrooms: 2, budgetMin: 8000000, budgetMax: 9500000, locality: 'Janakpuri', note: 'Possible repeat enquiry', stage: 'needs_reassignment', dealer: 'd-amit' },
  ];
  for (const story of stories) {
    ws = applyBuilderAction(ws, {
      type: 'create_lead',
      lead: {
        projectId: HEIGHTS,
        unitId: story.unitId,
        buyerName: story.name,
        phone: story.phone,
        budgetMin: story.budgetMin,
        budgetMax: story.budgetMax,
        bedrooms: story.bedrooms,
        configuration: story.configuration,
        transactionType: 'sale',
        locality: story.locality,
        propertyType: 'residential',
        requirementNote: story.note,
      },
    }, { now: older });
    const leadId = ws.leads[0].id;
    ws = applyBuilderAction(ws, { type: 'assign_lead', leadId, mode: 'manual', dealerId: story.dealer }, { now: older });
    const assignment = ws.assignments.find((row) => row.leadId === leadId && row.status === 'assigned');
    if (!assignment) continue;
    if (story.stage === 'needs_reassignment') {
      ws = applyBuilderAction(ws, { type: 'respond_assignment', assignmentId: assignment.id, decision: 'decline', reason: 'no_capacity', actorDealerId: story.dealer }, { now: older });
      continue;
    }
    ws = applyBuilderAction(ws, { type: 'respond_assignment', assignmentId: assignment.id, decision: 'accept', actorDealerId: story.dealer }, { now: older });
    ws = applyBuilderAction(ws, {
      type: 'advance_lead',
      leadId,
      stage: story.stage,
      visitAt: story.stage === 'visit_planned' ? older.toISOString() : null,
      visitOutcome: story.stage === 'visit_planned' ? 'Visit was planned, not completed' : null,
      bookingStatus: story.stage === 'booking' ? 'booking' : null,
      commissionStatus: 'not_recorded',
    }, { now: older });
  }
  return ws;
}

function unit(
  id: string,
  floorId: string,
  towerId: string,
  projectId: string,
  unitNumber: string,
  configuration: string,
  bedrooms: number,
  bathrooms: number,
  carpet: number,
  saleable: number,
  facing: string,
  balcony: boolean,
  parking: string,
  base: number,
  additional: number,
  plc: number,
  other: number,
  availability: BuilderWorkspace['units'][number]['availability'],
  holdExpiresAt: string | null,
  updatedAt: string,
): BuilderWorkspace['units'][number] {
  return {
    id,
    projectId,
    towerId,
    floorId,
    unitNumber,
    configuration,
    bedrooms,
    bathrooms,
    carpetAreaSqft: carpet,
    saleableAreaSqft: saleable,
    facing,
    balcony,
    parking,
    basePrice: base,
    additionalCharges: additional,
    plc,
    otherCharges: other,
    availability,
    holdExpiresAt,
    bookingStatus: availability === 'booked' || availability === 'sold' ? availability : null,
    lastConfirmedAt: updatedAt,
    updatedAt,
    layout:
      id === 'unt-a101'
        ? {
            version: 1,
            unit: 'ft',
            rooms: [
              { id: 'r-living', type: 'living', label: 'Living', x: 0, y: 0, width: 16, length: 12, rotation: 0 },
              { id: 'r-bed', type: 'bedroom', label: 'Bedroom', x: 16, y: 0, width: 12, length: 14, rotation: 0 },
              { id: 'r-kit', type: 'kitchen', label: 'Kitchen', x: 0, y: 12, width: 10, length: 8, rotation: 0 },
              { id: 'r-bath', type: 'bathroom', label: 'Bath', x: 10, y: 12, width: 6, length: 8, rotation: 0 },
              { id: 'r-bal', type: 'balcony', label: 'Balcony', x: 16, y: 14, width: 12, length: 4, rotation: 0 },
            ],
          }
        : null,
  };
}

function media(
  id: string,
  projectId: string,
  unitId: string | null,
  kind: BuilderWorkspace['media'][number]['kind'],
  category: string,
  fileName: string,
  mimeType: string,
  sizeBytes: number,
  sortOrder: number,
  createdAt: string,
  durationSeconds: number | null = null,
): BuilderWorkspace['media'][number] {
  return {
    id,
    projectId,
    unitId,
    kind,
    category,
    fileName,
    mimeType,
    sizeBytes,
    durationSeconds,
    storage: 'demo_browser',
    objectKey: null,
    visibility: 'dealers',
    isPrimary: sortOrder === 0,
    sortOrder,
    processingStatus: 'stored',
    uploadedByName: 'Demo Builder',
    createdAt,
  };
}

function dealer(
  id: string,
  name: string,
  agencyName: string,
  localities: string[],
  nearby: string[],
  configurations: string[],
  budgetMin: number,
  budgetMax: number,
  openLeads: number,
  capacity: number,
  responses: number,
  assignments: number,
  preferred: string[],
  platformDealerId: string | null,
  lastActivityAt: string,
  verified: boolean,
  extra: Partial<BuilderWorkspace['dealers'][number]> = {},
): BuilderWorkspace['dealers'][number] {
  return {
    id,
    name,
    agencyName,
    active: true,
    suspended: false,
    verified,
    localities,
    nearbyLocalities: nearby,
    propertyTypes: ['residential'],
    configurations,
    transactionTypes: ['sale'],
    budgetMin,
    budgetMax,
    optedOutLeadTypes: [],
    openLeads,
    capacity,
    responsesInWindow: responses,
    assignmentsInWindow: assignments,
    responseWindowDays: 30,
    preferredProjectIds: preferred,
    lastActivityAt,
    platformDealerId,
    agencyId: null,
    ...extra,
  };
}
