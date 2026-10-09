import { videoLimits } from './reconstruction';

/** Builder project lifecycle. Draft and incomplete projects are not public listings. */
export const PROJECT_STATUSES = ['draft', 'active', 'upcoming', 'on_hold', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = ['residential', 'commercial', 'mixed', 'plotted'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const CONSTRUCTION_STATUSES = ['pre_launch', 'under_construction', 'ready_to_move', 'completed'] as const;
export type ConstructionStatus = (typeof CONSTRUCTION_STATUSES)[number];

export const PROJECT_VISIBILITY = ['private', 'dealers', 'public'] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[number];

export const UNIT_AVAILABILITY = ['available', 'on_hold', 'booked', 'sold', 'unavailable'] as const;
export type UnitAvailability = (typeof UNIT_AVAILABILITY)[number];

export const BUILDER_TOUR_STATUSES = [
  'draft',
  'uploading',
  'uploaded',
  'queued',
  'processing',
  'needs_more_data',
  'ready_for_review',
  'approved',
  'published',
  'failed',
  'cancelled',
] as const;
export type BuilderTourStatus = (typeof BUILDER_TOUR_STATUSES)[number];

export const LEAD_STAGES = [
  'new_lead',
  'assigned',
  'needs_reassignment',
  'accepted',
  'contacted',
  'qualified',
  'visit_planned',
  'visited',
  'negotiation',
  'booking',
  'won',
  'lost',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const ACCESS_PERMISSIONS = [
  'VIEW_PROJECT',
  'VIEW_INVENTORY',
  'VIEW_PRICING',
  'VIEW_MEDIA',
  'VIEW_3D_TOUR',
  'RECEIVE_LEADS',
  'PROMOTE_PROJECT',
] as const;
export type AccessPermission = (typeof ACCESS_PERMISSIONS)[number];

export const DECLINE_REASONS = [
  'not_my_area',
  'budget_mismatch',
  'no_capacity',
  'requirement_mismatch',
  'temporary_unavailable',
  'other',
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const ASSIGNMENT_MODES = ['manual', 'recommended', 'auto'] as const;
export type AssignmentMode = (typeof ASSIGNMENT_MODES)[number];

export const ASSIGNMENT_STATUSES = ['assigned', 'accepted', 'declined', 'timed_out', 'reassigned'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const DEMO_PROCESSING_MESSAGE = 'Demo processing — no external reconstruction service is being called.';
export const DEMO_RECONSTRUCTION_COMPLETE = 'Demo reconstruction completed';
export const DEMO_TOUR_LABEL = 'DEMO 3D TOUR';
export const DEMO_TOUR_DISCLAIMER = 'Illustrative sample scene — not generated from this upload.';
export const PROVIDER_NOT_CONFIGURED_LABEL = '3D processing provider is not configured.';
export const DEMO_SEED_REVISION = 3;

export interface NotificationPrefs {
  newLead: boolean;
  leadAssigned: boolean;
  dealerDeclined: boolean;
  dealerAccepted: boolean;
  noResponse: boolean;
  tourComplete: boolean;
  tourFailed: boolean;
  priceChanged: boolean;
  statusChanged: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  newLead: true,
  leadAssigned: true,
  dealerDeclined: true,
  dealerAccepted: true,
  noResponse: true,
  tourComplete: true,
  tourFailed: true,
  priceChanged: true,
  statusChanged: true,
};

export function notificationPrefsFrom(value: unknown): NotificationPrefs {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (!value || typeof value !== 'object') return prefs;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(prefs) as (keyof NotificationPrefs)[]) {
    if (typeof record[key] === 'boolean') prefs[key] = record[key];
  }
  return prefs;
}
export const MEDIA_CONSENT_TEXT = 'I confirm that I have the right to upload and process this property media.';

export const BUILDER_CAPTURE_GUIDANCE = [
  'Keep the camera steady.',
  'Move slowly through the property.',
  'Cover each room, including corners.',
  'Capture doorways and transitions between rooms.',
  'Avoid rapid camera movement.',
  'Keep lighting reasonably consistent.',
  'Avoid people and private documents in the footage.',
  'More complete room coverage improves reconstruction potential.',
  'A video or photo set will not always produce a complete 3D model.',
];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  upcoming: 'Upcoming',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

export const UNIT_STATUS_LABEL: Record<UnitAvailability, string> = {
  available: 'Available',
  on_hold: 'On hold',
  booked: 'Booked',
  sold: 'Sold',
  unavailable: 'Unavailable',
};

export const BUILDER_TOUR_STATUS_LABEL: Record<BuilderTourStatus, string> = {
  draft: 'Draft',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  queued: 'Queued',
  processing: 'Processing',
  needs_more_data: 'Needs more data',
  ready_for_review: 'Ready for review',
  approved: 'Approved',
  published: 'Published',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new_lead: 'New lead',
  assigned: 'Assigned',
  needs_reassignment: 'Needs reassignment',
  accepted: 'Accepted',
  contacted: 'Contacted',
  qualified: 'Qualified',
  visit_planned: 'Visit planned',
  visited: 'Visited',
  negotiation: 'Negotiation',
  booking: 'Booking',
  won: 'Won',
  lost: 'Lost',
};

export const DECLINE_REASON_LABEL: Record<DeclineReason, string> = {
  not_my_area: 'Not my area',
  budget_mismatch: 'Budget mismatch',
  no_capacity: 'No capacity',
  requirement_mismatch: 'Buyer requirement mismatch',
  temporary_unavailable: 'Temporary unavailable',
  other: 'Other',
};

const TOUR_TRANSITIONS: Record<BuilderTourStatus, BuilderTourStatus[]> = {
  draft: ['uploading', 'cancelled'],
  uploading: ['uploaded', 'failed', 'cancelled'],
  uploaded: ['queued', 'cancelled'],
  queued: ['processing', 'failed', 'cancelled'],
  processing: ['needs_more_data', 'ready_for_review', 'failed', 'cancelled'],
  needs_more_data: ['uploading', 'queued', 'cancelled'],
  ready_for_review: ['approved', 'cancelled'],
  approved: ['published', 'cancelled'],
  published: ['approved', 'cancelled'],
  failed: ['queued'],
  cancelled: [],
};

export class BuilderRuleError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_transition' | 'not_found' | 'forbidden' | 'validation' | 'conflict' | 'provider_not_configured' = 'validation',
  ) {
    super(message);
    this.name = 'BuilderRuleError';
  }
}

export function canTransitionTour(from: string, to: BuilderTourStatus): boolean {
  return (TOUR_TRANSITIONS[from as BuilderTourStatus] ?? []).includes(to);
}

export function assertTourTransition(from: string, to: BuilderTourStatus): void {
  if (!canTransitionTour(from, to)) {
    throw new BuilderRuleError(`Cannot move a 3D tour from ${from} to ${to}.`, 'invalid_transition');
  }
}

export interface AssignmentWeights {
  projectAccess: number;
  locality: number;
  specialization: number;
  buyerFit: number;
  response: number;
  capacity: number;
  preference: number;
}

export const DEFAULT_ASSIGNMENT_WEIGHTS: AssignmentWeights = {
  projectAccess: 25,
  locality: 20,
  specialization: 15,
  buyerFit: 15,
  response: 10,
  capacity: 10,
  preference: 5,
};

export function assertAssignmentWeights(weights: AssignmentWeights): void {
  const sum = Object.values(weights).reduce((total, value) => total + value, 0);
  if (sum !== 100 || Object.values(weights).some((value) => !Number.isInteger(value) || value < 0)) {
    throw new BuilderRuleError(`Assignment weights must be non-negative integers that total 100 (got ${sum}).`);
  }
}

export function assignmentWeightsFromEnv(env: Record<string, string | undefined> = process.env): AssignmentWeights {
  const weights = { ...DEFAULT_ASSIGNMENT_WEIGHTS };
  const keys = Object.keys(weights) as (keyof AssignmentWeights)[];
  for (const key of keys) {
    const raw = env[`ASSIGNMENT_WEIGHT_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`];
    if (raw !== undefined && raw.trim() !== '') weights[key] = Number(raw);
  }
  assertAssignmentWeights(weights);
  return weights;
}

export interface BuilderProject {
  id: string;
  name: string;
  projectType: ProjectType;
  developerName: string;
  city: string;
  locality: string;
  address: string;
  description: string;
  reraNumber: string | null;
  constructionStatus: ConstructionStatus;
  possessionDate: string | null;
  amenities: string[];
  visibility: ProjectVisibility;
  status: ProjectStatus;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

export interface BuilderTower {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
}

export interface BuilderFloor {
  id: string;
  projectId: string;
  towerId: string;
  label: string;
  level: number;
}

export interface BuilderUnit {
  id: string;
  projectId: string;
  towerId: string;
  floorId: string;
  unitNumber: string;
  configuration: string;
  bedrooms: number;
  bathrooms: number;
  carpetAreaSqft: number;
  saleableAreaSqft: number;
  facing: string;
  balcony: boolean;
  parking: string;
  basePrice: number;
  additionalCharges: number;
  plc: number;
  otherCharges: number;
  availability: UnitAvailability;
  holdExpiresAt: string | null;
  bookingStatus: string | null;
  lastConfirmedAt: string | null;
  updatedAt: string;
  layout?: import('./unit-layout').UnitLayout | null;
}

export interface BuilderMedia {
  id: string;
  projectId: string;
  unitId: string | null;
  kind: 'image' | 'video' | 'brochure' | 'floor_plan';
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  storage: 'demo_browser' | 'metadata_only' | 'private_s3';
  objectKey: string | null;
  visibility: 'project' | 'dealers' | 'private';
  isPrimary: boolean;
  sortOrder: number;
  processingStatus: 'stored' | 'processing' | 'failed';
  uploadedByName: string;
  createdAt: string;
}

export interface BuilderTourJob {
  id: string;
  projectId: string;
  unitId: string | null;
  source: 'video' | 'photos' | 'existing_asset';
  status: BuilderTourStatus;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  consentAt: string | null;
  demoSimulation: boolean;
  provider: string;
  providerJobRef: string | null;
  /** Present only when a reconstruction provider returned a number. */
  progress: number | null;
  providerMessage: string | null;
  resultKind: 'sample' | 'asset' | null;
  resultAssetKey: string | null;
  resultVersion: string | null;
  resultCreatedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

export interface BuilderDealer {
  id: string;
  name: string;
  agencyName: string;
  active: boolean;
  suspended: boolean;
  verified: boolean;
  localities: string[];
  nearbyLocalities: string[];
  propertyTypes: string[];
  configurations: string[];
  transactionTypes: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  optedOutLeadTypes: string[];
  openLeads: number;
  capacity: number;
  responsesInWindow: number;
  assignmentsInWindow: number;
  responseWindowDays: number;
  preferredProjectIds: string[];
  lastActivityAt: string | null;
  platformDealerId: string | null;
  agencyId: string | null;
}

export interface DealerProjectAccess {
  id: string;
  projectId: string;
  dealerId: string;
  towerId: string | null;
  unitId: string | null;
  campaignName: string | null;
  permissions: AccessPermission[];
  expiresAt: string | null;
  createdAt: string;
}

export interface DealerGroup {
  id: string;
  name: string;
  campaignName: string | null;
  dealerIds: string[];
}

export interface BuilderLead {
  id: string;
  projectId: string;
  unitId: string | null;
  buyerName: string;
  phone: string;
  budgetMin: number;
  budgetMax: number;
  bedrooms: number;
  configuration: string;
  transactionType: string;
  locality: string;
  propertyType: string;
  requirementNote: string;
  stage: LeadStage;
  visitAt: string | null;
  visitOutcome: string | null;
  firstContactAt: string | null;
  bookingStatus: string | null;
  commissionStatus: 'not_recorded' | 'pending' | 'recorded' | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAssignment {
  id: string;
  leadId: string;
  dealerId: string;
  dealerName: string;
  score: number;
  factors: ScoreFactor[];
  weights: AssignmentWeights;
  mode: AssignmentMode;
  status: AssignmentStatus;
  responseWindowMinutes: number;
  assignedAt: string;
  respondedAt: string | null;
  declineReason: DeclineReason | null;
}

export interface WorkspaceEvent {
  id: string;
  at: string;
  kind: 'assignment' | 'audit' | 'tour' | 'lead';
  entity: string;
  entityId: string;
  detail: string;
  actor?: string;
}

export interface BuilderSettings {
  mode: AssignmentMode;
  responseWindowMinutes: number;
  maxReassignments: number;
  monthlyLeadLimit: number | null;
  weights: AssignmentWeights;
  notifications: NotificationPrefs;
}

export interface BuilderWorkspace {
  version: 1;
  /** Demo localStorage is replaced when this does not match the current seed. */
  demoRevision?: number;
  /** Set by the API from server configuration. Never persisted as a reconstruction result. */
  reconstructionConfigured?: boolean;
  dataSource: 'demo' | 'live';
  storageMode: 'demo_browser' | 'metadata_only' | 'private_s3';
  organizationId: string;
  organizationName: string;
  settings: BuilderSettings;
  projects: BuilderProject[];
  towers: BuilderTower[];
  floors: BuilderFloor[];
  units: BuilderUnit[];
  media: BuilderMedia[];
  tours: BuilderTourJob[];
  dealers: BuilderDealer[];
  access: DealerProjectAccess[];
  groups: DealerGroup[];
  leads: BuilderLead[];
  assignments: LeadAssignment[];
  timeline: WorkspaceEvent[];
  seq: number;
}

export function unitTotalPrice(unit: Pick<BuilderUnit, 'basePrice' | 'additionalCharges' | 'plc' | 'otherCharges'>): number {
  return unit.basePrice + unit.additionalCharges + unit.plc + unit.otherCharges;
}

export function publicListingBlockers(project: BuilderProject): string[] {
  const blockers: string[] = [];
  if (project.status !== 'active') blockers.push('Only an active project can be shown as a public listing.');
  if (!project.name.trim() || !project.city.trim() || !project.locality.trim() || !project.address.trim()) {
    blockers.push('Name, city, locality, and address are required.');
  }
  if (!project.reraNumber?.trim()) blockers.push('A RERA or project registration number is required before a public listing.');
  if (!project.description.trim()) blockers.push('A project description is required before a public listing.');
  return blockers;
}

export function dealerResponseRate(dealer: Pick<BuilderDealer, 'responsesInWindow' | 'assignmentsInWindow'>): number | null {
  if (dealer.assignmentsInWindow <= 0) return null;
  return Math.min(1, dealer.responsesInWindow / dealer.assignmentsInWindow);
}

export function collaborationStatus(dealer: Pick<BuilderDealer, 'active' | 'suspended'>): 'Active' | 'Inactive' | 'Suspended' {
  if (dealer.suspended) return 'Suspended';
  if (!dealer.active) return 'Inactive';
  return 'Active';
}

export interface BuilderKpis {
  activeProjects: number;
  availableUnits: number;
  unitsOnHold: number;
  bookedUnits: number;
  soldUnits: number;
  newLeads: number;
  visitsThisWeek: number;
  dealerResponseRate: number | null;
  pendingLeadAssignments: number;
  toursReady: number;
  toursProcessing: number;
}

export function builderKpis(ws: BuilderWorkspace, opts?: { projectId?: string | null; now?: Date }): BuilderKpis {
  const projectId = opts?.projectId ?? null;
  const now = opts?.now ?? new Date();
  const units = ws.units.filter((unit) => !projectId || unit.projectId === projectId);
  const leads = ws.leads.filter((lead) => !projectId || lead.projectId === projectId);
  const leadIds = new Set(leads.map((lead) => lead.id));
  const tours = ws.tours.filter((tour) => !projectId || tour.projectId === projectId);
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const decided = ws.assignments.filter((row) => {
    if (projectId && !leadIds.has(row.leadId)) return false;
    if (new Date(row.assignedAt).getTime() < monthAgo) return false;
    return row.status === 'accepted' || row.status === 'declined' || row.status === 'timed_out';
  });
  const answered = decided.filter((row) => row.status === 'accepted' || row.status === 'declined');
  return {
    activeProjects: ws.projects.filter((project) => project.status === 'active' && (!projectId || project.id === projectId)).length,
    availableUnits: units.filter((unit) => unit.availability === 'available').length,
    unitsOnHold: units.filter((unit) => unit.availability === 'on_hold').length,
    bookedUnits: units.filter((unit) => unit.availability === 'booked').length,
    soldUnits: units.filter((unit) => unit.availability === 'sold').length,
    newLeads: leads.filter((lead) => lead.stage === 'new_lead').length,
    visitsThisWeek: leads.filter((lead) => lead.visitAt && new Date(lead.visitAt).getTime() >= weekAgo && new Date(lead.visitAt).getTime() <= now.getTime()).length,
    dealerResponseRate: decided.length === 0 ? null : answered.length / decided.length,
    pendingLeadAssignments: ws.assignments.filter((row) => row.status === 'assigned' && leadIds.has(row.leadId)).length,
    toursReady: tours.filter((tour) => tour.status === 'ready_for_review' || tour.status === 'approved' || tour.status === 'published').length,
    toursProcessing: tours.filter((tour) => tour.status === 'queued' || tour.status === 'processing').length,
  };
}

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const IMAGE_MAX = 20_000_000;
const PDF_MAX = 30_000_000;

export function validateBuilderMedia(input: {
  name: string;
  mime: string;
  size: number;
  durationSeconds?: number | null;
  kind: BuilderMedia['kind'];
}): string[] {
  const errors: string[] = [];
  const lower = input.name.toLowerCase();
  if (input.kind === 'video') {
    const limits = videoLimits();
    const extensionOk = limits.extensions.some((ext) => lower.endsWith(ext));
    if (!extensionOk || !(limits.mimeTypes as readonly string[]).includes(input.mime)) errors.push('Use an MP4, MOV, or WebM video.');
    if (!Number.isFinite(input.size) || input.size <= 0) errors.push('The file is empty.');
    else if (input.size > limits.maxBytes) errors.push(`Video must be under ${Math.round(limits.maxBytes / 1_000_000)} MB.`);
    if (input.durationSeconds != null) {
      if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < 20) errors.push('Video must be at least 20 seconds.');
      else if (input.durationSeconds > 30 * 60) errors.push('Video must be under 30 minutes.');
    }
    return errors;
  }
  if (input.kind === 'brochure') {
    if (input.mime !== 'application/pdf' || !lower.endsWith('.pdf')) errors.push('A brochure must be a PDF.');
    if (!Number.isFinite(input.size) || input.size <= 0 || input.size > PDF_MAX) errors.push('Brochure must be under 30 MB.');
    return errors;
  }
  const imageOk = IMAGE_EXT.some((ext) => lower.endsWith(ext)) && IMAGE_MIME.includes(input.mime);
  const pdfOk = input.kind === 'floor_plan' && input.mime === 'application/pdf' && lower.endsWith('.pdf');
  if (!imageOk && !pdfOk) errors.push(input.kind === 'floor_plan' ? 'Use a JPEG, PNG, WebP, or PDF floor plan.' : 'Use a JPEG, PNG, or WebP image.');
  const max = pdfOk ? PDF_MAX : IMAGE_MAX;
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > max) errors.push(`File must be under ${Math.round(max / 1_000_000)} MB.`);
  return errors;
}

export interface ScoreFactor {
  key: keyof AssignmentWeights;
  points: number;
  max: number;
  reason: string;
}

export interface ScoredDealer {
  dealerId: string;
  name: string;
  agencyName: string;
  score: number;
  label: 'Assignment compatibility';
  factors: ScoreFactor[];
}

export interface ExcludedDealer {
  dealerId: string;
  name: string;
  reason: string;
}

export interface AssignmentRequirement {
  projectId: string;
  unitId: string | null;
  locality: string;
  propertyType: string;
  configuration: string;
  transactionType: string;
  budgetMin: number;
  budgetMax: number;
}

export interface RankResult {
  eligible: ScoredDealer[];
  excluded: ExcludedDealer[];
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function coversLocality(dealer: BuilderDealer, locality: string): 'exact' | 'nearby' | 'none' {
  const target = norm(locality);
  if (dealer.localities.some((item) => norm(item) === target)) return 'exact';
  if (dealer.nearbyLocalities.some((item) => norm(item) === target)) return 'nearby';
  return 'none';
}

function accessCovers(
  row: DealerProjectAccess,
  dealerId: string,
  requirement: AssignmentRequirement,
  towerId: string | null,
  now: Date,
): boolean {
  if (row.dealerId !== dealerId || row.projectId !== requirement.projectId) return false;
  if (row.expiresAt && new Date(row.expiresAt).getTime() <= now.getTime()) return false;
  if (!row.permissions.includes('RECEIVE_LEADS')) return false;
  if (row.unitId) return row.unitId === requirement.unitId;
  if (row.towerId) return towerId !== null && row.towerId === towerId;
  return true;
}

function budgetFit(dealer: BuilderDealer, requirement: AssignmentRequirement, max: number): { points: number; reason: string } {
  if (!dealer.transactionTypes.some((item) => norm(item) === norm(requirement.transactionType))) {
    return { points: 0, reason: 'Transaction type is outside the dealer’s stated work.' };
  }
  if (dealer.budgetMin == null || dealer.budgetMax == null) {
    return { points: Math.round(max * 0.6), reason: 'Transaction type matches. The dealer has no stated budget range, so budget fit stays partial.' };
  }
  const overlap = Math.min(dealer.budgetMax, requirement.budgetMax) - Math.max(dealer.budgetMin, requirement.budgetMin);
  const span = Math.max(requirement.budgetMax - requirement.budgetMin, 1);
  if (overlap <= 0) return { points: 0, reason: 'Buyer budget does not overlap the dealer’s stated range.' };
  if (overlap / span >= 0.5) return { points: max, reason: 'Buyer budget fits the dealer’s stated range.' };
  return { points: Math.round(max * 0.5), reason: 'Buyer budget only partly overlaps the dealer’s stated range.' };
}

function capacityPoints(openLeads: number, capacity: number, max: number): { points: number; reason: string } {
  const used = capacity <= 0 ? 1 : openLeads / capacity;
  const reason = `${openLeads} assigned leads against a capacity of ${capacity}.`;
  if (used <= 0.5) return { points: max, reason };
  if (used <= 0.8) return { points: Math.round(max * 0.8), reason };
  return { points: Math.round(max * 0.6), reason };
}

export function rankDealers(
  ws: Pick<BuilderWorkspace, 'dealers' | 'access' | 'units' | 'settings' | 'assignments'>,
  requirement: AssignmentRequirement,
  now = new Date(),
): RankResult {
  assertAssignmentWeights(ws.settings.weights);
  const weights = ws.settings.weights;
  const towerId = requirement.unitId ? ws.units.find((unit) => unit.id === requirement.unitId)?.towerId ?? null : null;
  const eligible: ScoredDealer[] = [];
  const excluded: ExcludedDealer[] = [];

  for (const dealer of ws.dealers) {
    const reject = (reason: string) => excluded.push({ dealerId: dealer.id, name: dealer.name, reason });
    if (!dealer.active) {
      reject('Inactive');
      continue;
    }
    if (dealer.suspended) {
      reject('Suspended');
      continue;
    }
    if (dealer.optedOutLeadTypes.some((item) => norm(item) === norm(requirement.transactionType) || norm(item) === norm(requirement.propertyType))) {
      reject('Opted out of this lead type');
      continue;
    }
    if (!dealer.transactionTypes.some((item) => norm(item) === norm(requirement.transactionType))) {
      reject('Does not handle this transaction type');
      continue;
    }
    if (!dealer.propertyTypes.some((item) => norm(item) === norm(requirement.propertyType))) {
      reject('Does not handle this property type');
      continue;
    }
    const locality = coversLocality(dealer, requirement.locality);
    if (locality === 'none') {
      reject('Does not cover this locality');
      continue;
    }
    const access = ws.access.find((row) => accessCovers(row, dealer.id, requirement, towerId, now));
    if (!access) {
      reject('No project access to receive leads');
      continue;
    }
    if (dealer.openLeads >= dealer.capacity) {
      reject('Workload limit reached');
      continue;
    }
    if (ws.settings.monthlyLeadLimit != null) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monthCount = ws.assignments.filter((row) => row.dealerId === dealer.id && new Date(row.assignedAt).getTime() >= start).length;
      if (monthCount >= ws.settings.monthlyLeadLimit) {
        reject('Not recommended — monthly allocation limit reached.');
        continue;
      }
    }

    const factors: ScoreFactor[] = [];
    factors.push({
      key: 'projectAccess',
      points: weights.projectAccess,
      max: weights.projectAccess,
      reason: 'Authorized to receive leads for this project',
    });
    factors.push({
      key: 'locality',
      points: locality === 'exact' ? weights.locality : Math.round(weights.locality * 0.6),
      max: weights.locality,
      reason: locality === 'exact'
        ? `Declared locality includes ${requirement.locality}`
        : `Covers ${requirement.locality} as a nearby locality`,
    });
    const configMatch = dealer.configurations.some((item) => norm(item) === norm(requirement.configuration));
    factors.push({
      key: 'specialization',
      points: configMatch ? weights.specialization : Math.round(weights.specialization * 0.5),
      max: weights.specialization,
      reason: configMatch
        ? `Declared specialization includes ${requirement.configuration}`
        : `Handles ${requirement.propertyType}, but ${requirement.configuration} is not a declared configuration`,
    });
    const fit = budgetFit(dealer, requirement, weights.buyerFit);
    factors.push({ key: 'buyerFit', points: fit.points, max: weights.buyerFit, reason: fit.reason });
    const since = now.getTime() - dealer.responseWindowDays * 24 * 60 * 60 * 1000;
    const recent = ws.assignments.filter((row) => row.dealerId === dealer.id && new Date(row.assignedAt).getTime() >= since);
    const decided = recent.filter((row) => row.status === 'accepted' || row.status === 'declined' || row.status === 'timed_out');
    const answered = decided.filter((row) => row.status === 'accepted' || row.status === 'declined');
    const recordedAssignments = dealer.assignmentsInWindow + decided.length;
    const recordedResponses = dealer.responsesInWindow + answered.length;
    const rate = recordedAssignments === 0 ? null : Math.min(1, recordedResponses / recordedAssignments);
    factors.push({
      key: 'response',
      points: rate == null ? Math.round(weights.response * 0.5) : Math.round(rate * weights.response),
      max: weights.response,
      reason: rate == null
        ? `No recorded responses in the last ${dealer.responseWindowDays} days, so this factor stays neutral`
        : `${recordedResponses} of ${recordedAssignments} assignments answered in the last ${dealer.responseWindowDays} days`,
    });
    const capacity = capacityPoints(dealer.openLeads, dealer.capacity, weights.capacity);
    factors.push({ key: 'capacity', points: capacity.points, max: weights.capacity, reason: capacity.reason });
    const preferred = dealer.preferredProjectIds.includes(requirement.projectId);
    factors.push({
      key: 'preference',
      points: preferred ? weights.preference : 0,
      max: weights.preference,
      reason: preferred ? 'Builder marked this dealer as a preference for the project' : 'No builder preference set for this project',
    });
    const score = factors.reduce((total, factor) => total + factor.points, 0);
    eligible.push({
      dealerId: dealer.id,
      name: dealer.name,
      agencyName: dealer.agencyName,
      score,
      label: 'Assignment compatibility',
      factors,
    });
  }

  eligible.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return { eligible, excluded };
}

export function requirementFromLead(lead: Pick<BuilderLead, 'projectId' | 'unitId' | 'locality' | 'propertyType' | 'configuration' | 'transactionType' | 'budgetMin' | 'budgetMax'>): AssignmentRequirement {
  return {
    projectId: lead.projectId,
    unitId: lead.unitId,
    locality: lead.locality,
    propertyType: lead.propertyType,
    configuration: lead.configuration,
    transactionType: lead.transactionType,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
  };
}

export interface DealerLeadView {
  assignmentId: string;
  leadId: string;
  projectName: string;
  locality: string;
  configuration: string;
  budgetMin: number;
  budgetMax: number;
  requirementNote: string;
  reasons: string[];
  status: AssignmentStatus;
  buyerName: string | null;
  phone: string | null;
  propertyVisible: boolean;
  tourVisible: boolean;
}

export function dealerLeadViews(ws: BuilderWorkspace, dealer: BuilderDealer): DealerLeadView[] {
  return ws.assignments
    .filter((row) => row.dealerId === dealer.id && row.status !== 'reassigned')
    .map((row) => {
      const lead = ws.leads.find((item) => item.id === row.leadId);
      const project = lead ? ws.projects.find((item) => item.id === lead.projectId) : undefined;
      const access = lead
        ? ws.access.find((item) => item.dealerId === dealer.id && item.projectId === lead.projectId && item.permissions.includes('VIEW_PROJECT'))
        : undefined;
      const accepted = row.status === 'accepted';
      return {
        assignmentId: row.id,
        leadId: row.leadId,
        projectName: project?.name ?? 'Project',
        locality: lead?.locality ?? '',
        configuration: lead?.configuration ?? '',
        budgetMin: lead?.budgetMin ?? 0,
        budgetMax: lead?.budgetMax ?? 0,
        requirementNote: lead?.requirementNote ?? '',
        reasons: row.factors.filter((factor) => factor.points > 0).map((factor) => factor.reason),
        status: row.status,
        buyerName: accepted ? lead?.buyerName ?? null : null,
        phone: accepted ? lead?.phone ?? null : null,
        propertyVisible: Boolean(access),
        tourVisible: Boolean(access?.permissions.includes('VIEW_3D_TOUR')),
      };
    });
}

export interface ReconstructionInput {
  jobId: string;
  organizationId: string;
  projectId: string;
  unitId: string | null;
  mode: 'video' | 'photos' | 'existing_asset';
  objectKeys: string[];
}

export interface ReconstructionJobRef {
  providerJobRef: string;
}

export interface ReconstructionStatus {
  state: 'queued' | 'processing' | 'needs_more_data' | 'ready' | 'failed';
  progress: number | null;
  message: string | null;
}

export interface ReconstructionResult {
  assetKey: string;
  format: string;
  version: string;
  createdAt: string;
}

export interface BuilderReconstructionProvider {
  readonly name: string;
  readonly configured: boolean;
  createJob(input: ReconstructionInput): Promise<ReconstructionJobRef>;
  getJobStatus(jobId: string): Promise<ReconstructionStatus>;
  getResult(jobId: string): Promise<ReconstructionResult>;
  cancelJob?(jobId: string): Promise<void>;
}

/** Demo-only. Live code must not select this provider. */
export class BuilderMockReconstructionProvider implements BuilderReconstructionProvider {
  readonly name = 'mock';
  readonly configured = true;
  async createJob(input: ReconstructionInput): Promise<ReconstructionJobRef> {
    return { providerJobRef: `mock-${input.jobId}` };
  }
  async getJobStatus(): Promise<ReconstructionStatus> {
    return { state: 'ready', progress: null, message: DEMO_PROCESSING_MESSAGE };
  }
  async getResult(): Promise<ReconstructionResult> {
    return { assetKey: 'demo-sample-scene', format: 'sample', version: 'illustrative-sample', createdAt: new Date(0).toISOString() };
  }
}

export class BuilderUnconfiguredReconstructionProvider implements BuilderReconstructionProvider {
  readonly name = 'none';
  readonly configured = false;
  async createJob(_input: ReconstructionInput): Promise<ReconstructionJobRef> {
    throw new BuilderRuleError('No reconstruction provider is configured. The upload is stored and is not sent for processing.', 'provider_not_configured');
  }
  async getJobStatus(_jobId: string): Promise<ReconstructionStatus> {
    throw new BuilderRuleError('No reconstruction provider is configured.', 'provider_not_configured');
  }
  async getResult(_jobId: string): Promise<ReconstructionResult> {
    throw new BuilderRuleError('No reconstruction provider is configured.', 'provider_not_configured');
  }
}

/** A provider name is set, but this build has no vendor contract to call. */
export class BuilderConfiguredReconstructionProvider implements BuilderReconstructionProvider {
  readonly configured = false;
  constructor(readonly name: string) {}
  async createJob(_input: ReconstructionInput): Promise<ReconstructionJobRef> {
    throw new BuilderRuleError(
      `RECONSTRUCTION_PROVIDER is "${this.name}", but this build has no adapter for that vendor. Nothing was sent.`,
      'provider_not_configured',
    );
  }
  async getJobStatus(_jobId: string): Promise<ReconstructionStatus> {
    throw new BuilderRuleError(`No adapter is implemented for "${this.name}".`, 'provider_not_configured');
  }
  async getResult(_jobId: string): Promise<ReconstructionResult> {
    throw new BuilderRuleError(`No adapter is implemented for "${this.name}".`, 'provider_not_configured');
  }
}

export function createBuilderReconstructionProvider(env: Record<string, string | undefined> = process.env): BuilderReconstructionProvider {
  const name = env.RECONSTRUCTION_PROVIDER?.trim();
  if (!name || name === 'none' || name === 'mock' || !env.RECONSTRUCTION_API_KEY?.trim()) return new BuilderUnconfiguredReconstructionProvider();
  return new BuilderConfiguredReconstructionProvider(name);
}

export function isSafeAssetKey(key: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,240}$/.test(key) && !key.includes('..') && !/[\s<>]/.test(key);
}

export interface BuilderNotification {
  id: string;
  title: string;
  detail: string;
  href: string;
  at: string;
  channel: 'demo' | 'account';
}

export function builderNotifications(ws: BuilderWorkspace): BuilderNotification[] {
  const prefs = ws.settings.notifications ?? DEFAULT_NOTIFICATION_PREFS;
  const channel: BuilderNotification['channel'] = ws.dataSource === 'demo' ? 'demo' : 'account';
  const items: BuilderNotification[] = [];
  const push = (enabled: boolean, item: Omit<BuilderNotification, 'channel'>) => {
    if (!enabled) return;
    items.push({ ...item, channel });
  };
  for (const event of ws.timeline) {
    const href = event.entity === 'lead' ? `/builder/leads/${event.entityId}` : event.entity === 'tour' ? '/builder/3d-tours' : '/builder/audit';
    if (event.detail === 'Buyer enquiry received') push(prefs.newLead, { id: event.id, title: 'New buyer lead', detail: event.detail, href, at: event.at });
    else if (event.detail.startsWith('Assigned to')) push(prefs.leadAssigned, { id: event.id, title: 'Lead assigned', detail: event.detail, href, at: event.at });
    else if (event.detail.startsWith('Declined')) push(prefs.dealerDeclined, { id: event.id, title: 'Dealer declined', detail: event.detail, href, at: event.at });
    else if (event.detail === 'Dealer accepted') push(prefs.dealerAccepted, { id: event.id, title: 'Dealer accepted', detail: event.detail, href, at: event.at });
    else if (event.detail.includes('No response')) push(prefs.noResponse, { id: event.id, title: 'Dealer has not responded', detail: event.detail, href, at: event.at });
    else if (event.detail === DEMO_RECONSTRUCTION_COMPLETE || event.detail === '3D processing completed') {
      push(prefs.tourComplete, { id: event.id, title: '3D tour processing complete', detail: event.detail, href: '/builder/3d-tours', at: event.at });
    } else if (event.detail === '3D tour processing failed') {
      push(prefs.tourFailed, { id: event.id, title: '3D tour processing failed', detail: event.detail, href: '/builder/3d-tours', at: event.at });
    } else if (event.detail.startsWith('Unit price changed')) {
      push(prefs.priceChanged, { id: event.id, title: 'Unit price changed', detail: event.detail, href, at: event.at });
    } else if (event.detail.startsWith('Availability changed')) {
      push(prefs.statusChanged, { id: event.id, title: 'Unit status changed', detail: event.detail, href, at: event.at });
    }
  }
  for (const row of ws.assignments) {
    if (row.status !== 'assigned') continue;
    const lead = ws.leads.find((item) => item.id === row.leadId);
    push(prefs.noResponse, {
      id: `open-${row.id}`,
      title: 'Dealer has not responded',
      detail: `${row.dealerName} · ${lead?.configuration ?? 'Lead'}`,
      href: `/builder/leads/${row.leadId}`,
      at: row.assignedAt,
    });
  }
  for (const tour of ws.tours) {
    if (tour.status === 'ready_for_review') {
      push(prefs.tourComplete, {
        id: `tour-ready-${tour.id}`,
        title: '3D tour processing complete',
        detail: tour.demoSimulation ? DEMO_RECONSTRUCTION_COMPLETE : 'A result is ready for review',
        href: '/builder/3d-tours',
        at: tour.updatedAt,
      });
    }
    if (tour.status === 'failed') {
      push(prefs.tourFailed, {
        id: `tour-failed-${tour.id}`,
        title: '3D tour processing failed',
        detail: tour.errorMessage ?? 'Processing failed',
        href: '/builder/3d-tours',
        at: tour.updatedAt,
      });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

export function searchWorkspace(ws: BuilderWorkspace, query: string) {
  const q = norm(query);
  if (!q) return { projects: [], units: [], dealers: [], leads: [] };
  return {
    projects: ws.projects.filter((project) => [project.name, project.locality, project.city, project.developerName].some((value) => norm(value).includes(q))),
    units: ws.units.filter((unit) => norm(unit.unitNumber).includes(q) || norm(unit.configuration).includes(q)),
    dealers: ws.dealers.filter((dealer) => [dealer.name, dealer.agencyName, ...dealer.localities].some((value) => norm(value).includes(q))),
    leads: ws.leads.filter((lead) => [lead.buyerName, lead.configuration, lead.locality].some((value) => norm(value).includes(q))),
  };
}

export function emptyBuilderWorkspace(input: { organizationId: string; organizationName: string; storageMode: BuilderWorkspace['storageMode']; weights?: AssignmentWeights }): BuilderWorkspace {
  const weights = input.weights ?? DEFAULT_ASSIGNMENT_WEIGHTS;
  assertAssignmentWeights(weights);
  return {
    version: 1,
    dataSource: 'live',
    storageMode: input.storageMode,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    settings: { mode: 'recommended', responseWindowMinutes: 15, maxReassignments: 2, monthlyLeadLimit: null, weights, notifications: { ...DEFAULT_NOTIFICATION_PREFS } },
    projects: [],
    towers: [],
    floors: [],
    units: [],
    media: [],
    tours: [],
    dealers: [],
    access: [],
    groups: [],
    leads: [],
    assignments: [],
    timeline: [],
    seq: 0,
  };
}
