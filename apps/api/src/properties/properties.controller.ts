import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { PropertiesService } from './properties.service';

@Controller('properties')
@UseGuards(AuthGuard, AgencyGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.propertiesService.list(req.agencyId!, query);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.propertiesService.get(req.agencyId!, id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.propertiesService.create(req.agencyId!, req.user!.id, body);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.propertiesService.update(req.agencyId!, req.user!.id, id, body);
  }

  @Post(':id/archive')
  archive(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.propertiesService.archive(req.agencyId!, req.user!.id, id);
  }
}
