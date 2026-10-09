import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ShareResourceType } from '@prisma/client';

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPropertyReadable(agencyId: string, propertyId: string) {
    const own = await this.prisma.property.findFirst({
      where: { id: propertyId, agencyId, deletedAt: null },
    });
    if (own) return own;

    const shared = await this.prisma.propertyNetworkShare.findFirst({
      where: {
        propertyId,
        sharedWithAgencyId: agencyId,
        revokedAt: null,
        property: { deletedAt: null },
      },
      include: { property: true },
    });
    if (shared) return shared.property;

    const resource = await this.prisma.resourceShare.findFirst({
      where: {
        resourceType: 'property',
        resourceId: propertyId,
        sharedWithAgencyId: agencyId,
        revokedAt: null,
      },
    });
    if (resource) {
      const property = await this.prisma.property.findFirst({
        where: { id: propertyId, deletedAt: null },
      });
      if (property) return property;
    }

    throw new NotFoundException('Property not found');
  }

  async assertBuyerReadable(agencyId: string, buyerId: string) {
    const buyer = await this.prisma.buyerRequirement.findFirst({
      where: { id: buyerId, agencyId, deletedAt: null },
    });
    if (!buyer) throw new NotFoundException('Buyer requirement not found');
    return buyer;
  }

  async assertLeadReadable(agencyId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, agencyId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const shared = await this.prisma.resourceShare.findFirst({
      where: {
        resourceType: 'lead',
        resourceId: leadId,
        sharedWithAgencyId: agencyId,
        revokedAt: null,
      },
    });
    if (lead.agencyId !== agencyId && !shared) {
      throw new ForbiddenException('No access to this lead');
    }
    return lead;
  }

  async assertResourceShare(
    ownerAgencyId: string,
    sharedWithAgencyId: string,
    resourceType: ShareResourceType,
    resourceId: string,
  ) {
    const share = await this.prisma.resourceShare.findFirst({
      where: {
        ownerAgencyId,
        sharedWithAgencyId,
        resourceType,
        resourceId,
        revokedAt: null,
      },
    });
    if (!share) throw new ForbiddenException('Shared access revoked or not granted');
    return share;
  }
}
