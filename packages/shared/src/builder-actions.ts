import {
  ACCESS_PERMISSIONS,
  ASSIGNMENT_MODES,
  BUILDER_TOUR_STATUSES,
  BuilderRuleError,
  CONSTRUCTION_STATUSES,
  DECLINE_REASONS,
  DEFAULT_NOTIFICATION_PREFS,
  DEMO_PROCESSING_MESSAGE,
  DEMO_RECONSTRUCTION_COMPLETE,
  LEAD_STAGES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_VISIBILITY,
  UNIT_AVAILABILITY,
  assertTourTransition,
  publicListingBlockers,
  rankDealers,
  requirementFromLead,
  validateBuilderMedia,
  type AccessPermission,
  type AssignmentMode,
  type BuilderFloor,
  type BuilderLead,
  type BuilderMedia,
  type BuilderProject,
  type BuilderTourJob,
  type NotificationPrefs,
  type BuilderTourStatus,
  type BuilderUnit,
  type BuilderWorkspace,
  type DeclineReason,
  type LeadStage,
  type ProjectStatus,
  type ProjectVisibility,
  type UnitAvailability,
} from './builder-portal';
import { normalizeLayout } from './unit-layout';

export interface ProjectInput {
  name: string;
  projectType: BuilderProject['projectType'];
  developerName: string;
  city: string;
  locality: string;
  address: string;
  description: string;
  reraNumber: string | null;
  constructionStatus: BuilderProject['constructionStatus'];
  possessionDate: string | null;
  amenities: string[];
  visibility: ProjectVisibility;
  status: ProjectStatus;
  latitude: number | null;
  longitude: number | null;
}

export interface UnitInput {
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
  holdExpiresAt?: string | null;
}

export interface MediaInput {
  projectId: string;
  unitId: string | null;
  kind: BuilderMedia['kind'];
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  objectKey: string | null;
  visibility: BuilderMedia['visibility'];
  uploadedByName: string;
}

export interface TourInput {
  projectId: string;
  unitId: string | null;
  source: BuilderTourJob['source'];
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  consent: boolean;
}

export interface LeadInput {
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
}

export interface AccessInput {
  projectId: string;
  dealerId?: string;
  groupId?: string;
  towerId?: string | null;
  unitId?: string | null;
  campaignName?: string | null;
  permissions: AccessPermission[];
  expiresAt?: string | null;
}

export type BuilderAction =
  | { type: 'rename_organization'; name: string }
  | { type: 'update_settings'; mode?: AssignmentMode; responseWindowMinutes?: number; maxReassignments?: number; monthlyLeadLimit?: number | null; notifications?: Partial<NotificationPrefs> }
  | { type: 'create_project'; project: ProjectInput }
  | { type: 'update_project'; id: string; patch: Partial<ProjectInput> }
  | { type: 'add_tower'; projectId: string; name: string }
  | { type: 'add_floor'; towerId: string; label: string; level: number }
  | { type: 'add_unit'; floorId: string; unit: UnitInput }
  | { type: 'set_unit_status'; unitId: string; availability: UnitAvailability; holdExpiresAt?: string | null; confirm?: boolean }
  | { type: 'set_unit_price'; unitId: string; basePrice: number; additionalCharges?: number; plc?: number; otherCharges?: number }
  | { type: 'save_unit_layout'; unitId: string; layout: import('./unit-layout').UnitLayout }
  | { type: 'add_media'; media: MediaInput }
  | { type: 'update_media'; id: string; fileName?: string; visibility?: BuilderMedia['visibility']; isPrimary?: boolean }
  | { type: 'delete_media'; id: string }
  | { type: 'reorder_media'; projectId: string; unitId: string | null; ids: string[] }
  | { type: 'create_tour'; tour: TourInput }
  | { type: 'transition_tour'; id: string; to: BuilderTourStatus; providerJobRef?: string | null; progress?: number | null; resultAssetKey?: string | null; resultVersion?: string | null }
  | { type: 'demo_process_tour'; id: string }
  | { type: 'grant_access'; access: AccessInput }
  | { type: 'revoke_access'; id: string }
  | { type: 'create_group'; name: string; dealerIds: string[]; campaignName?: string | null }
  | { type: 'create_lead'; lead: LeadInput }
  | { type: 'update_lead'; id: string; patch: Partial<LeadInput> }
  | { type: 'assign_lead'; leadId: string; mode: AssignmentMode; dealerId?: string }
  | { type: 'respond_assignment'; assignmentId: string; decision: 'accept' | 'decline'; reason?: DeclineReason; actorDealerId?: string }
  | { type: 'advance_lead'; leadId: string; stage: LeadStage; visitAt?: string | null; visitOutcome?: string | null; bookingStatus?: string | null; commissionStatus?: BuilderLead['commissionStatus'] }
  | { type: 'ask_builder'; assignmentId: string; note: string; actorDealerId?: string }
  | { type: 'set_dealer_preference'; dealerId: string; projectId: string; preferred: boolean }
  | { type: 'save_dealer'; id?: string; dealer: DealerInput }
  | { type: 'set_dealer_agency'; dealerId: string; agencyId: string | null }
  | { type: 'sweep_timeouts' };

