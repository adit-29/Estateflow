import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LeadRow {
  id: string;
  name: string;
  status: string;
  nextFollowUpAt: Date | null;
  updatedAt: Date;
  preferredLocalities: string[];
  budgetBand: string | null;
  requirementSummary: string | null;
  notes: string | null;
  phone: string;
}

export interface PropertyRow {
  id: string;
  title: string;
  locality: string;
  propertyType: string;
  bedrooms: number | null;
  priceAmount: number | null;
  listingStatus: string;
  lastConfirmedAt: Date | null;
  updatedAt: Date;
  areaValue: number | null;
  areaUnit: string | null;
  photoUrl: string | null;
}

export interface VisitRow {
  id: string;
  scheduledAt: Date;
  status: string;
  meetingPoint: string;
  propertyId: string | null;
  propertyTitle: string | null;
  leadId: string | null;
  buyerName: string | null;
  notes: string | null;
  updatedAt: Date;
}

export interface DealRow {
  id: string;
  title: string;
  pipelineStage: string;
  value: number | null;
  nextAction: string | null;
  updatedAt: Date;
}

export interface CommissionRow {
  id: string;
  dealId: string;
  dealTitle: string;
  dealValue: number | null;
  percentage: number | null;
  fixedAmount: number | null;
  paymentStatus: string;
  dueDate: Date | null;
  updatedAt: Date;
}

export interface BuyerRow {
  id: string;
  contactName: string;
  leadId: string | null;
  localities: string[];
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  budgetMax: number | null;
  updatedAt: Date;
}

export interface ActivityRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: Date;
}

/** Every method takes the session agency id. Implementations must filter on it. */
export interface CopilotDataSource {
  leads(agencyId: string, filter: { name?: string; query?: string; dueBefore?: Date; activeOnly?: boolean; take: number }): Promise<LeadRow[]>;
  lead(agencyId: string, id: string): Promise<LeadRow | null>;
  property(agencyId: string, id: string): Promise<PropertyRow | null>;
  activeProperties(agencyId: string, filter: { locality?: string; maxPrice?: number; bedrooms?: number; query?: string; take: number }): Promise<PropertyRow[]>;
  visits(agencyId: string, filter: { from: Date; to?: Date; leadId?: string; take: number }): Promise<VisitRow[]>;
  deals(agencyId: string): Promise<DealRow[]>;
  openCommissions(agencyId: string, take: number): Promise<CommissionRow[]>;
  buyers(agencyId: string, filter: { name?: string; leadId?: string; take: number }): Promise<BuyerRow[]>;
  activities(agencyId: string, leadId: string, take: number): Promise<ActivityRow[]>;
  notifications(agencyId: string, accountId: string, take: number): Promise<{ id: string; title: string; body: string; createdAt: Date }[]>;
  network(agencyId: string, take: number): Promise<{ id: string; label: string; status: string }[]>;
}

const num = (v: { toNumber(): number } | null | undefined) => (v == null ? null : v.toNumber());
const ci = (value: string) => ({ contains: value, mode: 'insensitive' as const });

@Injectable()
export class PrismaCopilotDataSource implements CopilotDataSource {
  constructor(private readonly prisma: PrismaService) {}

  private leadSelect = {
    id: true,
    name: true,
    status: true,
    nextFollowUpAt: true,
    updatedAt: true,
    preferredLocalities: true,
    budgetBand: true,
    requirementSummary: true,
    notes: true,
    phone: true,
  } as const;

  private propertySelect = {
    id: true,
    title: true,
    locality: true,
    propertyType: true,
    bedrooms: true,
    priceAmount: true,
    listingStatus: true,
    lastConfirmedAt: true,
    updatedAt: true,
    areaValue: true,
    areaUnit: true,
    photoUrls: true,
  } as const;

  private mapProperty(r: {
    id: string;
    title: string;
    locality: string;
    propertyType: string;
    bedrooms: number | null;
    priceAmount: { toNumber(): number } | number | null;
    listingStatus: string;
    lastConfirmedAt: Date | null;
    updatedAt: Date;
    areaValue: { toNumber(): number } | number | null;
    areaUnit: string | null;
    photoUrls: string[];
  }): PropertyRow {
    const price = typeof r.priceAmount === 'number' ? r.priceAmount : num(r.priceAmount);
    const area = typeof r.areaValue === 'number' ? r.areaValue : num(r.areaValue);
    return {
      id: r.id,
      title: r.title,
      locality: r.locality,
      propertyType: r.propertyType,
      bedrooms: r.bedrooms,
      priceAmount: price,
      listingStatus: r.listingStatus,
      lastConfirmedAt: r.lastConfirmedAt,
      updatedAt: r.updatedAt,
      areaValue: area,
      areaUnit: r.areaUnit,
      photoUrl: r.photoUrls[0] ?? null,
    };
  }

