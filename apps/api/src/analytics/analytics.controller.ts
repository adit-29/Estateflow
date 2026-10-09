import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { aggregateAnalytics } from '@estateflow/shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
@UseGuards(AuthGuard, AgencyGuard)
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const agencyId = req.agencyId!;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const completedWhere = {
      agencyId,
      completedAt: {
        not: null,
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      },
    };
    const [leads, visits, deals, commissions, shortlists, drafts, completed] = await Promise.all([
      this.prisma.lead.findMany({
        where: { agencyId, deletedAt: null },
        select: { createdAt: true, status: true, source: true, nextFollowUpAt: true },
      }),
      this.prisma.siteVisit.findMany({
        where: { agencyId, deletedAt: null },
        select: { status: true, scheduledAt: true },
      }),
      this.prisma.deal.findMany({
        where: { agencyId, deletedAt: null },
        select: { pipelineStage: true, value: true, updatedAt: true },
      }),
      this.prisma.commissionAgreement.findMany({
        where: { deal: { agencyId } },
        select: { paymentStatus: true, fixedAmount: true, percentage: true, dueDate: true, createdAt: true, deal: { select: { value: true } } },
      }),
      this.prisma.matchShortlist.findMany({
        where: { agencyId },
        select: { createdAt: true },
      }),
      this.prisma.matchDraftMessage.findMany({
        where: { agencyId },
        select: { createdAt: true },
      }),
      this.prisma.followUpReminder.count({ where: completedWhere }),
    ]);

    return aggregateAnalytics(
      {
        leads: leads.map((lead) => ({
          createdAt: lead.createdAt.toISOString(),
          status: lead.status,
          source: lead.source,
          nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
        })),
        visits: visits.map((visit) => ({ status: visit.status, scheduledAt: visit.scheduledAt.toISOString() })),
        deals: deals.map((deal) => ({
          pipelineStage: deal.pipelineStage,
          value: deal.value == null ? null : Number(deal.value),
          updatedAt: deal.updatedAt.toISOString(),
        })),
        commissions: commissions.map((row) => ({
          paymentStatus: row.paymentStatus,
          amount: row.fixedAmount != null ? Number(row.fixedAmount) : row.percentage && row.deal.value ? (Number(row.deal.value) * Number(row.percentage)) / 100 : null,
          dueDate: row.dueDate?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        })),
        shortlists: shortlists.map((row) => ({ createdAt: row.createdAt.toISOString() })),
        matchingDrafts: drafts.map((row) => ({ createdAt: row.createdAt.toISOString() })),
        followUpsCompleted: completed,
      },
      from,
      to,
    );
  }
}
