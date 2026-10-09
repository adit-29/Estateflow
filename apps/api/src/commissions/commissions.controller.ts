import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { CommissionsService } from './commissions.service';

@Controller('commissions')
@UseGuards(AuthGuard, AgencyGuard)
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get('summary')
  summary(@Req() req: AuthenticatedRequest) {
    return this.service.summary(req.agencyId!);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.create(req.agencyId!, req.user!.id, body);
  }

  @Post('splits/propose')
  proposeSplits(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.proposeSplits(req.agencyId!, req.user!.id, body);
  }

  @Post('splits/:id/accept')
  acceptSplit(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.acceptSplit(req.agencyId!, req.user!.id, id);
  }
}
