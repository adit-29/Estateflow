import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  dealerInviteSchema,
  inviteCanBeAcceptedBy,
  reportCreateSchema,
  resourceShareSchema,
  visibilitySettingsSchema,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NetworkService {
  constructor(private readonly prisma: PrismaService) {}

  async directory(query: { locality?: string; propertyType?: string; transactionType?: string }) {
    const profiles = await this.prisma.dealerProfile.findMany({
      where: {
        showInDirectory: true,
        deletedAt: null,
        onboardingComplete: true,
        ...(query.locality ? { operatingLocalities: { has: query.locality } } : {}),
        ...(query.propertyType ? { propertyTypes: { has: query.propertyType as never } } : {}),
        ...(query.transactionType ? { transactionTypes: { has: query.transactionType as never } } : {}),
      },
      include: { agency: true, account: true },
      take: 50,
    });

    return profiles.map((p) => ({
      id: p.id,
      agencyId: p.agencyId,
      fullName: p.fullName,
      verificationStatus: p.account.onboardingStatus,
      specializations: {
        localities: p.showLocalities ? p.operatingLocalities : [],
        propertyTypes: p.showPropertyTypes ? p.propertyTypes : [],
        transactionTypes: p.transactionTypes,
        experienceBand: p.showExperience ? p.experienceBand : null,
      },
      mobile: p.showMobile ? p.mobile : null,
      note: 'Directory shows only dealer-selected visible fields. No fabricated ratings.',
    }));
  }

  async passport(agencyId: string) {
    const profile = await this.prisma.dealerProfile.findFirst({
      where: { agencyId },
      include: { account: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const since = new Date(Date.now() - 90 * 86400000);
    const [completedVisits, dealsClosed] = await Promise.all([
      this.prisma.siteVisit.count({
        where: { agencyId, status: 'completed', updatedAt: { gte: since } },
      }),
      this.prisma.deal.count({
        where: { agencyId, pipelineStage: 'closed_won', updatedAt: { gte: since } },
      }),
    ]);

    const fields = [
      profile.fullName,
      profile.mobile,
      profile.agencyId,
      profile.operatingLocalities.length,
      profile.propertyTypes.length,
    ];
    const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);

    return {
      profileCompleteness: completeness,
      accountStatus: profile.account.onboardingStatus,
      verificationStatus: profile.account.onboardingStatus,
      specialization: {
        localities: profile.operatingLocalities,
        propertyTypes: profile.propertyTypes,
        transactionTypes: profile.transactionTypes,
        experienceBand: profile.experienceBand,
      },
      metrics: {
        periodDays: 90,
        completedVisits: {
          value: completedVisits,
          definition: 'Site visits marked completed in the last 90 days (platform events only).',
        },
        closedDeals: {
          value: dealsClosed,
          definition: 'Deals moved to closed_won in the last 90 days.',
        },
      },
      disclaimer: 'No reputation score — only counts from verified platform activity.',
    };
  }

  async updateVisibility(agencyId: string, raw: unknown) {
    const input = visibilitySettingsSchema.parse(raw);
    return this.prisma.dealerProfile.updateMany({
      where: { agencyId },
      data: input,
    });
  }

  async invite(fromAgencyId: string, accountId: string, raw: unknown) {
    const input = dealerInviteSchema.parse(raw);
    return this.prisma.dealerConnection.create({
      data: {
        fromAgencyId,
        inviteeEmail: input.inviteeEmail?.toLowerCase(),
        inviteePhone: input.inviteePhone,
        invitedByAccountId: accountId,
        status: 'pending',
      },
    });
  }

  async acceptInvite(connectionId: string, toAgencyId: string, callerEmail: string) {
    const conn = await this.prisma.dealerConnection.findUnique({ where: { id: connectionId } });
    if (!conn || conn.status !== 'pending') throw new BadRequestException('Invalid invitation');
    if (!inviteCanBeAcceptedBy(conn.inviteeEmail, callerEmail)) {
      throw new ForbiddenException('This invitation is not addressed to your account');
    }
    if (conn.fromAgencyId === toAgencyId) {
      throw new BadRequestException('Cannot accept an invitation from your own agency');
    }
    return this.prisma.dealerConnection.update({
      where: { id: connectionId },
      data: { status: 'accepted', toAgencyId, acceptedAt: new Date() },
    });
  }

  async shareResource(ownerAgencyId: string, raw: unknown) {
    const input = resourceShareSchema.parse(raw);
    const conn = await this.prisma.dealerConnection.findFirst({
      where: {
        id: input.connectionId,
        status: 'accepted',
        OR: [{ fromAgencyId: ownerAgencyId }, { toAgencyId: ownerAgencyId }],
      },
    });
    if (!conn) throw new ForbiddenException('Active connection required');

    const sharedWithAgencyId =
      conn.fromAgencyId === ownerAgencyId ? conn.toAgencyId! : conn.fromAgencyId;

    if (input.resourceType === 'property') {
      const property = await this.prisma.property.findFirst({
        where: { id: input.resourceId, agencyId: ownerAgencyId },
      });
      if (!property) throw new NotFoundException('Property not found');
      await this.prisma.propertyNetworkShare.upsert({
        where: {
          propertyId_sharedWithAgencyId: {
            propertyId: input.resourceId,
            sharedWithAgencyId,
          },
        },
        create: {
          propertyId: input.resourceId,
          ownerAgencyId,
          sharedWithAgencyId,
        },
        update: { revokedAt: null },
      });
    }

    return this.prisma.resourceShare.create({
      data: {
        connectionId: input.connectionId,
        ownerAgencyId,
        sharedWithAgencyId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    });
  }

  async revokeShare(ownerAgencyId: string, shareId: string) {
    const share = await this.prisma.resourceShare.findFirst({
      where: { id: shareId, ownerAgencyId, revokedAt: null },
    });
    if (!share) throw new NotFoundException('Share not found');
    return this.prisma.resourceShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  async report(reporterAccountId: string, raw: unknown) {
    const input = reportCreateSchema.parse(raw);
    return this.prisma.report.create({
      data: {
        reporterAccountId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        status: 'open',
      },
    });
  }

  async adminQueue() {
    return this.prisma.report.findMany({
      where: { status: { in: ['open', 'under_review'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
