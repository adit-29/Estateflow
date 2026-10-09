import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { SiteVisitsService } from './site-visits.service';

@Controller('site-visits')
@UseGuards(AuthGuard, AgencyGuard)
export class SiteVisitsController {
  constructor(private readonly service: SiteVisitsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: Record<string, string>) {
    return this.service.list(req.agencyId!, {
      upcoming: query.upcoming === 'true',
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.get(req.agencyId!, id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.create(req.agencyId!, req.user!.id, body);
  }

  @Patch(':id/feedback')
  feedback(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updateFeedback(req.agencyId!, req.user!.id, id, body);
  }

  @Patch(':id')
  reschedule(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updateSchedule(req.agencyId!, req.user!.id, id, body);
  }
}
