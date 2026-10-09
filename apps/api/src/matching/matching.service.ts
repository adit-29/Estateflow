import { Injectable } from '@nestjs/common';
import { computeMatch, DEFAULT_MATCH_WEIGHTS } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../access/tenant-access.service';
import { z } from 'zod';

const matchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  minPercent: z.coerce.number().int().min(0).max(100).default(0),
  sort: z.enum(['match_desc', 'price_asc']).default('match_desc'),
});

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TenantAccessService,
  ) {}

  getWeights() {
    return {
      weights: DEFAULT_MATCH_WEIGHTS,
      note: 'Deterministic rule-based scoring — not machine learning.',
    };
  }

  async matchForBuyer(agencyId: string, buyerId: string, rawQuery: unknown) {
    const query = matchQuerySchema.parse(rawQuery);
    const buyer = await this.access.assertBuyerReadable(agencyId, buyerId);

    const own = await this.prisma.property.findMany({
      where: { agencyId, deletedAt: null, listingStatus: { in: ['active', 'paused'] } },
    });
    const networkShares = await this.prisma.propertyNetworkShare.findMany({
      where: { sharedWithAgencyId: agencyId, revokedAt: null },
      include: { property: true },
    });
    const properties = [
      ...own,
      ...networkShares.map((s) => s.property).filter((p) => !p.deletedAt),
    ];

    const scored = properties.map((p) => {
      const result = computeMatch(this.buyerInput(buyer), this.propertyInput(p));
      return { property: p, ...result };
    });

    return this.paginateMatches(scored, query);
  }

  async matchForProperty(agencyId: string, propertyId: string, rawQuery: unknown) {
    const query = matchQuerySchema.parse(rawQuery);
    const property = await this.access.assertPropertyReadable(agencyId, propertyId);

    const buyers = await this.prisma.buyerRequirement.findMany({
      where: { agencyId, deletedAt: null },
    });

    const scored = buyers.map((b) => {
      const result = computeMatch(this.buyerInput(b), this.propertyInput(property));
      return { buyer: b, ...result };
    });

    return this.paginateMatches(scored, query, 'buyer');
  }

  async shortlist(agencyId: string, buyerId: string, propertyId: string) {
    const buyer = await this.access.assertBuyerReadable(agencyId, buyerId);
    const property = await this.access.assertPropertyReadable(agencyId, propertyId);
    const result = computeMatch(this.buyerInput(buyer), this.propertyInput(property));
    return this.prisma.matchShortlist.upsert({
      where: {
        agencyId_buyerRequirementId_propertyId: {
          agencyId,
          buyerRequirementId: buyerId,
          propertyId,
        },
      },
      create: {
        agencyId,
        buyerRequirementId: buyerId,
        propertyId,
        matchPercent: result.matchPercent,
        breakdown: result.breakdown as object,
      },
      update: {
        matchPercent: result.matchPercent,
        breakdown: result.breakdown as object,
      },
    });
  }

  async prepareMessage(agencyId: string, buyerId: string, propertyId: string) {
    const buyer = await this.access.assertBuyerReadable(agencyId, buyerId);
    const property = await this.access.assertPropertyReadable(agencyId, propertyId);
    const result = computeMatch(this.buyerInput(buyer), this.propertyInput(property));
    const draftText = [
      `Hi ${buyer.contactName},`,
      '',
      `Sharing a property that may fit your search (${result.matchPercent}% rule-based match — not ML):`,
      `${property.title} — ${property.locality}`,
      property.priceAmount ? `Asking: ₹${property.priceAmount.toString()}` : 'Price: on request',
      '',
      'Breakdown:',
      `- Locality: ${result.breakdown.locality}`,
      `- Budget: ${result.breakdown.budget}`,
      `- Property type: ${result.breakdown.propertyType}`,
      `- Bedrooms: ${result.breakdown.bedrooms}`,
      '',
      '[Draft only — not sent automatically]',
    ].join('\n');

    return this.prisma.matchDraftMessage.create({
      data: { agencyId, buyerRequirementId: buyerId, propertyId, draftText },
    });
  }

  private buyerInput(b: {
    localities: string[];
    propertyTypes: string[];
    bedroomsMin: number | null;
    bedroomsMax: number | null;
    budgetMin: unknown;
    budgetMax: unknown;
    readiness: string;
  }) {
    return {
      localities: b.localities,
      propertyTypes: b.propertyTypes,
      bedroomsMin: b.bedroomsMin,
      bedroomsMax: b.bedroomsMax,
      budgetMin: b.budgetMin != null ? Number(b.budgetMin) : null,
      budgetMax: b.budgetMax != null ? Number(b.budgetMax) : null,
      readiness: b.readiness,
    };
  }

  private propertyInput(p: {
    locality: string;
    propertyType: string;
    bedrooms: number | null;
    priceAmount: unknown;
    listingStatus: string;
  }) {
    return {
      locality: p.locality,
      propertyType: p.propertyType,
      bedrooms: p.bedrooms,
      priceAmount: p.priceAmount != null ? Number(p.priceAmount) : null,
      listingStatus: p.listingStatus,
    };
  }

  private paginateMatches<T extends { matchPercent: number }>(
    scored: T[],
    query: z.infer<typeof matchQuerySchema>,
    _kind: 'property' | 'buyer' = 'property',
  ) {
    const filtered = scored.filter((s) => s.matchPercent >= query.minPercent);
    filtered.sort((a, b) =>
      query.sort === 'price_asc'
        ? 0
        : b.matchPercent - a.matchPercent,
    );
    const total = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize) || 1,
      weights: DEFAULT_MATCH_WEIGHTS,
    };
  }
}
