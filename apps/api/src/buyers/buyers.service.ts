import { Injectable } from '@nestjs/common';
import {
  buyerListQuerySchema,
  buyerRequirementCreateSchema,
  buyerRequirementUpdateSchema,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../access/tenant-access.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BuyersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TenantAccessService,
  ) {}

  async list(agencyId: string, raw: unknown) {
    const query = buyerListQuerySchema.parse(raw);
    const where: Prisma.BuyerRequirementWhereInput = {
      agencyId,
      deletedAt: null,
    };
    if (query.locality) where.localities = { has: query.locality };
    if (query.search) {
      where.OR = [
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.buyerRequirement.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.buyerRequirement.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) || 1 };
  }

  async get(agencyId: string, id: string) {
    return this.access.assertBuyerReadable(agencyId, id);
  }

  async create(agencyId: string, accountId: string, raw: unknown) {
    const input = buyerRequirementCreateSchema.parse(raw);
    const buyer = await this.prisma.buyerRequirement.create({
      data: {
        agencyId,
        leadId: input.leadId,
        contactName: input.contactName,
        phone: input.phone,
        localities: input.localities,
        propertyTypes: input.propertyTypes,
        bedroomsMin: input.bedroomsMin,
        bedroomsMax: input.bedroomsMax,
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        transactionType: input.transactionType,
        moveInTimeline: input.moveInTimeline,
        readiness: input.readiness,
        mustHaveCriteria: input.mustHaveCriteria,
        flexibleCriteria: input.flexibleCriteria,
        notes: input.notes,
      },
    });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'buyer.created', entity: 'BuyerRequirement', entityId: buyer.id },
    });
    return buyer;
  }

  async update(agencyId: string, accountId: string, id: string, raw: unknown) {
    await this.access.assertBuyerReadable(agencyId, id);
    const input = buyerRequirementUpdateSchema.parse(raw);
    const buyer = await this.prisma.buyerRequirement.update({ where: { id }, data: input });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'buyer.updated', entity: 'BuyerRequirement', entityId: id },
    });
    return buyer;
  }
}
