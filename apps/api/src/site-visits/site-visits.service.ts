import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { siteVisitCreateSchema, siteVisitFeedbackSchema, siteVisitScheduleSchema } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../access/tenant-access.service';

const OVERLAP_MINUTES = 60;

@Injectable()
export class SiteVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TenantAccessService,
  ) {}

  async list(agencyId: string, query: { upcoming?: boolean; status?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const now = new Date();
    const where = {
      agencyId,
      deletedAt: null,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.upcoming ? { scheduledAt: { gte: now }, status: { in: ['proposed', 'confirmed'] as never[] } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.siteVisit.findMany({
        where,
        orderBy: { scheduledAt: query.upcoming ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { property: true, buyerRequirement: true, lead: true },
      }),
      this.prisma.siteVisit.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async get(agencyId: string, id: string) {
    const visit = await this.prisma.siteVisit.findFirst({
      where: { id, agencyId, deletedAt: null },
      include: { property: true, buyerRequirement: true, lead: true },
    });
    if (!visit) throw new BadRequestException('Visit not found');
    return visit;
  }

  async create(agencyId: string, accountId: string, raw: unknown) {
    const input = siteVisitCreateSchema.parse(raw);
    const scheduledAt = new Date(input.scheduledAt);
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException('Visit must be scheduled in the future');
    }
    await this.access.assertPropertyReadable(agencyId, input.propertyId);
    if (input.buyerRequirementId) {
      await this.access.assertBuyerReadable(agencyId, input.buyerRequirementId);
    }
    if (input.leadId) {
      await this.access.assertLeadReadable(agencyId, input.leadId);
    }
    await this.assertAssigneeInAgency(agencyId, input.assignedAccountId);

    return this.prisma.$transaction(async (tx) => {
      const windowStart = new Date(scheduledAt.getTime() - OVERLAP_MINUTES * 60_000);
      const windowEnd = new Date(scheduledAt.getTime() + OVERLAP_MINUTES * 60_000);
      const overlap = await tx.siteVisit.findFirst({
        where: {
          assignedAccountId: input.assignedAccountId,
          deletedAt: null,
          status: { in: ['proposed', 'confirmed'] },
          scheduledAt: { gte: windowStart, lte: windowEnd },
        },
      });
      if (overlap) {
        throw new ConflictException('Assigned dealer has an overlapping visit in this time window');
      }

      const visit = await tx.siteVisit.create({
        data: {
          agencyId,
          propertyId: input.propertyId,
          buyerRequirementId: input.buyerRequirementId,
          leadId: input.leadId,
          assignedAccountId: input.assignedAccountId,
          scheduledAt,
          meetingPoint: input.meetingPoint,
          notes: input.notes,
          status: 'proposed',
        },
      });
      await tx.auditEvent.create({
        data: { accountId, action: 'site_visit.created', entity: 'SiteVisit', entityId: visit.id },
      });
      return visit;
    });
  }

  async updateSchedule(agencyId: string, accountId: string, id: string, raw: unknown) {
    const visit = await this.get(agencyId, id);
    const input = siteVisitScheduleSchema.parse(raw);
    if (visit.status === 'completed' || visit.status === 'no_show') {
      throw new BadRequestException('Completed visits cannot be rescheduled');
    }
    if (input.status === 'cancelled') {
      const cancelled = await this.prisma.siteVisit.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      await this.prisma.auditEvent.create({
        data: { accountId, action: 'site_visit.cancelled', entity: 'SiteVisit', entityId: id },
      });
      return cancelled;
    }

    const assignedAccountId = input.assignedAccountId ?? visit.assignedAccountId;
    if (!assignedAccountId) throw new BadRequestException('An assigned dealer is required');
    await this.assertAssigneeInAgency(agencyId, assignedAccountId);

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : visit.scheduledAt;
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException('Visit must be scheduled in the future');
    }

    const windowStart = new Date(scheduledAt.getTime() - OVERLAP_MINUTES * 60_000);
    const windowEnd = new Date(scheduledAt.getTime() + OVERLAP_MINUTES * 60_000);
    const overlap = await this.prisma.siteVisit.findFirst({
      where: {
        id: { not: id },
        assignedAccountId,
        deletedAt: null,
        status: { in: ['proposed', 'confirmed'] },
        scheduledAt: { gte: windowStart, lte: windowEnd },
      },
    });
    if (overlap) {
      throw new ConflictException('Assigned dealer has an overlapping visit in this time window');
    }

    const updated = await this.prisma.siteVisit.update({
      where: { id },
      data: {
        scheduledAt,
        assignedAccountId,
        meetingPoint: input.meetingPoint ?? visit.meetingPoint,
        notes: input.notes ?? visit.notes,
        status: input.status ?? visit.status,
      },
    });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'site_visit.rescheduled', entity: 'SiteVisit', entityId: id },
    });
    return updated;
  }

  async updateFeedback(agencyId: string, accountId: string, id: string, raw: unknown) {
    await this.get(agencyId, id);
    const input = siteVisitFeedbackSchema.parse(raw);
    const visit = await this.prisma.siteVisit.update({
      where: { id },
      data: {
        status: input.status,
        buyerFeedback: input.buyerFeedback,
        nextAction: input.nextAction,
      },
    });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'site_visit.updated', entity: 'SiteVisit', entityId: id },
    });
    return visit;
  }

  private async assertAssigneeInAgency(agencyId: string, accountId: string) {
    const member = await this.prisma.dealerMembership.findFirst({
      where: { agencyId, accountId },
    });
    if (!member) throw new BadRequestException('Assigned dealer is not a member of this agency');
  }
}