export interface DealerInput {
  name: string;
  agencyName: string;
  active: boolean;
  suspended: boolean;
  localities: string[];
  nearbyLocalities: string[];
  propertyTypes: string[];
  configurations: string[];
  transactionTypes: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  optedOutLeadTypes: string[];
  capacity: number;
  responseWindowDays: number;
}

export interface ActionContext {
  now?: Date;
  /** Live API passes a UUID factory. Demo ids stay readable. */
  id?: () => string;
  actor?: string;
}

function money(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new BuilderRuleError(`${label} must be a non-negative number.`);
}

function requireProject(ws: BuilderWorkspace, projectId: string) {
  const project = ws.projects.find((item) => item.id === projectId);
  if (!project) throw new BuilderRuleError('Project not found.', 'not_found');
  return project;
}

function openAssignment(ws: BuilderWorkspace, leadId: string) {
  return ws.assignments.find((row) => row.leadId === leadId && (row.status === 'assigned' || row.status === 'accepted'));
}

export function applyBuilderAction(ws: BuilderWorkspace, action: BuilderAction, ctx: ActionContext = {}): BuilderWorkspace {
  const next = structuredClone(ws);
  const nowDate = ctx.now ?? new Date();
  const now = nowDate.toISOString();
  const newId = (prefix: string) => {
    next.seq += 1;
    return ctx.id ? ctx.id() : `${prefix}-${next.seq}`;
  };
  const event = (kind: BuilderWorkspace['timeline'][number]['kind'], entity: string, entityId: string, detail: string, actor?: string) => {
    next.timeline.unshift({ id: newId('evt'), at: now, kind, entity, entityId, detail, actor: actor ?? ctx.actor ?? 'Builder' });
  };

  switch (action.type) {
    case 'rename_organization': {
      if (action.name.trim().length < 2) throw new BuilderRuleError('Enter an organization name.');
      next.organizationName = action.name.trim();
      break;
    }
    case 'update_settings': {
      if (action.mode) {
        if (!ASSIGNMENT_MODES.includes(action.mode)) throw new BuilderRuleError('Unknown assignment mode.');
        next.settings.mode = action.mode;
      }
      if (action.responseWindowMinutes != null) {
        if (!Number.isInteger(action.responseWindowMinutes) || action.responseWindowMinutes < 5 || action.responseWindowMinutes > 24 * 60) {
          throw new BuilderRuleError('Response window must be between 5 and 1440 minutes.');
        }
        next.settings.responseWindowMinutes = action.responseWindowMinutes;
      }
      if (action.maxReassignments != null) {
        if (!Number.isInteger(action.maxReassignments) || action.maxReassignments < 0 || action.maxReassignments > 5) {
          throw new BuilderRuleError('Retries must be between 0 and 5.');
        }
        next.settings.maxReassignments = action.maxReassignments;
      }
      if (action.monthlyLeadLimit !== undefined) {
        if (action.monthlyLeadLimit != null && (!Number.isInteger(action.monthlyLeadLimit) || action.monthlyLeadLimit < 1 || action.monthlyLeadLimit > 500)) {
          throw new BuilderRuleError('Monthly lead limit must be empty or between 1 and 500.');
        }
        next.settings.monthlyLeadLimit = action.monthlyLeadLimit;
      }
      if (action.notifications) {
        next.settings.notifications = { ...(next.settings.notifications ?? DEFAULT_NOTIFICATION_PREFS), ...action.notifications };
      }
      break;
    }
    case 'create_project': {
      const project = normalizeProject(action.project, newId('prj'), now);
      next.projects.unshift(project);
      event('audit', 'project', project.id, `Project created (${project.status})`);
      break;
    }
    case 'update_project': {
      const project = requireProject(next, action.id);
      Object.assign(project, normalizeProject({ ...project, ...action.patch, amenities: action.patch.amenities ?? project.amenities }, project.id, now));
      event('audit', 'project', project.id, 'Project details updated');
      break;
    }
    case 'add_tower': {
      requireProject(next, action.projectId);
      if (action.name.trim().length < 1) throw new BuilderRuleError('Enter a tower name.');
      const sortOrder = next.towers.filter((tower) => tower.projectId === action.projectId).length;
      next.towers.push({ id: newId('twr'), projectId: action.projectId, name: action.name.trim(), sortOrder });
      break;
    }
    case 'add_floor': {
      const tower = next.towers.find((item) => item.id === action.towerId);
      if (!tower) throw new BuilderRuleError('Tower not found.', 'not_found');
      if (!Number.isInteger(action.level)) throw new BuilderRuleError('Floor level must be a whole number.');
      next.floors.push({ id: newId('flr'), projectId: tower.projectId, towerId: tower.id, label: action.label.trim() || `Floor ${action.level}`, level: action.level });
      break;
    }
    case 'add_unit': {
      const floor = next.floors.find((item) => item.id === action.floorId);
      if (!floor) throw new BuilderRuleError('Floor not found.', 'not_found');
      const unit = normalizeUnit(action.unit, newId('unt'), floor, now);
      if (next.units.some((item) => item.projectId === floor.projectId && item.unitNumber.toLowerCase() === unit.unitNumber.toLowerCase())) {
        throw new BuilderRuleError('That unit number already exists in this project.', 'conflict');
      }
      next.units.push(unit);
      event('audit', 'unit', unit.id, `Unit ${unit.unitNumber} added as ${unit.availability}`);
      break;
    }
    case 'set_unit_status': {
      const unit = next.units.find((item) => item.id === action.unitId);
      if (!unit) throw new BuilderRuleError('Unit not found.', 'not_found');
      if (!UNIT_AVAILABILITY.includes(action.availability)) throw new BuilderRuleError('Unknown availability.');
      if (unit.availability !== action.availability) {
        event('audit', 'unit', unit.id, `Availability changed from ${unit.availability} to ${action.availability}`);
        unit.availability = action.availability;
      }
      if (action.availability === 'on_hold') {
        unit.holdExpiresAt = action.holdExpiresAt ?? new Date(nowDate.getTime() + 48 * 60 * 60 * 1000).toISOString();
      } else if (action.holdExpiresAt !== undefined) {
        unit.holdExpiresAt = action.holdExpiresAt;
      }
      if (action.availability === 'booked') unit.bookingStatus = unit.bookingStatus ?? 'booked';
      if (action.availability === 'sold') unit.bookingStatus = 'sold';
      if (action.confirm) {
        unit.lastConfirmedAt = now;
        event('audit', 'unit', unit.id, 'Availability confirmed');
      }
      unit.updatedAt = now;
      break;
    }
    case 'set_unit_price': {
      const unit = next.units.find((item) => item.id === action.unitId);
      if (!unit) throw new BuilderRuleError('Unit not found.', 'not_found');
      money(action.basePrice, 'Base price');
      if (action.additionalCharges != null) money(action.additionalCharges, 'Additional charges');
      if (action.plc != null) money(action.plc, 'PLC');
      if (action.otherCharges != null) money(action.otherCharges, 'Other charges');
      const previous = unit.basePrice;
      unit.basePrice = action.basePrice;
      if (action.additionalCharges != null) unit.additionalCharges = action.additionalCharges;
      if (action.plc != null) unit.plc = action.plc;
      if (action.otherCharges != null) unit.otherCharges = action.otherCharges;
      unit.updatedAt = now;
      if (previous !== unit.basePrice) event('audit', 'unit', unit.id, `Unit price changed for ${unit.unitNumber}`);
      break;
    }
    case 'save_unit_layout': {
      const unit = next.units.find((item) => item.id === action.unitId);
      if (!unit) throw new BuilderRuleError('Unit not found.', 'not_found');
      unit.layout = normalizeLayout(action.layout);
      unit.updatedAt = now;
      event('audit', 'unit', unit.id, `Layout saved (${unit.layout.rooms.length} rooms). Structured geometry — not a photo reconstruction.`);
      break;
    }
    case 'add_media': {
      requireProject(next, action.media.projectId);
      if (action.media.unitId && !next.units.some((unit) => unit.id === action.media.unitId && unit.projectId === action.media.projectId)) {
        throw new BuilderRuleError('That unit is not in this project.', 'forbidden');
      }
      const problems = validateBuilderMedia({
        name: action.media.fileName,
        mime: action.media.mimeType,
        size: action.media.sizeBytes,
        durationSeconds: action.media.durationSeconds,
        kind: action.media.kind,
      });
      if (problems.length) throw new BuilderRuleError(problems[0]);
      const media: BuilderMedia = {
        id: newId('med'),
        projectId: action.media.projectId,
        unitId: action.media.unitId,
        kind: action.media.kind,
        category: action.media.category.trim() || action.media.kind,
        fileName: action.media.fileName.trim(),
        mimeType: action.media.mimeType,
        sizeBytes: action.media.sizeBytes,
        durationSeconds: action.media.durationSeconds,
        storage: action.media.objectKey ? 'private_s3' : next.storageMode,
        objectKey: action.media.objectKey,
        visibility: action.media.visibility,
        isPrimary: false,
        sortOrder: next.media.filter((item) => item.projectId === action.media.projectId).length,
        processingStatus: 'stored',
        uploadedByName: action.media.uploadedByName,
        createdAt: now,
      };
      next.media.push(media);
      event('audit', 'media', media.id, `Media uploaded (${media.fileName})`);
      break;
    }
    case 'update_media': {
      const media = next.media.find((item) => item.id === action.id);
      if (!media) throw new BuilderRuleError('Media not found.', 'not_found');
      if (action.fileName != null) {
        if (action.fileName.trim().length < 1) throw new BuilderRuleError('Enter a file name.');
        media.fileName = action.fileName.trim();
      }
      if (action.visibility) media.visibility = action.visibility;
      if (action.isPrimary) {
        for (const item of next.media) {
          if (item.projectId === media.projectId && item.unitId === media.unitId && item.kind === 'image') item.isPrimary = false;
        }
        media.isPrimary = true;
      }
      break;
    }
    case 'delete_media': {
      const index = next.media.findIndex((item) => item.id === action.id);
      if (index < 0) throw new BuilderRuleError('Media not found.', 'not_found');
      const [removed] = next.media.splice(index, 1);
      event('audit', 'media', removed.id, `Media deleted (${removed.fileName})`);
      break;
    }
    case 'reorder_media': {
      action.ids.forEach((id, index) => {
        const media = next.media.find((item) => item.id === id && item.projectId === action.projectId && item.unitId === action.unitId);
        if (media) media.sortOrder = index;
      });
      break;
    }
    case 'create_tour': {
      requireProject(next, action.tour.projectId);
      if (action.tour.unitId && !next.units.some((unit) => unit.id === action.tour.unitId && unit.projectId === action.tour.projectId)) {
        throw new BuilderRuleError('That unit is not in this project.', 'forbidden');
      }
      if (!action.tour.consent) throw new BuilderRuleError(MEDIA_CONSENT_REQUIRED);
      if (action.tour.source !== 'existing_asset') {
        const problems = validateBuilderMedia({
          name: action.tour.fileName ?? '',
          mime: action.tour.mimeType ?? '',
          size: action.tour.sizeBytes ?? 0,
          durationSeconds: action.tour.durationSeconds,
          kind: action.tour.source === 'video' ? 'video' : 'image',
        });
        if (problems.length) throw new BuilderRuleError(problems[0]);
      }
      const tour: BuilderTourJob = {
        id: newId('tour'),
        projectId: action.tour.projectId,
        unitId: action.tour.unitId,
        source: action.tour.source,
        status: 'uploaded',
        fileName: action.tour.fileName,
        mimeType: action.tour.mimeType,
        sizeBytes: action.tour.sizeBytes,
        durationSeconds: action.tour.durationSeconds,
        consentAt: now,
        demoSimulation: next.dataSource === 'demo',
        provider: 'none',
        providerJobRef: null,
        progress: null,
        providerMessage: null,
        resultKind: null,
        resultAssetKey: null,
        resultVersion: null,
        resultCreatedAt: null,
        errorMessage: null,
        updatedAt: now,
      };
      next.tours.unshift(tour);
      event('tour', 'tour', tour.id, '3D processing requested');
      break;
    }
    case 'transition_tour': {
      const tour = next.tours.find((item) => item.id === action.id);
      if (!tour) throw new BuilderRuleError('3D tour not found.', 'not_found');
      if (!BUILDER_TOUR_STATUSES.includes(action.to)) throw new BuilderRuleError('Unknown tour status.');
      assertTourTransition(tour.status, action.to);
      if (action.to === 'queued' && next.dataSource !== 'demo' && !action.providerJobRef) {
        throw new BuilderRuleError('No reconstruction provider is configured. The upload stays stored and is not sent for processing.', 'provider_not_configured');
      }
      if (action.to === 'ready_for_review' && !tour.demoSimulation && !action.resultAssetKey && !tour.resultAssetKey) {
        throw new BuilderRuleError('A reconstruction result is required before review.');
      }
      if (action.to === 'approved' && !tour.resultKind && !tour.resultAssetKey) {
        throw new BuilderRuleError('Approve a tour only after a result is ready for review.');
      }
      if (action.to === 'published' && tour.status !== 'approved') {
        throw new BuilderRuleError('Publish only after the builder approves a result.', 'invalid_transition');
      }
      tour.status = action.to;
      if (action.providerJobRef) tour.providerJobRef = action.providerJobRef;
      if (action.progress !== undefined) tour.progress = action.progress;
      if (next.dataSource === 'demo' && (action.to === 'queued' || action.to === 'processing')) {
        tour.demoSimulation = true;
        tour.provider = 'demo';
        tour.providerMessage = DEMO_PROCESSING_MESSAGE;
        tour.progress = null;
      }
      if (action.to === 'ready_for_review' && tour.demoSimulation) {
        tour.resultKind = 'sample';
        tour.resultVersion = 'illustrative-sample';
        tour.resultCreatedAt = now;
        tour.providerMessage = DEMO_PROCESSING_MESSAGE;
        tour.progress = null;
      }
      if (action.resultAssetKey) {
        tour.resultKind = 'asset';
        tour.resultAssetKey = action.resultAssetKey;
        tour.resultVersion = action.resultVersion ?? '1';
        tour.resultCreatedAt = now;
      }
      if (action.to === 'failed') tour.errorMessage = tour.errorMessage ?? 'Processing failed.';
      tour.updatedAt = now;
      const tourDetail = action.to === 'queued'
        ? '3D processing requested'
        : action.to === 'ready_for_review'
          ? (tour.demoSimulation ? DEMO_RECONSTRUCTION_COMPLETE : '3D processing completed')
          : action.to === 'approved'
            ? '3D tour approved'
            : action.to === 'published'
              ? '3D tour published'
              : action.to === 'failed'
                ? '3D tour processing failed'
                : `3D tour moved to ${action.to}`;
      event('tour', 'tour', tour.id, tourDetail);
      break;
    }
    case 'demo_process_tour': {
      if (next.dataSource !== 'demo') {
        throw new BuilderRuleError('Demo processing is only available in the demo workspace.', 'forbidden');
      }
      const tour = next.tours.find((item) => item.id === action.id);
      if (!tour) throw new BuilderRuleError('3D tour not found.', 'not_found');
      if (tour.status !== 'uploaded') throw new BuilderRuleError('Upload the media before starting demo processing.');
      for (const status of ['queued', 'processing', 'ready_for_review'] as const) {
        assertTourTransition(tour.status, status);
        tour.status = status;
        event('tour', 'tour', tour.id, status === 'ready_for_review' ? DEMO_RECONSTRUCTION_COMPLETE : `Demo state ${status}. ${DEMO_PROCESSING_MESSAGE}`);
      }
      tour.demoSimulation = true;
      tour.provider = 'demo';
      tour.providerMessage = DEMO_PROCESSING_MESSAGE;
      tour.progress = null;
      tour.resultKind = 'sample';
      tour.resultVersion = 'illustrative-sample';
      tour.resultCreatedAt = now;
      tour.updatedAt = now;
      break;
    }
    case 'grant_access': {
      requireProject(next, action.access.projectId);
      const permissions = action.access.permissions.filter((item) => ACCESS_PERMISSIONS.includes(item));
      if (!permissions.length) throw new BuilderRuleError('Choose at least one permission.');
      const dealerIds = action.access.groupId
        ? next.groups.find((group) => group.id === action.access.groupId)?.dealerIds ?? []
        : action.access.dealerId ? [action.access.dealerId] : [];
      if (!dealerIds.length) throw new BuilderRuleError('Choose a dealer or a dealer group.');
      for (const dealerId of dealerIds) {
        if (!next.dealers.some((dealer) => dealer.id === dealerId)) throw new BuilderRuleError('Dealer not found.', 'not_found');
        const row = {
          id: newId('acc'),
          projectId: action.access.projectId,
          dealerId,
          towerId: action.access.towerId ?? null,
          unitId: action.access.unitId ?? null,
          campaignName: action.access.campaignName ?? null,
          permissions,
          expiresAt: action.access.expiresAt ?? null,
          createdAt: now,
        };
        next.access.push(row);
        const dealer = next.dealers.find((item) => item.id === dealerId);
        event('audit', 'access', row.id, `Access granted to ${dealer?.name ?? 'dealer'} (${permissions.join(', ')})`);
      }
      break;
    }
    case 'revoke_access': {
      const index = next.access.findIndex((item) => item.id === action.id);
      if (index < 0) throw new BuilderRuleError('Access record not found.', 'not_found');
      const [row] = next.access.splice(index, 1);
      const dealer = next.dealers.find((item) => item.id === row.dealerId);
      event('audit', 'access', row.id, `Access removed for ${dealer?.name ?? 'dealer'}`);
      break;
    }
    case 'create_group': {
      if (action.name.trim().length < 2) throw new BuilderRuleError('Enter a group name.');
      const dealerIds = action.dealerIds.filter((id) => next.dealers.some((dealer) => dealer.id === id));
      if (!dealerIds.length) throw new BuilderRuleError('Add at least one dealer to the group.');
      next.groups.push({ id: newId('grp'), name: action.name.trim(), campaignName: action.campaignName ?? null, dealerIds });
      break;
    }
    case 'create_lead': {
      requireProject(next, action.lead.projectId);
      if (action.lead.unitId && !next.units.some((unit) => unit.id === action.lead.unitId && unit.projectId === action.lead.projectId)) {
        throw new BuilderRuleError('That unit is not in this project.', 'forbidden');
      }
      if (action.lead.buyerName.trim().length < 2) throw new BuilderRuleError('Enter the buyer name.');
      if (action.lead.budgetMax < action.lead.budgetMin) throw new BuilderRuleError('Budget maximum must be at least the minimum.');
      const lead: BuilderLead = {
        id: newId('led'),
        ...action.lead,
        buyerName: action.lead.buyerName.trim(),
        stage: 'new_lead',
        visitAt: null,
        visitOutcome: null,
        firstContactAt: null,
        bookingStatus: null,
        commissionStatus: null,
        createdAt: now,
        updatedAt: now,
      };
      next.leads.unshift(lead);
      event('lead', 'lead', lead.id, 'Buyer enquiry received');
      break;
    }
    case 'update_lead': {
      const lead = next.leads.find((item) => item.id === action.id);
      if (!lead) throw new BuilderRuleError('Lead not found.', 'not_found');
      if (lead.stage !== 'new_lead') throw new BuilderRuleError('Requirements can be edited before the lead is assigned.');
      const merged = { ...lead, ...action.patch };
      if (merged.budgetMax < merged.budgetMin) throw new BuilderRuleError('Budget maximum must be at least the minimum.');
      if (action.patch.projectId) requireProject(next, action.patch.projectId);
      Object.assign(lead, {
        projectId: merged.projectId,
        unitId: merged.unitId,
        buyerName: merged.buyerName.trim(),
        phone: merged.phone,
        budgetMin: merged.budgetMin,
        budgetMax: merged.budgetMax,
        bedrooms: merged.bedrooms,
        configuration: merged.configuration,
        transactionType: merged.transactionType,
        locality: merged.locality,
        propertyType: merged.propertyType,
        requirementNote: merged.requirementNote,
        updatedAt: now,
      });
      break;
    }
    case 'assign_lead': {
      assignLead(next, action, nowDate, now, newId, event);
      break;
    }
    case 'respond_assignment': {
      respond(next, action, nowDate, now, newId, event);
      break;
    }
    case 'advance_lead': {
      const lead = next.leads.find((item) => item.id === action.leadId);
      if (!lead) throw new BuilderRuleError('Lead not found.', 'not_found');
      if (!LEAD_STAGES.includes(action.stage)) throw new BuilderRuleError('Unknown lead stage.');
      lead.stage = action.stage;
      if (action.stage === 'contacted' && !lead.firstContactAt) lead.firstContactAt = now;
      if (action.visitAt !== undefined) lead.visitAt = action.visitAt;
      if (action.visitOutcome !== undefined) lead.visitOutcome = action.visitOutcome;
      if (action.bookingStatus !== undefined) lead.bookingStatus = action.bookingStatus;
      if (action.commissionStatus !== undefined) lead.commissionStatus = action.commissionStatus;
      lead.updatedAt = now;
      event('lead', 'lead', lead.id, `Stage set to ${action.stage}`);
      break;
    }
    case 'ask_builder': {
      const row = next.assignments.find((item) => item.id === action.assignmentId);
      if (!row) throw new BuilderRuleError('Assignment not found.', 'not_found');
      if (action.actorDealerId && row.dealerId !== action.actorDealerId) throw new BuilderRuleError('This lead is not assigned to you.', 'forbidden');
      if (action.note.trim().length < 2) throw new BuilderRuleError('Enter a note for the builder.');
      event('lead', 'lead', row.leadId, `Dealer asked the builder: ${action.note.trim().slice(0, 240)}`);
      break;
    }
    case 'set_dealer_preference': {
      const dealer = next.dealers.find((item) => item.id === action.dealerId);
      if (!dealer) throw new BuilderRuleError('Dealer not found.', 'not_found');
      requireProject(next, action.projectId);
      dealer.preferredProjectIds = dealer.preferredProjectIds.filter((id) => id !== action.projectId);
      if (action.preferred) dealer.preferredProjectIds.push(action.projectId);
      break;
    }
    case 'save_dealer': {
      const input = normalizeDealer(action.dealer);
      if (action.id) {
        const dealer = next.dealers.find((item) => item.id === action.id);
        if (!dealer) throw new BuilderRuleError('Dealer not found.', 'not_found');
        Object.assign(dealer, input);
      } else {
        next.dealers.push({
          id: newId('dlr'),
          ...input,
          verified: false,
          openLeads: 0,
          responsesInWindow: 0,
          assignmentsInWindow: 0,
          preferredProjectIds: [],
          lastActivityAt: now,
          platformDealerId: null,
          agencyId: null,
        });
      }
      break;
    }
    case 'set_dealer_agency': {
      const dealer = next.dealers.find((item) => item.id === action.dealerId);
      if (!dealer) throw new BuilderRuleError('Dealer not found.', 'not_found');
      dealer.agencyId = action.agencyId;
      break;
    }
    case 'sweep_timeouts': {
      sweep(next, nowDate, now, newId, event);
      break;
    }
    default:
      throw new BuilderRuleError('Unknown action.');
  }

  return next;
}

