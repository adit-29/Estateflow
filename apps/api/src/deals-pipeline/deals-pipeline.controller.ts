import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { DealsPipelineService } from './deals-pipeline.service';

@Controller('deals')
@UseGuards(AuthGuard, AgencyGuard)
export class DealsPipelineController {
  constructor(private readonly service: DealsPipelineService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('view') view?: 'kanban' | 'table') {
    return this.service.list(req.agencyId!, view ?? 'table');
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.create(req.agencyId!, req.user!.id, body);
  }

  @Patch(':id/stage')
  stage(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updateStage(req.agencyId!, req.user!.id, id, body);
  }
}
