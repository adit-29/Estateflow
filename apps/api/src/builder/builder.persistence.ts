import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  assignmentWeightsFromEnv,
  emptyBuilderWorkspace,
  notificationPrefsFrom,
  type AccessPermission,
  type AssignmentMode,
  type AssignmentStatus,
  type AssignmentWeights,
  type BuilderMedia,
  type BuilderTourJob,
  type BuilderWorkspace,
  type DeclineReason,
  type LeadStage,
  type ScoreFactor,
} from '@estateflow/shared';
import type { PrismaService } from '../prisma/prisma.service';
import { readStorageConfig } from '../reconstruction/tour-storage';

type Tx = Prisma.TransactionClient;

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function at(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

export async function loadBuilderWorkspace(tx: Tx, organizationId: string): Promise<BuilderWorkspace> {
  const org = await tx.builderOrganization.findUniqueOrThrow({ where: { id: organizationId } });
  const [projects, towers, floors, units, media, tours, dealers, groups, access, leads, assignments, events] = await Promise.all([
    tx.builderProject.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
    tx.builderTower.findMany({ where: { organizationId }, orderBy: { sortOrder: 'asc' } }),
    tx.builderFloor.findMany({ where: { organizationId }, orderBy: { level: 'asc' } }),
    tx.builderUnit.findMany({ where: { organizationId }, orderBy: { unitNumber: 'asc' } }),
    tx.builderMedia.findMany({ where: { organizationId }, orderBy: { sortOrder: 'asc' } }),
    tx.builderTourJob.findMany({ where: { organizationId }, orderBy: { updatedAt: 'desc' } }),
    tx.builderNetworkDealer.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
    tx.builderDealerGroup.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
    tx.dealerProjectAccess.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
    tx.builderLead.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
    tx.builderAssignment.findMany({ where: { organizationId }, orderBy: { assignedAt: 'desc' } }),
    tx.builderWorkspaceEvent.findMany({ where: { organizationId }, orderBy: { at: 'desc' }, take: 300 }),
  ]);
  const storageMode = readStorageConfig().configured ? 'private_s3' : 'metadata_only';
  const ws = emptyBuilderWorkspace({
    organizationId: org.id,
    organizationName: org.name,
    storageMode,
    weights: assignmentWeightsFromEnv(),
  });
  ws.settings.mode = org.assignmentMode as AssignmentMode;
  ws.settings.responseWindowMinutes = org.responseWindowMinutes;
  ws.settings.maxReassignments = org.maxReassignments;
  ws.settings.notifications = notificationPrefsFrom(org.notificationPrefs);
  ws.projects = projects.map((row) => ({
    id: row.id,
    name: row.name,
    projectType: row.projectType as BuilderWorkspace['projects'][number]['projectType'],
    developerName: row.developerName,
    city: row.city,
    locality: row.locality,
    address: row.address,
    description: row.description,
    reraNumber: row.reraNumber,
    constructionStatus: row.constructionStatus as BuilderWorkspace['projects'][number]['constructionStatus'],
    possessionDate: row.possessionDate,
    amenities: row.amenities,
    visibility: row.visibility as BuilderWorkspace['projects'][number]['visibility'],
    status: row.status as BuilderWorkspace['projects'][number]['status'],
    latitude: row.latitude,
    longitude: row.longitude,
    updatedAt: row.updatedAt.toISOString(),
  }));
  ws.towers = towers.map((row) => ({ id: row.id, projectId: row.projectId, name: row.name, sortOrder: row.sortOrder }));
  ws.floors = floors.map((row) => ({ id: row.id, projectId: row.projectId, towerId: row.towerId, label: row.label, level: row.level }));
  ws.units = units.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    towerId: row.towerId,
    floorId: row.floorId,
    unitNumber: row.unitNumber,
    configuration: row.configuration,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    carpetAreaSqft: row.carpetAreaSqft,
    saleableAreaSqft: row.saleableAreaSqft,
    facing: row.facing,
    balcony: row.balcony,
    parking: row.parking,
    basePrice: row.basePrice,
    additionalCharges: row.additionalCharges,
    plc: row.plc,
    otherCharges: row.otherCharges,
    availability: row.availability as BuilderWorkspace['units'][number]['availability'],
    holdExpiresAt: iso(row.holdExpiresAt),
    bookingStatus: row.bookingStatus,
    lastConfirmedAt: iso(row.lastConfirmedAt),
    updatedAt: row.updatedAt.toISOString(),
  }));
  ws.media = media.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    unitId: row.unitId,
    kind: row.kind as BuilderMedia['kind'],
    category: row.category,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    durationSeconds: row.durationSeconds,
    storage: row.storage as BuilderMedia['storage'],
    objectKey: row.objectKey,
    visibility: row.visibility as BuilderMedia['visibility'],
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    processingStatus: row.processingStatus as BuilderMedia['processingStatus'],
    uploadedByName: row.uploadedByName,
    createdAt: row.createdAt.toISOString(),
  }));
  ws.tours = tours.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    unitId: row.unitId,
    source: row.source as BuilderTourJob['source'],
    status: row.status as BuilderTourJob['status'],
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    durationSeconds: row.durationSeconds,
    consentAt: iso(row.consentAt),
    demoSimulation: row.demoSimulation,
    provider: row.provider,
    providerJobRef: row.providerJobRef,
    progress: row.progress,
    providerMessage: row.providerMessage,
    resultKind: row.resultKind as BuilderTourJob['resultKind'],
    resultAssetKey: row.resultAssetKey,
    resultVersion: row.resultVersion,
    resultCreatedAt: iso(row.resultCreatedAt),
    errorMessage: row.errorMessage,
    updatedAt: row.updatedAt.toISOString(),
  }));
  ws.dealers = dealers.map((row) => ({
    id: row.id,
    name: row.name,
    agencyName: row.agencyName,
    active: row.active,
    suspended: row.suspended,
    verified: row.verified,
    localities: row.localities,
    nearbyLocalities: row.nearbyLocalities,
    propertyTypes: row.propertyTypes,
    configurations: row.configurations,
    transactionTypes: row.transactionTypes,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    optedOutLeadTypes: row.optedOutLeadTypes,
    openLeads: row.openLeads,
    capacity: row.capacity,
    responsesInWindow: row.responsesInWindow,
    assignmentsInWindow: row.assignmentsInWindow,
    responseWindowDays: row.responseWindowDays,
    preferredProjectIds: row.preferredProjectIds,
    lastActivityAt: iso(row.lastActivityAt),
    platformDealerId: row.platformDealerId,
    agencyId: row.agencyId,
  }));
  ws.groups = groups.map((row) => ({ id: row.id, name: row.name, campaignName: row.campaignName, dealerIds: row.dealerIds }));
  ws.access = access.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    dealerId: row.dealerId,
    towerId: row.towerId,
    unitId: row.unitId,
    campaignName: row.campaignName,
    permissions: row.permissions as AccessPermission[],
    expiresAt: iso(row.expiresAt),
    createdAt: row.createdAt.toISOString(),
  }));
  ws.leads = leads.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    unitId: row.unitId,
    buyerName: row.buyerName,
    phone: row.phone,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    bedrooms: row.bedrooms,
    configuration: row.configuration,
    transactionType: row.transactionType,
    locality: row.locality,
    propertyType: row.propertyType,
    requirementNote: row.requirementNote,
    stage: row.stage as LeadStage,
    visitAt: iso(row.visitAt),
    visitOutcome: row.visitOutcome,
    firstContactAt: iso(row.firstContactAt),
    bookingStatus: row.bookingStatus,
    commissionStatus: row.commissionStatus as BuilderWorkspace['leads'][number]['commissionStatus'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  ws.assignments = assignments.map((row) => ({
    id: row.id,
    leadId: row.leadId,
    dealerId: row.dealerId,
    dealerName: row.dealerName,
    score: row.score,
    factors: row.factors as unknown as ScoreFactor[],
    weights: row.weights as unknown as AssignmentWeights,
    mode: row.mode as AssignmentMode,
    status: row.status as AssignmentStatus,
    responseWindowMinutes: row.responseWindowMinutes,
    assignedAt: row.assignedAt.toISOString(),
    respondedAt: iso(row.respondedAt),
    declineReason: row.declineReason as DeclineReason | null,
  }));
  ws.timeline = events.map((row) => ({
    id: row.id,
    at: row.at.toISOString(),
    kind: row.kind as BuilderWorkspace['timeline'][number]['kind'],
    entity: row.entity,
    entityId: row.entityId,
    detail: row.detail,
    actor: row.actor ?? undefined,
  }));
  return ws;
}