const MEDIA_CONSENT_REQUIRED = 'Confirm that you have the right to upload and process this property media.';

function normalizeDealer(input: DealerInput): Omit<DealerInput, never> & Pick<DealerInput, 'name'> {
  if (input.name.trim().length < 2) throw new BuilderRuleError('Enter the dealer name.');
  if (input.agencyName.trim().length < 2) throw new BuilderRuleError('Enter the agency name.');
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100) throw new BuilderRuleError('Capacity must be between 1 and 100.');
  if (!Number.isInteger(input.responseWindowDays) || input.responseWindowDays < 7 || input.responseWindowDays > 90) {
    throw new BuilderRuleError('Response window for scoring must be between 7 and 90 days.');
  }
  if (input.budgetMin != null && input.budgetMax != null && input.budgetMax < input.budgetMin) {
    throw new BuilderRuleError('Budget maximum must be at least the minimum.');
  }
  const list = (values: string[]) => values.map((item) => item.trim()).filter(Boolean);
  return {
    name: input.name.trim(),
    agencyName: input.agencyName.trim(),
    active: input.active,
    suspended: input.suspended,
    localities: list(input.localities),
    nearbyLocalities: list(input.nearbyLocalities),
    propertyTypes: list(input.propertyTypes),
    configurations: list(input.configurations),
    transactionTypes: list(input.transactionTypes),
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    optedOutLeadTypes: list(input.optedOutLeadTypes),
    capacity: input.capacity,
    responseWindowDays: input.responseWindowDays,
  };
}

