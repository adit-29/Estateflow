import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { dealCreateSchema, dealStageUpdateSchema, DEAL_PIPELINE_STAGES } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DealPipelineStage } from '@prisma/client';

const IMPORTANT_STAGES: DealPipelineStage[] = ['booking', 'closed_won', 'closed_lost'];

@Injectable()
export class DealsPipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async list(agencyId: string, view: 'kanban' | 'table' = 'table') {
    const deals = await this.prisma.deal.findMany({
      where: { agencyId, deletedAt: null },
      include: { property: true, buyerRequirement: true, lead: true, commission: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (view === 'kanban') {
      const columns = DEAL_PIPELINE_STAGES.map((stage) => ({
        stage,
        deals: deals.filter((d) => d.pipelineStage === stage),
      }));
      return { view: 'kanban', columns };
    }
    return { view: 'table', items: deals };
  }

  async create(agencyId: string, accountId: string, raw: unknown) {
    const input = dealCreateSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      if (input.leadId) {
        const lead = await tx.lead.findFirst({ where: { id: input.leadId, agencyId, deletedAt: null } });
        if (!lead) throw new NotFoundException('Lead not found');
      }
      if (input.buyerRequirementId) {
        const buyer = await tx.buyerRequirement.findFirst({
          where: { id: input.buyerRequirementId, agencyId, deletedAt: null },
        });
        if (!buyer) throw new NotFoundException('Buyer requirement not found');
      }
      if (input.propertyId) {
        const property = await tx.property.findFirst({
          where: { id: input.propertyId, agencyId, deletedAt: null },
        });
        if (!property) throw new NotFoundException('Property not found');
      }
      const responsibleId = input.responsibleAccountId ?? accountId;
      const member = await tx.dealerMembership.findFirst({
        where: { agencyId, accountId: responsibleId },
      });
      if (!member) throw new BadRequestException('Responsible account is not a member of this agency');

      const deal = await tx.deal.create({
        data: {
          agencyId,
          title: input.title,
          leadId: input.leadId,
          buyerRequirementId: input.buyerRequirementId,
          propertyId: input.propertyId,
          responsibleAccountId: responsibleId,
          value: input.value,
          expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
          pipelineStage: input.pipelineStage,
          status: 'active',
          source: input.source,
          nextAction: input.nextAction,
          notes: input.notes,
        },
      });
      await tx.dealStageHistory.create({
        data: { dealId: deal.id, fromStage: null, toStage: deal.pipelineStage, accountId },
      });
      await tx.auditEvent.create({
        data: { accountId, action: 'deal.created', entity: 'Deal', entityId: deal.id },
      });
      return deal;
    });
  }

  async updateStage(agencyId: string, accountId: string, dealId: string, raw: unknown) {
    const input = dealStageUpdateSchema.parse(raw);
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, agencyId, deletedAt: null } });
    if (!deal) throw new BadRequestException('Deal not found');

    if (IMPORTANT_STAGES.includes(input.pipelineStage) && !input.confirmImportant) {
      throw new BadRequestException({
        message: 'Confirmation required for this stage transition',
        code: 'CONFIRM_REQUIRED',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.deal.update({
        where: { id: dealId },
        data: {
          pipelineStage: input.pipelineStage,
          status:
            input.pipelineStage === 'closed_won'
              ? 'closed_won'
              : input.pipelineStage === 'closed_lost'
                ? 'closed_lost'
                : deal.status,
        },
      });
      await tx.dealStageHistory.create({
        data: {
          dealId,
          fromStage: deal.pipelineStage,
          toStage: input.pipelineStage,
          accountId,
        },
      });
      await tx.auditEvent.create({
        data: {
          accountId,
          action: 'deal.stage_changed',
          entity: 'Deal',
          entityId: dealId,
          payload: { from: deal.pipelineStage, to: input.pipelineStage },
        },
      });
      return updated;
    });
  }
}
