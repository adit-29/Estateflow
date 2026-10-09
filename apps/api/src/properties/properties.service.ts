import { Injectable, NotFoundException } from '@nestjs/common';
import {
  propertyCreateSchema,
  propertyListQuerySchema,
  propertyUpdateSchema,
  type PropertyCreateInput,
  type PropertyUpdateInput,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../access/tenant-access.service';
import { Prisma, Property } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TenantAccessService,
  ) {}

  async list(agencyId: string, rawQuery: unknown) {
    const query = propertyListQuerySchema.parse(rawQuery);

    if (query.scope === 'builder') {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: 1,
        notice:
          'Builder inventory feed is not live yet. Verified builder listings will appear here in a future release.',
      };
    }

    if (query.scope === 'network') {
      const shares = await this.prisma.propertyNetworkShare.findMany({
        where: { sharedWithAgencyId: agencyId, revokedAt: null },
        include: { property: true },
      });
      let items = shares.map((s) => s.property).filter((p) => !p.deletedAt);
      items = this.applyPropertyFilters(items, query);
      return this.paginate(items, query.page, query.pageSize);
    }

    const where: Prisma.PropertyWhereInput = {
      agencyId,
      deletedAt: null,
    };
    if (query.listingStatus) where.listingStatus = query.listingStatus;
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.locality) where.locality = { contains: query.locality, mode: 'insensitive' };
    if (query.minPrice != null || query.maxPrice != null) {
      where.priceAmount = {};
      if (query.minPrice != null) where.priceAmount.gte = query.minPrice;
      if (query.maxPrice != null) where.priceAmount.lte = query.maxPrice;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { locality: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { priceAmount: 'asc' }
        : query.sort === 'price_desc'
          ? { priceAmount: 'desc' }
          : { updatedAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize) || 1,
    };
  }

  async get(agencyId: string, id: string) {
    return this.access.assertPropertyReadable(agencyId, id);
  }

  async create(agencyId: string, accountId: string, raw: unknown) {
    const input = propertyCreateSchema.parse(raw);
    const property = await this.prisma.property.create({
      data: this.toPropertyData(agencyId, input),
    });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'property.created', entity: 'Property', entityId: property.id },
    });
    return property;
  }

  async archive(agencyId: string, accountId: string, id: string) {
    await this.ensureOwnProperty(agencyId, id);
    const property = await this.prisma.property.update({
      where: { id },
      data: { listingStatus: 'archived' },
    });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'property.archived', entity: 'Property', entityId: id },
    });
    return property;
  }

  async update(agencyId: string, accountId: string, id: string, raw: unknown) {
    await this.ensureOwnProperty(agencyId, id);
    const input = propertyUpdateSchema.parse(raw);
    const property = await this.prisma.property.update({
      where: { id },
      data: {
        ...input,
        lastConfirmedAt:
          input.lastConfirmedAt === undefined
            ? undefined
            : input.lastConfirmedAt
              ? new Date(input.lastConfirmedAt)
              : null,
        isVerifiedListing: false,
      },
    });
    await this.prisma.auditEvent.create({
      data: { accountId, action: 'property.updated', entity: 'Property', entityId: id },
    });
    return property;
  }

  private async ensureOwnProperty(agencyId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, agencyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  private toPropertyData(
    agencyId: string,
    input: PropertyCreateInput | PropertyUpdateInput,
    partial = false,
  ): Prisma.PropertyUncheckedCreateInput {
    const data: Prisma.PropertyUncheckedCreateInput = {
      agencyId,
      isVerifiedListing: false,
      title: (input as PropertyCreateInput).title,
      locality: (input as PropertyCreateInput).locality,
      propertyType: (input as PropertyCreateInput).propertyType,
      transactionType: (input as PropertyCreateInput).transactionType,
      listingStatus: input.listingStatus ?? 'draft',
      photoUrls: input.photoUrls ?? [],
      addressText: input.addressText ?? null,
      bedrooms: input.bedrooms ?? null,
      areaValue: input.areaValue ?? null,
      areaUnit: input.areaUnit ?? null,
      priceAmount: input.priceAmount ?? null,
      furnishing: input.furnishing ?? null,
      possessionNotes: input.possessionNotes ?? null,
      sourceContact: input.sourceContact ?? null,
      lastConfirmedAt: input.lastConfirmedAt ? new Date(input.lastConfirmedAt) : null,
      notes: input.notes ?? null,
    };
    if (partial) {
      const patch: Prisma.PropertyUncheckedUpdateInput = {};
      Object.entries(input).forEach(([k, v]) => {
        if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
      });
      if (input.lastConfirmedAt !== undefined) {
        patch.lastConfirmedAt = input.lastConfirmedAt ? new Date(input.lastConfirmedAt) : null;
      }
      return patch as Prisma.PropertyUncheckedCreateInput;
    }
    return data;
  }

  private applyPropertyFilters(items: Property[], query: ReturnType<typeof propertyListQuerySchema.parse>) {
    return items.filter((p) => {
      if (query.listingStatus && p.listingStatus !== query.listingStatus) return false;
      if (query.propertyType && p.propertyType !== query.propertyType) return false;
      if (query.locality && !p.locality.toLowerCase().includes(query.locality.toLowerCase())) return false;
      return true;
    });
  }

  private paginate<T>(items: T[], page: number, pageSize: number) {
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }
}