function normalizeProject(input: ProjectInput, id: string, now: string): BuilderProject {
  if (!PROJECT_TYPES.includes(input.projectType)) throw new BuilderRuleError('Choose a project type.');
  if (!CONSTRUCTION_STATUSES.includes(input.constructionStatus)) throw new BuilderRuleError('Choose a construction status.');
  if (!PROJECT_STATUSES.includes(input.status)) throw new BuilderRuleError('Choose a project status.');
  if (!PROJECT_VISIBILITY.includes(input.visibility)) throw new BuilderRuleError('Choose a visibility.');
  if (input.name.trim().length < 2) throw new BuilderRuleError('Enter a project name.');
  if (!input.city.trim() || !input.locality.trim()) throw new BuilderRuleError('City and locality are required.');
  const project: BuilderProject = {
    id,
    name: input.name.trim(),
    projectType: input.projectType,
    developerName: input.developerName.trim(),
    city: input.city.trim(),
    locality: input.locality.trim(),
    address: input.address.trim(),
    description: input.description.trim(),
    reraNumber: input.reraNumber?.trim() || null,
    constructionStatus: input.constructionStatus,
    possessionDate: input.possessionDate,
    amenities: input.amenities.map((item) => item.trim()).filter(Boolean),
    visibility: input.visibility,
    status: input.status,
    latitude: input.latitude,
    longitude: input.longitude,
    updatedAt: now,
  };
  if (project.visibility === 'public' && publicListingBlockers(project).length) {
    throw new BuilderRuleError(publicListingBlockers(project)[0]);
  }
  return project;
}

