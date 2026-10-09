import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { pageSearchHits, type SearchHit } from '@estateflow/shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('search')
@UseGuards(AuthGuard, AgencyGuard)
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(
    @Req() req: AuthenticatedRequest,
    @Query('q') q = '',
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    return this.query(req.agencyId!, q, Number(limit), Number(offset));
  }

  @Get('suggest')
  async suggest(@Req() req: AuthenticatedRequest, @Query('q') q = '') {
    if (q.trim().length < 2) return [];
    const page = await this.query(req.agencyId!, q, 8, 0);
    return page.items;
  }

  private async query(agencyId: string, q: string, limit: number, offset: number) {
    const term = q.trim();
    if (term.length < 2) throw new BadRequestException('Enter at least 2 characters.');
    const size = Math.min(Math.max(Number.isFinite(limit) ? limit : 10, 1), 20);
    const skip = Math.max(Number.isFinite(offset) ? offset : 0, 0);
    const [properties, leads] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string; title: string; locality: string }>>`
        SELECT id::text AS id, title, locality
        FROM "Property"
        WHERE "agencyId" = CAST(${agencyId} AS uuid)
          AND "deletedAt" IS NULL
          AND to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(locality, '') || ' ' || coalesce("addressText", ''))
              @@ plainto_tsquery('simple', ${term})
        ORDER BY "updatedAt" DESC
        LIMIT 50
      `,
      this.prisma.$queryRaw<Array<{ id: string; name: string; summary: string | null }>>`
        SELECT id::text AS id, name, "requirementSummary" AS summary
        FROM "Lead"
        WHERE "agencyId" = CAST(${agencyId} AS uuid)
          AND "deletedAt" IS NULL
          AND to_tsvector('simple', coalesce(name, '') || ' ' || coalesce("requirementSummary", ''))
              @@ plainto_tsquery('simple', ${term})
        ORDER BY "updatedAt" DESC
        LIMIT 50
      `,
    ]);
    const hits: SearchHit[] = [
      ...properties.map((row) => ({ type: 'property' as const, id: row.id, title: row.title, subtitle: row.locality })),
      ...leads.map((row) => ({ type: 'lead' as const, id: row.id, title: row.name, subtitle: row.summary ?? 'Lead' })),
    ];
    return { items: pageSearchHits(hits, skip, size), total: hits.length };
  }
}
