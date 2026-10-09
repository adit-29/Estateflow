/**
 * Runs against Postgres when TEST_DATABASE_URL is set and migrations are applied.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../src/prisma/prisma.service';
import { DealsPipelineService } from '../src/deals-pipeline/deals-pipeline.service';
import { NetworkService } from '../src/network/network.service';
import { TenantAccessService } from '../src/access/tenant-access.service';
import { SiteVisitsService } from '../src/site-visits/site-visits.service';
import { PropertiesService } from '../src/properties/properties.service';

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

run('cross-agency IDOR guards', () => {
  let prisma: PrismaService;
  let deals: DealsPipelineService;
  let network: NetworkService;
  let visits: SiteVisitsService;
  let properties: PropertiesService;
  const ids = {
    agencyA: '',
    agencyB: '',
    accountA: '',
    accountB: '',
    emailB: '',
    leadB: '',
    propertyA: '',
    propertyB: '',
    invite: '',
  };

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } }) as unknown as PrismaService;
    deals = new DealsPipelineService(prisma);
    network = new NetworkService(prisma);
    const access = new TenantAccessService(prisma);
    visits = new SiteVisitsService(prisma, access);
    properties = new PropertiesService(prisma, access);

    const stamp = Date.now();
    const accountA = await prisma.account.create({
      data: { subjectId: `local:idor-a-${stamp}`, email: `idor-a-${stamp}@test.local`, role: 'dealer', emailVerified: true },
    });
    const accountB = await prisma.account.create({
      data: { subjectId: `local:idor-b-${stamp}`, email: `idor-b-${stamp}@test.local`, role: 'dealer', emailVerified: true },
    });
    const agencyA = await prisma.agency.create({ data: { name: 'Agency A' } });
    const agencyB = await prisma.agency.create({ data: { name: 'Agency B' } });
    await prisma.dealerMembership.create({ data: { agencyId: agencyA.id, accountId: accountA.id, role: 'owner' } });
    await prisma.dealerMembership.create({ data: { agencyId: agencyB.id, accountId: accountB.id, role: 'owner' } });
    const leadB = await prisma.lead.create({
      data: {
        agencyId: agencyB.id,
        name: 'Foreign lead',
        phone: '+919000000001',
        source: 'other',
        status: 'new',
        preferredLocalities: [],
      },
    });
    const propertyA = await prisma.property.create({
      data: {
        agencyId: agencyA.id,
        title: 'Own listing',
        locality: 'Dwarka',
        propertyType: 'flat',
        transactionType: 'sale',
        listingStatus: 'active',
        photoUrls: [],
      },
    });
    const propertyB = await prisma.property.create({
      data: {
        agencyId: agencyB.id,
        title: 'Foreign listing',
        locality: 'HSR',
        propertyType: 'flat',
        transactionType: 'sale',
        listingStatus: 'active',
        photoUrls: [],
      },
    });
    const invite = await prisma.dealerConnection.create({
      data: {
        fromAgencyId: agencyA.id,
        inviteeEmail: accountB.email,
        invitedByAccountId: accountA.id,
        status: 'pending',
      },
    });
    ids.agencyA = agencyA.id;
    ids.agencyB = agencyB.id;
    ids.accountA = accountA.id;
    ids.accountB = accountB.id;
    ids.emailB = accountB.email;
    ids.leadB = leadB.id;
    ids.propertyA = propertyA.id;
    ids.propertyB = propertyB.id;
    ids.invite = invite.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects deals and visits that reference another agency', async () => {
    expect(
      await statusOf(
        deals.create(ids.agencyA, ids.accountA, {
          title: 'Stolen lead deal',
          leadId: ids.leadB,
        }),
      ),
    ).toBe(404);
    expect(
      await statusOf(
        deals.create(ids.agencyA, ids.accountA, {
          title: 'Stolen property deal',
          propertyId: ids.propertyB,
        }),
      ),
    ).toBe(404);
    expect(
      await statusOf(
        visits.create(ids.agencyA, ids.accountA, {
          propertyId: ids.propertyA,
          leadId: ids.leadB,
          scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
          meetingPoint: 'Gate 1',
          assignedAccountId: ids.accountA,
        }),
      ),
    ).toBe(404);
    expect(
      await statusOf(
        visits.create(ids.agencyA, ids.accountA, {
          propertyId: ids.propertyA,
          scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
          meetingPoint: 'Gate 1',
          assignedAccountId: ids.accountB,
        }),
      ),
    ).toBe(400);
  });

  it('binds invite accept to the invitee email', async () => {
    expect(await statusOf(network.acceptInvite(ids.invite, ids.agencyB, 'stranger@test.local'))).toBe(403);
    const accepted = await network.acceptInvite(ids.invite, ids.agencyB, ids.emailB);
    expect(accepted.status).toBe('accepted');
    expect(accepted.toAgencyId).toBe(ids.agencyB);
  });

  it('archives only the owning agency listing', async () => {
    expect(await statusOf(properties.archive(ids.agencyA, ids.accountA, ids.propertyB))).toBe(404);
    const archived = await properties.archive(ids.agencyA, ids.accountA, ids.propertyA);
    expect(archived.listingStatus).toBe('archived');
  });

});