function normalizeUnit(input: UnitInput, id: string, floor: BuilderFloor, now: string): BuilderUnit {
  if (!input.unitNumber.trim()) throw new BuilderRuleError('Enter a unit number.');
  if (!UNIT_AVAILABILITY.includes(input.availability)) throw new BuilderRuleError('Unknown availability.');
  money(input.basePrice, 'Base price');
  money(input.additionalCharges, 'Additional charges');
  money(input.plc, 'PLC');
  money(input.otherCharges, 'Other charges');
  if (input.carpetAreaSqft < 0 || input.saleableAreaSqft < 0) throw new BuilderRuleError('Area cannot be negative.');
  return {
    id,
    projectId: floor.projectId,
    towerId: floor.towerId,
    floorId: floor.id,
    unitNumber: input.unitNumber.trim(),
    configuration: input.configuration.trim() || 'Not set',
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    carpetAreaSqft: input.carpetAreaSqft,
    saleableAreaSqft: input.saleableAreaSqft,
    facing: input.facing.trim(),
    balcony: input.balcony,
    parking: input.parking.trim(),
    basePrice: input.basePrice,
    additionalCharges: input.additionalCharges,
    plc: input.plc,
    otherCharges: input.otherCharges,
    availability: input.availability,
    holdExpiresAt: input.availability === 'on_hold' ? input.holdExpiresAt ?? null : null,
    bookingStatus: input.availability === 'booked' || input.availability === 'sold' ? input.availability : null,
    lastConfirmedAt: now,
    updatedAt: now,
  };
}

