import { Injectable, NotFoundException } from '@nestjs/common';
import {
  leadCreateSchema,
  leadListQuerySchema,
  leadUpdateSchema,
  type LeadCreateInput,
  type LeadListQuery,
  type LeadUpdateInput,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType, Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(agencyId: string, rawQuery: LeadListQuery) {
    const query = leadListQuerySchema.parse(rawQuery);
    const where: Prisma.LeadWhereInput = {
      agencyId,
      deletedAt: null,
    };

    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.locality) {
      where.preferredLocalities = { has: query.locality };
    }
    if (query.followUpDue) {
      where.nextFollowUpAt = { lte: new Date() };
      where.status = { notIn: ['won', 'lost', 'archived'] };
    }
    if (query.untouched) {
      where.status = 'new';
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { requirementSummary: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize) || 1,
    };
  }

  async getById(agencyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, agencyId, deletedAt: null },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        siteVisits: { where: { deletedAt: null }, orderBy: { scheduledAt: 'desc' }, take: 10 },
        deals: { where: { deletedAt: null }, take: 10 },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(agencyId: string, accountId: string, raw: LeadCreateInput) {
    const input = leadCreateSchema.parse(raw);
    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          agencyId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          source: input.source,
          requirementSummary: input.requirementSummary,
          budgetBand: input.budgetBand,
          preferredLocalities: input.preferredLocalities,
          propertyType: input.propertyType,
          transactionType: input.transactionType,
          timeline: input.timeline,
          financingNotes: input.financingNotes,
          status: input.status,
          nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
          notes: input.notes,
        },
      });
      await tx.activity.create({
        data: {
          agencyId,
          leadId: created.id,
          type: ActivityType.system,
          title: 'Lead created',
          body: `New lead: ${created.name}`,
        },
      });
      await tx.auditEvent.create({
        data: {
          accountId,
          action: 'lead.created',
          entity: 'Lead',
          entityId: created.id,
        },
      });
      return created;
    });
    return lead;
  }

  async update(agencyId: string, accountId: string, id: string, raw: LeadUpdateInput) {
    await this.ensureLead(agencyId, id);
    const input = leadUpdateSchema.parse(raw);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        ...input,
        name: input.name?.trim(),
        phone: input.phone?.trim(),
        nextFollowUpAt:
          input.nextFollowUpAt === null
            ? null
            : input.nextFollowUpAt
              ? new Date(input.nextFollowUpAt)
              : undefined,
      },
    });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'lead.updated', entity: 'Lead', entityId: id },
    });
    return lead;
  }

  async archive(agencyId: string, accountId: string, id: string) {
    await this.ensureLead(agencyId, id);
    return this.prisma.lead.update({
      where: { id },
      data: { status: 'archived', deletedAt: new Date() },
    });
  }

  /** Returns false if lead belongs to another agency — used in auth tests */
  async belongsToAgency(agencyId: string, leadId: string): Promise<boolean> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    return lead?.agencyId === agencyId;
  }

  private async ensureLead(agencyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, agencyId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
