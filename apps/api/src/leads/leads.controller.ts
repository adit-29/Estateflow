import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { LeadCreateInput, LeadListQuery, LeadUpdateInput } from '@estateflow/shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(AuthGuard, AgencyGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: LeadListQuery) {
    return this.leadsService.list(req.agencyId!, query);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.leadsService.getById(req.agencyId!, id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: LeadCreateInput) {
    return this.leadsService.create(req.agencyId!, req.user!.id, body);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: LeadUpdateInput,
  ) {
    return this.leadsService.update(req.agencyId!, req.user!.id, id, body);
  }

  @Post(':id/archive')
  archive(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.leadsService.archive(req.agencyId!, req.user!.id, id);
  }
}