function assignLead(
  ws: BuilderWorkspace,
  action: Extract<BuilderAction, { type: 'assign_lead' }>,
  nowDate: Date,
  now: string,
  newId: (prefix: string) => string,
  event: (kind: 'assignment' | 'audit' | 'tour' | 'lead', entity: string, entityId: string, detail: string, actor?: string) => void,
) {
  const lead = ws.leads.find((item) => item.id === action.leadId);
  if (!lead) throw new BuilderRuleError('Lead not found.', 'not_found');
  if (!ASSIGNMENT_MODES.includes(action.mode)) throw new BuilderRuleError('Unknown assignment mode.');
  const ranked = rankDealers(ws, requirementFromLead(lead), nowDate);
  const alreadyTried = new Set(ws.assignments.filter((row) => row.leadId === lead.id).map((row) => row.dealerId));
  const pool = action.mode === 'auto' ? ranked.eligible.filter((item) => !alreadyTried.has(item.dealerId)) : ranked.eligible;
  if (!pool.length) throw new BuilderRuleError('No eligible dealer can receive this lead.');
  const chosen = action.mode === 'auto' ? pool[0] : pool.find((item) => item.dealerId === action.dealerId);
  if (!chosen) throw new BuilderRuleError('Choose an eligible dealer. Dealers who failed the hard filters are not available.');
  const existing = openAssignment(ws, lead.id);
  if (existing && action.mode === 'auto') throw new BuilderRuleError('This lead already has an open assignment.', 'conflict');
  if (existing && action.mode !== 'manual') throw new BuilderRuleError('Reassignment is a manual decision while a dealer still holds the lead.', 'conflict');
  if (existing) {
    existing.status = 'reassigned';
    const previous = ws.dealers.find((dealer) => dealer.id === existing.dealerId);
    if (previous) previous.openLeads = Math.max(0, previous.openLeads - 1);
    event('assignment', 'lead', lead.id, `Reassigned away from ${existing.dealerName}`, 'Builder');
  }
  const dealer = ws.dealers.find((item) => item.id === chosen.dealerId);
  if (!dealer) throw new BuilderRuleError('Dealer not found.', 'not_found');
  dealer.openLeads += 1;
  const row = {
    id: newId('asg'),
    leadId: lead.id,
    dealerId: dealer.id,
    dealerName: dealer.name,
    score: chosen.score,
    factors: chosen.factors,
    weights: structuredClone(ws.settings.weights),
    mode: action.mode,
    status: 'assigned' as const,
    responseWindowMinutes: ws.settings.responseWindowMinutes,
    assignedAt: now,
    respondedAt: null,
    declineReason: null,
  };
  ws.assignments.unshift(row);
  lead.stage = 'assigned';
  lead.updatedAt = now;
  event('assignment', 'lead', lead.id, `Assigned to ${dealer.name}`, 'Builder');
}

