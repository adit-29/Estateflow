import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  dealerOnboardingSchema,
  normalizePhone,
  type DealerOnboardingInput,
  type SessionUser,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class DealerService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(accountId: string) {
    const profile = await this.prisma.dealerProfile.findUnique({
      where: { accountId },
      include: { agency: true },
    });
    if (!profile) {
      return null;
    }
    return profile;
  }

  async getOnboardingDraft(accountId: string) {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    const profile = await this.getProfile(accountId);
    return {
      status: account.onboardingStatus,
      profile,
      completionPercent: profile?.onboardingComplete ? 100 : profile ? 60 : 0,
    };
  }

  async submitOnboarding(accountId: string, raw: DealerOnboardingInput) {
    const input = dealerOnboardingSchema.parse(raw);
    const email = input.email.trim().toLowerCase();
    const mobile = normalizePhone(input.mobile);

    const existingForAccount = await this.prisma.dealerProfile.findUnique({
      where: { accountId },
    });
    if (existingForAccount?.onboardingComplete) {
      throw new ConflictException('Dealer profile already submitted');
    }

    const mobileTaken = await this.prisma.dealerProfile.findFirst({
      where: { mobile, NOT: { accountId } },
    });
    if (mobileTaken) {
      throw new ConflictException('This mobile number is already registered to another dealer');
    }

    await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

    const result = await this.prisma.$transaction(async (tx) => {
      let agencyId = existingForAccount?.agencyId;
      if (!agencyId) {
        const agency = await tx.agency.create({ data: { name: input.agencyName } });
        agencyId = agency.id;
        await tx.dealerMembership.create({
          data: { agencyId, accountId, role: 'owner' },
        });
      } else {
        await tx.agency.update({
          where: { id: agencyId },
          data: { name: input.agencyName },
        });
      }

      const profileData = {
        fullName: input.fullName.trim(),
        mobile,
        email,
        operatingLocalities: input.operatingLocalities.map((l) => l.trim()),
        propertyTypes: input.propertyTypes,
        transactionTypes: input.transactionTypes,
        budgetBands: input.budgetBands,
        experienceBand: input.experienceBand,
        activeBuyerCount: input.activeBuyerCount,
        activePropertyCount: input.activePropertyCount,
        reraNumber: input.reraNumber?.trim() || null,
        reraRegistered: Boolean(input.reraRegistered),
        onboardingComplete: true,
        agencyId,
      };

      const profile = existingForAccount
        ? await tx.dealerProfile.update({
            where: { accountId },
            data: profileData,
          })
        : await tx.dealerProfile.create({
            data: { accountId, ...profileData },
          });

      await tx.account.update({
        where: { id: accountId },
        data: { onboardingStatus: 'pending' },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          action: existingForAccount ? 'dealer.profile.updated' : 'dealer.profile.created',
          entity: 'DealerProfile',
          entityId: profile.id,
          payload: { agencyId },
        },
      });

      await tx.activity.create({
        data: {
          agencyId,
          type: ActivityType.system,
          title: 'Dealer profile submitted',
          body: `${input.fullName} completed onboarding — pending review.`,
        },
      });

      return profile;
    });

    return {
      profile: result,
      onboardingStatus: 'pending' as const,
      message: 'Profile submitted for review. You are not marked verified until reviewed.',
    };
  }

  async saveOnboardingProgress(accountId: string, partial: Partial<DealerOnboardingInput>) {
    const existing = await this.prisma.dealerProfile.findUnique({ where: { accountId } });
    if (existing?.onboardingComplete) {
      throw new ConflictException('Onboarding already complete');
    }

    if (!existing && partial.agencyName) {
      const agency = await this.prisma.agency.create({ data: { name: partial.agencyName } });
      await this.prisma.dealerMembership.create({
        data: { agencyId: agency.id, accountId, role: 'owner' },
      });
      await this.prisma.dealerProfile.create({
        data: {
          accountId,
          agencyId: agency.id,
          fullName: partial.fullName?.trim() ?? 'Pending',
          mobile: partial.mobile ? normalizePhone(partial.mobile) : `pending_${accountId.slice(0, 8)}`,
          email: partial.email?.trim().toLowerCase() ?? '',
          operatingLocalities: partial.operatingLocalities ?? [],
          propertyTypes: partial.propertyTypes ?? [],
          transactionTypes: partial.transactionTypes ?? [],
          budgetBands: partial.budgetBands ?? [],
          experienceBand: partial.experienceBand ?? '0_1',
          activeBuyerCount: partial.activeBuyerCount ?? 0,
          activePropertyCount: partial.activePropertyCount ?? 0,
          onboardingComplete: false,
        },
      });
    } else if (existing) {
      await this.prisma.dealerProfile.update({
        where: { accountId },
        data: {
          ...(partial.fullName && { fullName: partial.fullName.trim() }),
          ...(partial.mobile && { mobile: normalizePhone(partial.mobile) }),
          ...(partial.email && { email: partial.email.trim().toLowerCase() }),
          ...(partial.agencyName && {
            agency: { update: { name: partial.agencyName } },
          }),
          ...(partial.operatingLocalities && { operatingLocalities: partial.operatingLocalities }),
          ...(partial.propertyTypes && { propertyTypes: partial.propertyTypes }),
          ...(partial.transactionTypes && { transactionTypes: partial.transactionTypes }),
          ...(partial.budgetBands && { budgetBands: partial.budgetBands }),
          ...(partial.experienceBand && { experienceBand: partial.experienceBand }),
          ...(partial.activeBuyerCount !== undefined && {
            activeBuyerCount: partial.activeBuyerCount,
          }),
          ...(partial.activePropertyCount !== undefined && {
            activePropertyCount: partial.activePropertyCount,
          }),
        },
      });
    }

    return this.getOnboardingDraft(accountId);
  }

  assertDealer(user: SessionUser) {
    if (user.role !== 'dealer') {
      throw new ForbiddenException('Dealer role required');
    }
  }
}
