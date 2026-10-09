import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OPEN_STAGES = ['new_lead', 'qualified', 'site_visit', 'negotiation', 'booking'] as const;
const DAY_MS = 86_400_000;
const STALE_DAYS = 30;

export interface DashboardPriority {
  id: string;
  kind: 'follow_up' | 'visit' | 'stale' | 'commission' | 'negotiation';
  tone: 'critical' | 'warn' | 'info';
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
  actionHref: string;
  extraHref?: string;
  extraLabel?: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(agencyId: string) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_DAYS * DAY_MS);
    const dayEnd = new Date(now.getTime() + DAY_MS);

    const [
      leadsByStatus,
      followUpsDue,
      upcomingVisits,
      pipelineDeals,
      pipelineSum,
      totalLeads,
      commissionAgreements,
      overdueLeads,
      todayVisits,
      staleListings,
      pendingCommissions,
      negotiationLeads,
      dealsByStage,
    ] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { agencyId, deletedAt: null },
        _count: true,
      }),
      this.prisma.lead.count({
        where: {
          agencyId,
          deletedAt: null,
          nextFollowUpAt: { lte: now },
          status: { notIn: ['won', 'lost', 'archived'] },
        },
      }),
      this.prisma.siteVisit.count({
        where: {
          agencyId,
          deletedAt: null,
          scheduledAt: { gte: now },
          status: { in: ['proposed', 'confirmed'] },
        },
      }),
      this.prisma.deal.count({
        where: { agencyId, deletedAt: null, pipelineStage: { in: [...OPEN_STAGES] } },
      }),
      this.prisma.deal.aggregate({
        where: { agencyId, deletedAt: null, pipelineStage: { in: [...OPEN_STAGES] } },
        _sum: { value: true },
      }),
      this.prisma.lead.count({ where: { agencyId, deletedAt: null } }),
      this.prisma.commissionAgreement.findMany({
        where: { deal: { agencyId, deletedAt: null } },
        include: { deal: true },
      }),
      this.prisma.lead.findMany({
        where: {
          agencyId,
          deletedAt: null,
          nextFollowUpAt: { lte: now },
          status: { notIn: ['won', 'lost', 'archived'] },
        },
        orderBy: { nextFollowUpAt: 'asc' },
        take: 8,
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          nextFollowUpAt: true,
          requirementSummary: true,
          preferredLocalities: true,
          budgetBand: true,
        },
      }),
      this.prisma.siteVisit.findMany({
        where: {
          agencyId,
          deletedAt: null,
          scheduledAt: { gte: now, lt: dayEnd },
          status: { in: ['proposed', 'confirmed'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 8,
        include: { lead: { select: { name: true } }, property: { select: { title: true, locality: true } } },
      }),
      this.prisma.property.findMany({
        where: {
          agencyId,
          deletedAt: null,
          listingStatus: 'active',
          OR: [{ lastConfirmedAt: null }, { lastConfirmedAt: { lt: staleBefore } }],
        },
        orderBy: { updatedAt: 'asc' },
        take: 5,
        select: { id: true, title: true, locality: true, lastConfirmedAt: true },
      }),
      this.prisma.commissionAgreement.findMany({
        where: { deal: { agencyId, deletedAt: null }, paymentStatus: { in: ['pending', 'overdue'] } },
        take: 5,
        include: { deal: { select: { id: true, title: true } } },
      }),
      this.prisma.lead.findMany({
        where: { agencyId, deletedAt: null, status: 'negotiation' },
        orderBy: { updatedAt: 'desc' },
        take: 4,
        select: { id: true, name: true, phone: true, requirementSummary: true, preferredLocalities: true },
      }),
      this.prisma.deal.groupBy({
        by: ['pipelineStage'],
        where: { agencyId, deletedAt: null },
        _count: true,
        _sum: { value: true },
      }),
    ]);

    let expectedCommission = 0;
    for (const a of commissionAgreements) {
      if (a.fixedAmount) expectedCommission += Number(a.fixedAmount);
      else if (a.percentage && a.deal.value) {
        expectedCommission += (Number(a.deal.value) * Number(a.percentage)) / 100;
      }
    }

    const priorities: DashboardPriority[] = [];
    for (const lead of overdueLeads) {
      const overdue = lead.nextFollowUpAt && lead.nextFollowUpAt.getTime() < now.getTime();
      priorities.push({
        id: `fu-${lead.id}`,
        kind: 'follow_up',
        tone: overdue ? 'critical' : 'warn',
        title: lead.name,
        reason: overdue
          ? `Follow-up overdue${lead.requirementSummary ? ` · ${lead.requirementSummary}` : ''}`
          : `Follow-up due today${lead.requirementSummary ? ` · ${lead.requirementSummary}` : ''}`,
        href: `/dealer/leads/${lead.id}`,
        actionLabel: 'Open lead',
        actionHref: `/dealer/leads/${lead.id}`,
        extraHref: lead.phone ? `tel:${lead.phone.replace(/\D/g, '')}` : undefined,
        extraLabel: lead.phone ? 'Call' : undefined,
      });
    }
    for (const visit of todayVisits.filter((v) => v.status === 'proposed')) {
      priorities.push({
        id: `visit-${visit.id}`,
        kind: 'visit',
        tone: 'warn',
        title: visit.lead?.name ?? 'Site visit',
        reason: `Visit confirmation pending · ${visit.property?.title ?? visit.meetingPoint}`,
        href: '/dealer/site-visits',
        actionLabel: 'Open visit',
        actionHref: '/dealer/site-visits',
      });
    }
    for (const lead of negotiationLeads) {
      if (priorities.some((p) => p.href === `/dealer/leads/${lead.id}`)) continue;
      priorities.push({
        id: `neg-${lead.id}`,
        kind: 'negotiation',
        tone: 'info',
        title: lead.name,
        reason: `Negotiation in progress${lead.requirementSummary ? ` · ${lead.requirementSummary}` : ''}`,
        href: `/dealer/leads/${lead.id}`,
        actionLabel: 'Open lead',
        actionHref: `/dealer/leads/${lead.id}`,
        extraHref: lead.phone ? `tel:${lead.phone.replace(/\D/g, '')}` : undefined,
        extraLabel: lead.phone ? 'Call' : undefined,
      });
    }
    for (const property of staleListings) {
      priorities.push({
        id: `stale-${property.id}`,
        kind: 'stale',
        tone: 'warn',
        title: property.title,
        reason: property.lastConfirmedAt
          ? `Availability not verified since ${property.lastConfirmedAt.toISOString().slice(0, 10)}`
          : 'Availability has never been verified',
        href: `/dealer/inventory/${property.id}`,
        actionLabel: 'Verify listing',
        actionHref: `/dealer/inventory/${property.id}`,
      });
    }
    for (const row of pendingCommissions) {
      priorities.push({
        id: `com-${row.id}`,
        kind: 'commission',
        tone: row.paymentStatus === 'overdue' ? 'critical' : 'info',
        title: row.deal.title,
        reason: `Commission ${row.paymentStatus}`,
        href: '/dealer/deals/commissions',
        actionLabel: 'Open commissions',
        actionHref: '/dealer/deals/commissions',
      });
    }

    return {
      definitions: {
        pipelineValue: 'Sum of deal.value for stages before closed_won/closed_lost.',
        expectedCommission:
          'Sum of fixed commission amounts, or deal value × percentage when fixed amount is not set.',
        upcomingVisits: 'Visits scheduled in the future with status proposed or confirmed.',
        priorities: 'Action items from overdue follow-ups, unconfirmed visits, stale listings, and unpaid commissions. Not a purchase prediction.',
      },
      leadsByStatus: leadsByStatus.map((r) => ({ status: r.status, count: r._count })),
      followUpsDue,
      upcomingVisits,
      activeDeals: pipelineDeals,
      estimatedPipeline: pipelineSum._sum.value?.toString() ?? '0',
      expectedCommission: expectedCommission.toFixed(2),
      totalLeads,
      isEmpty: totalLeads === 0,
      priorities: priorities.slice(0, 12),
      todayVisits: todayVisits.map((visit) => ({
        id: visit.id,
        scheduledAt: visit.scheduledAt.toISOString(),
        status: visit.status,
        meetingPoint: visit.meetingPoint,
        buyer: visit.lead?.name ?? null,
        property: visit.property?.title ?? null,
        locality: visit.property?.locality ?? null,
        href: '/dealer/site-visits',
      })),
      pipeline: dealsByStage.map((row) => ({
        stage: row.pipelineStage,
        count: row._count,
        value: row._sum.value?.toString() ?? '0',
      })),
      staleInventory: staleListings.length,
    };
  }
}