function respond(
  ws: BuilderWorkspace,
  action: Extract<BuilderAction, { type: 'respond_assignment' }>,
  nowDate: Date,
  now: string,
  newId: (prefix: string) => string,
  event: (kind: 'assignment' | 'audit' | 'tour' | 'lead', entity: string, entityId: string, detail: string, actor?: string) => void,
) {
  const row = ws.assignments.find((item) => item.id === action.assignmentId);
  if (!row || row.status !== 'assigned') throw new BuilderRuleError('This assignment is no longer waiting for a response.', 'conflict');
  if (action.actorDealerId && row.dealerId !== action.actorDealerId) throw new BuilderRuleError('This lead is not assigned to you.', 'forbidden');
  const lead = ws.leads.find((item) => item.id === row.leadId);
  if (!lead) throw new BuilderRuleError('Lead not found.', 'not_found');
  row.respondedAt = now;
  if (action.decision === 'accept') {
    row.status = 'accepted';
    lead.stage = 'accepted';
    lead.updatedAt = now;
    event('assignment', 'lead', lead.id, 'Dealer accepted', row.dealerName);
    return;
  }
  if (!action.reason || !DECLINE_REASONS.includes(action.reason)) throw new BuilderRuleError('Choose a decline reason.');
  row.status = 'declined';
  row.declineReason = action.reason;
  const dealer = ws.dealers.find((item) => item.id === row.dealerId);
  if (dealer) dealer.openLeads = Math.max(0, dealer.openLeads - 1);
  event('assignment', 'lead', lead.id, `Declined (${action.reason})`, row.dealerName);
  if (row.mode === 'auto') fallback(ws, lead, nowDate, now, newId, event);
  else {
    lead.stage = 'needs_reassignment';
    lead.updatedAt = now;
  }
}