export async function saveBuilderWorkspace(tx: Tx, ws: BuilderWorkspace, accountId: string | undefined, previousEventIds: Set<string>): Promise<void> {
  const orgId = ws.organizationId;
  await tx.builderOrganization.update({
    where: { id: orgId },
    data: {
      name: ws.organizationName,
      assignmentMode: ws.settings.mode,
      responseWindowMinutes: ws.settings.responseWindowMinutes,
      maxReassignments: ws.settings.maxReassignments,
      notificationPrefs: ws.settings.notifications as unknown as Prisma.InputJsonValue,
    },
  });

  for (const project of ws.projects) {
    const data = {
      organizationId: orgId,
      name: project.name,
      projectType: project.projectType,
      developerName: project.developerName,
      city: project.city,
      locality: project.locality,
      address: project.address,
      description: project.description,
      reraNumber: project.reraNumber,
      constructionStatus: project.constructionStatus,
      possessionDate: project.possessionDate,
      amenities: project.amenities,
      visibility: project.visibility,
      status: project.status,
      latitude: project.latitude,
      longitude: project.longitude,
      updatedAt: new Date(project.updatedAt),
    };
    await tx.builderProject.upsert({ where: { id: project.id }, create: { id: project.id, ...data }, update: data });
  }
  for (const tower of ws.towers) {
    const data = { organizationId: orgId, projectId: tower.projectId, name: tower.name, sortOrder: tower.sortOrder };
    await tx.builderTower.upsert({ where: { id: tower.id }, create: { id: tower.id, ...data }, update: data });
  }
  for (const floor of ws.floors) {
    const data = { organizationId: orgId, projectId: floor.projectId, towerId: floor.towerId, label: floor.label, level: floor.level };
    await tx.builderFloor.upsert({ where: { id: floor.id }, create: { id: floor.id, ...data }, update: data });
  }
  for (const unit of ws.units) {
    const data = {
      organizationId: orgId,
      projectId: unit.projectId,
      towerId: unit.towerId,
      floorId: unit.floorId,
      unitNumber: unit.unitNumber,
      configuration: unit.configuration,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      carpetAreaSqft: unit.carpetAreaSqft,
      saleableAreaSqft: unit.saleableAreaSqft,
      facing: unit.facing,
      balcony: unit.balcony,
      parking: unit.parking,
      basePrice: unit.basePrice,
      additionalCharges: unit.additionalCharges,
      plc: unit.plc,
      otherCharges: unit.otherCharges,
      availability: unit.availability,
      holdExpiresAt: at(unit.holdExpiresAt),
      bookingStatus: unit.bookingStatus,
      lastConfirmedAt: at(unit.lastConfirmedAt),
      updatedAt: new Date(unit.updatedAt),
    };
    await tx.builderUnit.upsert({ where: { id: unit.id }, create: { id: unit.id, ...data }, update: data });
  }
  for (const item of ws.media) {
    const data = {
      organizationId: orgId,
      projectId: item.projectId,
      unitId: item.unitId,
      kind: item.kind,
      category: item.category,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      durationSeconds: item.durationSeconds,
      storage: item.storage,
      objectKey: item.objectKey,
      visibility: item.visibility,
      isPrimary: item.isPrimary,
      sortOrder: item.sortOrder,
      processingStatus: item.processingStatus,
      uploadedByName: item.uploadedByName,
      createdAt: new Date(item.createdAt),
    };
    await tx.builderMedia.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
  }
  for (const tour of ws.tours) {
    const data = {
      organizationId: orgId,
      projectId: tour.projectId,
      unitId: tour.unitId,
      source: tour.source,
      status: tour.status,
      fileName: tour.fileName,
      mimeType: tour.mimeType,
      sizeBytes: tour.sizeBytes,
      durationSeconds: tour.durationSeconds,
      consentAt: at(tour.consentAt),
      demoSimulation: false,
      provider: tour.provider,
      providerJobRef: tour.providerJobRef,
      progress: tour.progress,
      providerMessage: tour.providerMessage,
      resultKind: tour.resultKind,
      resultAssetKey: tour.resultAssetKey,
      resultVersion: tour.resultVersion,
      resultCreatedAt: at(tour.resultCreatedAt),
      errorMessage: tour.errorMessage,
      updatedAt: new Date(tour.updatedAt),
    };
    await tx.builderTourJob.upsert({ where: { id: tour.id }, create: { id: tour.id, ...data }, update: data });
  }
  for (const dealer of ws.dealers) {
    const data = {
      organizationId: orgId,
      name: dealer.name,
      agencyName: dealer.agencyName,
      active: dealer.active,
      suspended: dealer.suspended,
      verified: dealer.verified,
      localities: dealer.localities,
      nearbyLocalities: dealer.nearbyLocalities,
      propertyTypes: dealer.propertyTypes,
      configurations: dealer.configurations,
      transactionTypes: dealer.transactionTypes,
      budgetMin: dealer.budgetMin,
      budgetMax: dealer.budgetMax,
      optedOutLeadTypes: dealer.optedOutLeadTypes,
      openLeads: dealer.openLeads,
      capacity: dealer.capacity,
      responsesInWindow: dealer.responsesInWindow,
      assignmentsInWindow: dealer.assignmentsInWindow,
      responseWindowDays: dealer.responseWindowDays,
      preferredProjectIds: dealer.preferredProjectIds,
      lastActivityAt: at(dealer.lastActivityAt),
      platformDealerId: null,
      agencyId: dealer.agencyId,
    };
    await tx.builderNetworkDealer.upsert({ where: { id: dealer.id }, create: { id: dealer.id, ...data }, update: data });
  }
  for (const group of ws.groups) {
    const data = { organizationId: orgId, name: group.name, campaignName: group.campaignName, dealerIds: group.dealerIds };
    await tx.builderDealerGroup.upsert({ where: { id: group.id }, create: { id: group.id, ...data }, update: data });
  }
  for (const row of ws.access) {
    const data = {
      organizationId: orgId,
      projectId: row.projectId,
      dealerId: row.dealerId,
      towerId: row.towerId,
      unitId: row.unitId,
      campaignName: row.campaignName,
      permissions: row.permissions,
      expiresAt: at(row.expiresAt),
      createdAt: new Date(row.createdAt),
    };
    await tx.dealerProjectAccess.upsert({ where: { id: row.id }, create: { id: row.id, ...data }, update: data });
  }
  for (const lead of ws.leads) {
    const data = {
      organizationId: orgId,
      projectId: lead.projectId,
      unitId: lead.unitId,
      buyerName: lead.buyerName,
      phone: lead.phone,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      bedrooms: lead.bedrooms,
      configuration: lead.configuration,
      transactionType: lead.transactionType,
      locality: lead.locality,
      propertyType: lead.propertyType,
      requirementNote: lead.requirementNote,
      stage: lead.stage,
      visitAt: at(lead.visitAt),
      visitOutcome: lead.visitOutcome,
      firstContactAt: at(lead.firstContactAt),
      bookingStatus: lead.bookingStatus,
      commissionStatus: lead.commissionStatus,
      updatedAt: new Date(lead.updatedAt),
    };
    await tx.builderLead.upsert({ where: { id: lead.id }, create: { id: lead.id, ...data, createdAt: new Date(lead.createdAt) }, update: data });
  }
  for (const row of ws.assignments) {
    const data = {
      organizationId: orgId,
      leadId: row.leadId,
      dealerId: row.dealerId,
      dealerName: row.dealerName,
      score: row.score,
      factors: row.factors as unknown as Prisma.InputJsonValue,
      weights: row.weights as unknown as Prisma.InputJsonValue,
      mode: row.mode,
      status: row.status,
      responseWindowMinutes: row.responseWindowMinutes,
      assignedAt: new Date(row.assignedAt),
      respondedAt: at(row.respondedAt),
      declineReason: row.declineReason,
    };
    await tx.builderAssignment.upsert({ where: { id: row.id }, create: { id: row.id, ...data }, update: data });
  }
  const leadIds = new Set(ws.leads.map((lead) => lead.id));
  for (const event of ws.timeline) {
    const data = {
      organizationId: orgId,
      leadId: event.entity === 'lead' && leadIds.has(event.entityId) ? event.entityId : null,
      at: new Date(event.at),
      kind: event.kind,
      entity: event.entity,
      entityId: event.entityId,
      detail: event.detail,
      actor: event.actor ?? null,
    };
    await tx.builderWorkspaceEvent.upsert({ where: { id: event.id }, create: { id: event.id, ...data }, update: data });
    if (accountId && event.kind === 'audit' && !previousEventIds.has(event.id)) {
      await tx.auditEvent.create({
        data: { id: randomUUID(), accountId, action: event.detail, entity: event.entity, entityId: event.entityId, payload: { organizationId: orgId } },
      });
    }
  }

  await tx.builderAssignment.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.assignments.map((row) => row.id) } } });
  await tx.builderLead.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.leads.map((row) => row.id) } } });
  await tx.dealerProjectAccess.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.access.map((row) => row.id) } } });
  await tx.builderMedia.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.media.map((row) => row.id) } } });
  await tx.builderTourJob.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.tours.map((row) => row.id) } } });
  await tx.builderUnit.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.units.map((row) => row.id) } } });
  await tx.builderFloor.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.floors.map((row) => row.id) } } });
  await tx.builderTower.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.towers.map((row) => row.id) } } });
  await tx.builderProject.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.projects.map((row) => row.id) } } });
  await tx.builderDealerGroup.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.groups.map((row) => row.id) } } });
  await tx.builderNetworkDealer.deleteMany({ where: { organizationId: orgId, id: { notIn: ws.dealers.map((row) => row.id) } } });
}

export async function withOrganization<T>(prisma: PrismaService, organizationId: string, accountId: string | undefined, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${organizationId}, true)`;
    if (accountId) await tx.$executeRaw`SELECT set_config('app.current_account', ${accountId}, true)`;
    return fn(tx);
  });
}
