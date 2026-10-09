/**
 * Runs against Postgres when TEST_DATABASE_URL is set and migrations are applied.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../src/prisma/prisma.service';
import { BuilderService } from '../src/builder/builder.service';

const url = process.env.TEST_DATABASE_URL;
const run = describe.skipIf(!url);

async function statusOf(p: Promise<unknown>) {
  try {
    await p;
    return 200;
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : 500;
  }
}

run('builder portal against Postgres', () => {
  let prisma: PrismaService;
  let builder: BuilderService;
  const ids = { orgA: '', orgB: '', accountA: '', accountB: '' };

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } }) as unknown as PrismaService;
    builder = new BuilderService(prisma);
    const accountA = await prisma.account.create({ data: { subjectId: `local:builder-a-${Date.now()}`, email: `builder-a-${Date.now()}@test.local`, role: 'builder', emailVerified: true } });
    const accountB = await prisma.account.create({ data: { subjectId: `local:builder-b-${Date.now()}`, email: `builder-b-${Date.now()}@test.local`, role: 'builder', emailVerified: true } });
    const orgA = await prisma.builderOrganization.create({ data: { name: 'Org A', memberships: { create: { accountId: accountA.id } } } });
    const orgB = await prisma.builderOrganization.create({ data: { name: 'Org B', memberships: { create: { accountId: accountB.id } } } });
    ids.accountA = accountA.id;
    ids.accountB = accountB.id;
    ids.orgA = orgA.id;
    ids.orgB = orgB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps projects inside the builder organization and rejects a bad tour transition', async () => {
    const created = await builder.apply(ids.orgA, ids.accountA, {
      type: 'create_project',
      project: {
        name: 'Live Heights',
        projectType: 'residential',
        developerName: 'Org A',
        city: 'Delhi',
        locality: 'Dwarka',
        address: 'Sector 1',
        description: 'A real account project',
        reraNumber: null,
        constructionStatus: 'under_construction',
        possessionDate: null,
        amenities: [],
        visibility: 'private',
        status: 'draft',
        latitude: null,
        longitude: null,
      },
    });
    const projectId = created.projects[0].id;
    const other = await builder.workspace(ids.orgB, ids.accountB);
    expect(other.projects.some((project) => project.id === projectId)).toBe(false);
    expect(await statusOf(builder.apply(ids.orgB, ids.accountB, { type: 'update_project', id: projectId, patch: { name: 'Stolen' } }))).toBe(404);

    const tower = await builder.apply(ids.orgA, ids.accountA, { type: 'add_tower', projectId, name: 'Tower A' });
    const towerId = tower.towers[0].id;
    const floor = await builder.apply(ids.orgA, ids.accountA, { type: 'add_floor', towerId, label: 'Floor 1', level: 1 });
    const floorId = floor.floors[0].id;
    const withUnit = await builder.apply(ids.orgA, ids.accountA, {
      type: 'add_unit',
      floorId,
      unit: {
        unitNumber: 'A-101',
        configuration: '3BHK',
        bedrooms: 3,
        bathrooms: 2,
        carpetAreaSqft: 1000,
        saleableAreaSqft: 1200,
        facing: 'Park',
        balcony: true,
        parking: '1',
        basePrice: 10000000,
        additionalCharges: 0,
        plc: 0,
        otherCharges: 0,
        availability: 'available',
      },
    });
    const unitId = withUnit.units[0].id;
    const held = await builder.apply(ids.orgA, ids.accountA, { type: 'set_unit_status', unitId, availability: 'on_hold', confirm: true });
    expect(held.units.find((unit) => unit.id === unitId)?.availability).toBe('on_hold');
    expect(held.timeline.some((event) => event.detail.includes('on_hold'))).toBe(true);

    expect(await statusOf(builder.apply(ids.orgA, ids.accountA, {
      type: 'add_media',
      media: {
        projectId,
        unitId: '00000000-0000-0000-0000-000000000000',
        kind: 'image',
        category: 'Exterior',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        durationSeconds: null,
        objectKey: null,
        visibility: 'private',
        uploadedByName: 'Builder',
      },
    }))).toBe(403);

    const tour = await builder.apply(ids.orgA, ids.accountA, {
      type: 'create_tour',
      tour: {
        projectId,
        unitId,
        source: 'video',
        fileName: 'walk.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 2_000_000,
        durationSeconds: 40,
        consent: true,
      },
    });
    const tourId = tour.tours[0].id;
    expect(await statusOf(builder.apply(ids.orgA, ids.accountA, { type: 'transition_tour', id: tourId, to: 'published' }))).toBe(400);
    expect(await statusOf(builder.apply(ids.orgA, ids.accountA, { type: 'transition_tour', id: tourId, to: 'queued' }))).toBe(409);
    expect(await statusOf(builder.apply(ids.orgA, ids.accountA, { type: 'demo_process_tour', id: tourId }))).toBe(403);
    expect(await statusOf(builder.getTourJob(ids.orgB, ids.accountB, tourId))).toBe(404);
    expect(await statusOf(builder.listProjects(ids.orgA, ids.accountA, -1, 20))).toBe(400);
    expect(await statusOf(builder.copilot(ids.orgA, ids.accountA, ' '))).toBe(400);

    const media = await builder.apply(ids.orgA, ids.accountA, {
      type: 'add_media',
      media: {
        projectId,
        unitId,
        kind: 'image',
        category: 'Exterior',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        durationSeconds: null,
        objectKey: null,
        visibility: 'private',
        uploadedByName: 'Builder',
      },
    });
    const mediaId = media.media[0].id;
    expect(await statusOf(builder.viewUrl(ids.orgB, ids.accountB, mediaId))).toBe(404);
    expect(await statusOf(builder.deleteMedia(ids.orgB, ids.accountB, mediaId))).toBe(404);

    const withDealer = await builder.apply(ids.orgA, ids.accountA, {
      type: 'save_dealer',
      dealer: {
        name: 'Live Dealer',
        agencyName: 'Live Agency',
        active: true,
        suspended: false,
        localities: ['Dwarka'],
        nearbyLocalities: [],
        propertyTypes: ['residential'],
        configurations: ['3BHK'],
        transactionTypes: ['sale'],
        budgetMin: 1,
        budgetMax: 20_000_000,
        optedOutLeadTypes: [],
        capacity: 4,
        responseWindowDays: 30,
      },
    });
    const dealerId = withDealer.dealers[0].id;
    const granted = await builder.grantAccess(ids.orgA, ids.accountA, dealerId, { projectId, permissions: ['VIEW_PROJECT', 'RECEIVE_LEADS'] });
    const accessId = granted.access[0].id;
    expect(await statusOf(builder.revokeAccess(ids.orgB, ids.accountB, accessId))).toBe(404);

    const agency = await prisma.agency.create({ data: { name: `Agency ${Date.now()}` } });
    const otherAgency = await prisma.agency.create({ data: { name: `Other ${Date.now()}` } });
    await builder.apply(ids.orgA, ids.accountA, { type: 'set_dealer_agency', dealerId, agencyId: agency.id });
    const leadWs = await builder.createLead(ids.orgA, ids.accountA, {
      projectId,
      unitId,
      buyerName: 'Live Buyer',
      phone: '9000000000',
      budgetMin: 1000000,
      budgetMax: 2000000,
      bedrooms: 3,
      configuration: '3BHK',
      transactionType: 'sale',
      locality: 'Dwarka',
      propertyType: 'residential',
      requirementNote: 'Test',
    });
    const leadId = leadWs.leads[0].id;
    const assigned = await builder.assignLead(ids.orgA, ids.accountA, leadId, { mode: 'manual', dealerId });
    const assignmentId = assigned.assignments.find((row) => row.leadId === leadId)?.id ?? '';
    expect(await statusOf(builder.respondAsDealer(otherAgency.id, assignmentId, 'accept'))).toBe(403);
    expect(await statusOf(builder.getTourJob(ids.orgA, ids.accountA, tourId))).toBe(200);
  });
});
