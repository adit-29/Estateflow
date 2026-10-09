import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const stage = process.env.APP_ENV?.trim().toLowerCase() || (process.env.NODE_ENV === 'production' ? 'production' : 'local');
  if (stage !== 'local') {
    console.log(`Demo seed refused: APP_ENV=${stage}. Demo accounts are local-only.`);
    process.exitCode = 1;
    return;
  }

  console.log('Seeding demo data (development only)...');

  const demoEmail = 'demo.dealer@estateflow.local';
  const subjectId = 'local_demo_dealer_seed';
  const passwordHash = await bcrypt.hash('DemoPass123!', 10);

  await prisma.localAuthCredential.upsert({
    where: { email: demoEmail },
    create: { subjectId, email: demoEmail, passwordHash, verifyCode: null },
    update: { passwordHash, verifyCode: null },
  });

  const account = await prisma.account.upsert({
    where: { subjectId },
    create: {
      subjectId,
      email: demoEmail,
      role: 'dealer',
      emailVerified: true,
      onboardingStatus: 'pending',
    },
    update: {},
  });

  const agency = await prisma.agency.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    create: { id: '00000000-0000-4000-8000-000000000001', name: 'Demo Realty Agency' },
    update: { name: 'Demo Realty Agency' },
  });

  await prisma.dealerMembership.upsert({
    where: {
      agencyId_accountId: { agencyId: agency.id, accountId: account.id },
    },
    create: { agencyId: agency.id, accountId: account.id, role: 'owner' },
    update: {},
  });

  await prisma.dealerProfile.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      agencyId: agency.id,
      fullName: 'Demo Dealer',
      mobile: '+919999000001',
      email: demoEmail,
      operatingLocalities: ['Koramangala', 'HSR Layout'],
      propertyTypes: ['flat', 'builder_floor'],
      transactionTypes: ['sale', 'resale'],
      budgetBands: ['50l_1cr', '1cr_2cr'],
      experienceBand: '3_5',
      activeBuyerCount: 8,
      activePropertyCount: 15,
      onboardingComplete: true,
    },
    update: {},
  });

  await prisma.lead.deleteMany({ where: { agencyId: agency.id } });
  await prisma.lead.createMany({
    data: [
      {
        agencyId: agency.id,
        name: 'Ananya Sharma',
        phone: '+919876543210',
        source: 'portal',
        requirementSummary: '3 BHK near metro, ready to move',
        budgetBand: '1cr_2cr',
        preferredLocalities: ['Indiranagar'],
        propertyType: 'flat',
        transactionType: 'sale',
        timeline: 'Within 2 months',
        status: 'new',
        nextFollowUpAt: new Date(Date.now() - 86400000),
      },
      {
        agencyId: agency.id,
        name: 'Vikram Patel',
        phone: '+919988776655',
        source: 'referral',
        requirementSummary: 'Plot in North Bangalore',
        budgetBand: '2cr_5cr',
        preferredLocalities: ['Yelahanka'],
        propertyType: 'plot',
        transactionType: 'investment',
        status: 'qualified',
        nextFollowUpAt: new Date(Date.now() + 86400000 * 3),
      },
    ],
  });

  await prisma.property.deleteMany({ where: { agencyId: agency.id } });
  const prop1 = await prisma.property.create({
    data: {
      agencyId: agency.id,
      title: '3 BHK in Koramangala 5th Block',
      locality: 'Koramangala',
      propertyType: 'flat',
      bedrooms: 3,
      areaValue: 1450,
      areaUnit: 'sqft',
      priceAmount: 95_00_000,
      transactionType: 'sale',
      listingStatus: 'active',
      isVerifiedListing: false,
      furnishing: 'semi_furnished',
      photoUrls: ['/mock-uploads/demo-koramangala.jpg'],
      lastConfirmedAt: new Date(),
    },
  });
  await prisma.property.create({
    data: {
      agencyId: agency.id,
      title: '2 BHK near HSR Metro',
      locality: 'HSR Layout',
      propertyType: 'flat',
      bedrooms: 2,
      priceAmount: 78_00_000,
      transactionType: 'resale',
      listingStatus: 'active',
      isVerifiedListing: false,
    },
  });

  await prisma.buyerRequirement.deleteMany({ where: { agencyId: agency.id } });
  await prisma.buyerRequirement.create({
    data: {
      agencyId: agency.id,
      contactName: 'Ananya Sharma',
      phone: '+919876543210',
      localities: ['Koramangala', 'Indiranagar'],
      propertyTypes: ['flat'],
      bedroomsMin: 2,
      bedroomsMax: 3,
      budgetMin: 80_00_000,
      budgetMax: 1_05_00_000,
      transactionType: 'sale',
      readiness: 'ready',
      moveInTimeline: 'Within 60 days',
      mustHaveCriteria: 'Metro access, 2+ parking',
    },
  });

  const deal = await prisma.deal.create({
    data: {
      agencyId: agency.id,
      title: 'Ananya — Koramangala 3 BHK',
      propertyId: prop1.id,
      value: 95_00_000,
      pipelineStage: 'negotiation',
      status: 'active',
      responsibleAccountId: account.id,
    },
  });
  await prisma.commissionAgreement.create({
    data: {
      dealId: deal.id,
      percentage: 1.5,
      paymentStatus: 'pending',
      demoLegalAck: true,
      payerSource: 'Seller (demo)',
    },
  });

  console.log('Demo dealer:', demoEmail, '/ DemoPass123!');
  console.log('Label: DEMO DATA — for local development only');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