  async leads(agencyId: string, f: { name?: string; query?: string; dueBefore?: Date; activeOnly?: boolean; take: number }) {
    return this.prisma.lead.findMany({
      where: {
        agencyId,
        deletedAt: null,
        ...(f.name ? { name: ci(f.name) } : {}),
        ...(f.query
          ? { OR: [{ name: ci(f.query) }, { requirementSummary: ci(f.query) }, { preferredLocalities: { has: f.query } }] }
          : {}),
        ...(f.dueBefore ? { nextFollowUpAt: { lt: f.dueBefore } } : {}),
        ...(f.activeOnly ? { status: { notIn: ['won', 'lost', 'archived'] as never[] } } : {}),
      },
      select: this.leadSelect,
      orderBy: f.dueBefore ? { nextFollowUpAt: 'asc' } : { updatedAt: 'desc' },
      take: f.take,
    });
  }

  lead(agencyId: string, id: string) {
    return this.prisma.lead.findFirst({ where: { id, agencyId, deletedAt: null }, select: this.leadSelect });
  }

  async activeProperties(agencyId: string, f: { locality?: string; maxPrice?: number; bedrooms?: number; query?: string; take: number }) {
    const rows = await this.prisma.property.findMany({
      where: {
        agencyId,
        deletedAt: null,
        listingStatus: 'active',
        ...(f.locality ? { locality: ci(f.locality) } : {}),
        ...(f.maxPrice ? { priceAmount: { lte: f.maxPrice } } : {}),
        ...(f.bedrooms != null ? { bedrooms: f.bedrooms } : {}),
        ...(f.query ? { OR: [{ title: ci(f.query) }, { locality: ci(f.query) }] } : {}),
      },
      select: this.propertySelect,
      orderBy: { updatedAt: 'desc' },
      take: f.take,
    });
    return rows.map((r) => this.mapProperty(r));
  }

  async property(agencyId: string, id: string) {
    const row = await this.prisma.property.findFirst({
      where: { id, agencyId, deletedAt: null },
      select: this.propertySelect,
    });
    return row ? this.mapProperty(row) : null;
  }

  async visits(agencyId: string, f: { from: Date; to?: Date; leadId?: string; take: number }) {
    const rows = await this.prisma.siteVisit.findMany({
      where: {
        agencyId,
        deletedAt: null,
        scheduledAt: { gte: f.from, ...(f.to ? { lt: f.to } : {}) },
        ...(f.leadId ? { leadId: f.leadId } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        meetingPoint: true,
        propertyId: true,
        leadId: true,
        notes: true,
        updatedAt: true,
        property: { select: { title: true } },
        lead: { select: { name: true } },
        buyerRequirement: { select: { contactName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: f.take,
    });
    return rows.map((r) => ({
      id: r.id,
      scheduledAt: r.scheduledAt,
      status: r.status,
      meetingPoint: r.meetingPoint,
      propertyId: r.propertyId,
      propertyTitle: r.property?.title ?? null,
      leadId: r.leadId,
      buyerName: r.lead?.name ?? r.buyerRequirement?.contactName ?? null,
      notes: r.notes,
      updatedAt: r.updatedAt,
    }));
  }

  async deals(agencyId: string) {
    const rows = await this.prisma.deal.findMany({
      where: { agencyId, deletedAt: null },
      select: { id: true, title: true, pipelineStage: true, value: true, nextAction: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => ({ ...r, value: num(r.value) }));
  }

  async openCommissions(agencyId: string, take: number) {
    const rows = await this.prisma.commissionAgreement.findMany({
      where: { deal: { agencyId, deletedAt: null }, paymentStatus: { in: ['pending', 'overdue', 'disputed'] } },
      select: {
        id: true,
        dealId: true,
        percentage: true,
        fixedAmount: true,
        paymentStatus: true,
        dueDate: true,
        updatedAt: true,
        deal: { select: { title: true, value: true } },
      },
      orderBy: { dueDate: 'asc' },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      dealId: r.dealId,
      dealTitle: r.deal.title,
      dealValue: num(r.deal.value),
      percentage: num(r.percentage),
      fixedAmount: num(r.fixedAmount),
      paymentStatus: r.paymentStatus,
      dueDate: r.dueDate,
      updatedAt: r.updatedAt,
    }));
  }

  async buyers(agencyId: string, f: { name?: string; leadId?: string; take: number }) {
    const rows = await this.prisma.buyerRequirement.findMany({
      where: {
        agencyId,
        deletedAt: null,
        ...(f.name ? { contactName: ci(f.name) } : {}),
        ...(f.leadId ? { leadId: f.leadId } : {}),
      },
      select: {
        id: true,
        contactName: true,
        leadId: true,
        localities: true,
        bedroomsMin: true,
        bedroomsMax: true,
        budgetMax: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: f.take,
    });
    return rows.map((r) => ({ ...r, budgetMax: num(r.budgetMax) }));
  }

  activities(agencyId: string, leadId: string, take: number) {
    return this.prisma.activity.findMany({
      where: { agencyId, leadId },
      select: { id: true, type: true, title: true, body: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  notifications(agencyId: string, accountId: string, take: number) {
    return this.prisma.notification.findMany({
      where: { agencyId, accountId },
      select: { id: true, title: true, body: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async network(agencyId: string, take: number) {
    const rows = await this.prisma.dealerConnection.findMany({
      where: { fromAgencyId: agencyId, revokedAt: null },
      select: { id: true, status: true, inviteeEmail: true, toAgency: { select: { name: true } } },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      label: r.toAgency?.name ?? r.inviteeEmail ?? 'Pending invite',
      status: r.status,
    }));
  }
}