function sweep(
  ws: BuilderWorkspace,
  nowDate: Date,
  now: string,
  newId: (prefix: string) => string,
  event: (kind: 'assignment' | 'audit' | 'tour' | 'lead', entity: string, entityId: string, detail: string, actor?: string) => void,
) {
  const due = ws.assignments.filter((row) => {
    if (row.status !== 'assigned') return false;
    return new Date(row.assignedAt).getTime() + row.responseWindowMinutes * 60 * 1000 <= nowDate.getTime();
  });
  for (const row of due) {
    row.status = 'timed_out';
    row.respondedAt = now;
    const dealer = ws.dealers.find((item) => item.id === row.dealerId);
    if (dealer) dealer.openLeads = Math.max(0, dealer.openLeads - 1);
    const lead = ws.leads.find((item) => item.id === row.leadId);
    if (!lead) continue;
    event('assignment', 'lead', lead.id, `No response from ${row.dealerName}`);
    if (row.mode === 'auto') fallback(ws, lead, nowDate, now, newId, event);
    else {
      lead.stage = 'needs_reassignment';
      lead.updatedAt = now;
    }
  }
}

function fallback(
  ws: BuilderWorkspace,
  lead: BuilderLead,
  nowDate: Date,
  now: string,
  newId: (prefix: string) => string,
  event: (kind: 'assignment' | 'audit' | 'tour' | 'lead', entity: string, entityId: string, detail: string, actor?: string) => void,
) {
  const failures = ws.assignments.filter((row) => row.leadId === lead.id && (row.status === 'timed_out' || row.status === 'declined')).length;
  const tried = new Set(ws.assignments.filter((row) => row.leadId === lead.id).map((row) => row.dealerId));
  if (failures > ws.settings.maxReassignments) {
    lead.stage = 'needs_reassignment';
    lead.updatedAt = now;
    event('assignment', 'lead', lead.id, 'Needs reassignment — retry limit reached');
    return;
  }
  const ranked = rankDealers(ws, requirementFromLead(lead), nowDate);
  const nextDealer = ranked.eligible.find((item) => !tried.has(item.dealerId));
  if (!nextDealer) {
    lead.stage = 'needs_reassignment';
    lead.updatedAt = now;
    event('assignment', 'lead', lead.id, 'Needs reassignment — no further eligible dealer');
    return;
  }
  event('assignment', 'lead', lead.id, 'Reassignment triggered');
  assignLead(ws, { type: 'assign_lead', leadId: lead.id, mode: 'auto', dealerId: nextDealer.dealerId }, nowDate, now, newId, event);
}
