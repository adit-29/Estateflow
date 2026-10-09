import { BadRequestException, Injectable } from '@nestjs/common';
import { commissionCreateSchema, commissionSplitProposalSchema } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(agencyId: string) {
    const agreements = await this.prisma.commissionAgreement.findMany({
      where: { deal: { agencyId, deletedAt: null } },
      include: { deal: true, splits: true },
    });
    const totals: Record<'pending' | 'paid' | 'overdue' | 'disputed', number> = {
      pending: 0,
      paid: 0,
      overdue: 0,
      disputed: 0,
    };
    for (const a of agreements) {
      const amount =
        Number(a.fixedAmount ?? 0) || (Number(a.deal.value ?? 0) * Number(a.percentage ?? 0)) / 100;
      totals[a.paymentStatus] += amount;
    }
    return {
      totals,
      disclaimer:
        'Demo commission tracking only. EstateFlow does not guarantee payment or enforce agreements — review legal wording before production.',
      items: agreements,
    };
  }

  async create(agencyId: string, accountId: string, raw: unknown) {
    const input = commissionCreateSchema.parse(raw);
    const deal = await this.prisma.deal.findFirst({ where: { id: input.dealId, agencyId } });
    if (!deal) throw new BadRequestException('Deal not found');
    if (!input.percentage && input.fixedAmount == null) {
      throw new BadRequestException('Provide percentage or fixed amount');
    }

    return this.prisma.$transaction(async (tx) => {
      const agreement = await tx.commissionAgreement.upsert({
        where: { dealId: input.dealId },
        create: {
          dealId: input.dealId,
          percentage: input.percentage,
          fixedAmount: input.fixedAmount,
          payerSource: input.payerSource,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          demoLegalAck: true,
        },
        update: {
          percentage: input.percentage,
          fixedAmount: input.fixedAmount,
          payerSource: input.payerSource,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          demoLegalAck: true,
        },
      });
      await tx.commissionAgreementHistory.create({
        data: {
          agreementId: agreement.id,
          accountId,
          changeSummary: 'Commission agreement created/updated (demo)',
          payload: input,
        },
      });
      return agreement;
    });
  }

  async proposeSplits(agencyId: string, accountId: string, raw: unknown) {
    const input = commissionSplitProposalSchema.parse(raw);
    const deal = await this.prisma.deal.findFirst({
      where: { id: input.dealId, agencyId },
      include: { commission: true },
    });
    if (!deal?.commission) throw new BadRequestException('Create commission agreement first');

    const totalPct = input.splits.reduce((s, x) => s + x.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new BadRequestException('Split percentages must sum to 100');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const split of input.splits) {
        await tx.commissionSplit.upsert({
          where: {
            agreementId_agencyId_role: {
              agreementId: deal.commission!.id,
              agencyId: split.agencyId,
              role: split.role,
            },
          },
          create: {
            agreementId: deal.commission!.id,
            dealId: deal.id,
            agencyId: split.agencyId,
            role: split.role,
            percentage: split.percentage,
          },
          update: { percentage: split.percentage, acceptedAt: null, acceptedByAccountId: null },
        });
      }
      await tx.commissionAgreementHistory.create({
        data: {
          agreementId: deal.commission!.id,
          accountId,
          changeSummary: 'Commission split proposed — pending acceptance',
          payload: input,
        },
      });
      return tx.commissionSplit.findMany({ where: { agreementId: deal.commission!.id } });
    });
  }

  async acceptSplit(agencyId: string, accountId: string, splitId: string) {
    const split = await this.prisma.commissionSplit.findUnique({ where: { id: splitId } });
    if (!split || split.agencyId !== agencyId) {
      throw new BadRequestException('Split not found for your agency');
    }
    return this.prisma.commissionSplit.update({
      where: { id: splitId },
      data: { acceptedAt: new Date(), acceptedByAccountId: accountId },
    });
  }
}
