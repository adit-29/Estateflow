import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { NetworkService } from './network.service';

@Controller('network')
@UseGuards(AuthGuard, AgencyGuard)
export class NetworkController {
  constructor(private readonly service: NetworkService) {}

  @Get('directory')
  directory(@Query() query: Record<string, string>) {
    return this.service.directory(query);
  }

  @Get('passport')
  passport(@Req() req: AuthenticatedRequest) {
    return this.service.passport(req.agencyId!);
  }

  @Patch('visibility')
  visibility(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.updateVisibility(req.agencyId!, body);
  }

  @Post('invites')
  invite(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.invite(req.agencyId!, req.user!.id, body);
  }

  @Post('invites/:id/accept')
  accept(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.acceptInvite(id, req.agencyId!, req.user!.email);
  }

  @Post('share')
  share(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.shareResource(req.agencyId!, body);
  }

  @Post('share/:id/revoke')
  revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.revokeShare(req.agencyId!, id);
  }

  @Post('reports')
  report(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.report(req.user!.id, body);
  }
}
