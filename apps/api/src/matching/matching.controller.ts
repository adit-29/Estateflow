import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { MatchingService } from './matching.service';

@Controller('matching')
@UseGuards(AuthGuard, AgencyGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('weights')
  weights() {
    return this.matchingService.getWeights();
  }

  @Get('buyer/:buyerId')
  forBuyer(@Req() req: AuthenticatedRequest, @Param('buyerId') buyerId: string, @Query() query: unknown) {
    return this.matchingService.matchForBuyer(req.agencyId!, buyerId, query);
  }

  @Get('property/:propertyId')
  forProperty(@Req() req: AuthenticatedRequest, @Param('propertyId') propertyId: string, @Query() query: unknown) {
    return this.matchingService.matchForProperty(req.agencyId!, propertyId, query);
  }

  @Post('shortlist/:buyerId/:propertyId')
  shortlist(
    @Req() req: AuthenticatedRequest,
    @Param('buyerId') buyerId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.matchingService.shortlist(req.agencyId!, buyerId, propertyId);
  }

  @Post('draft-message/:buyerId/:propertyId')
  draftMessage(
    @Req() req: AuthenticatedRequest,
    @Param('buyerId') buyerId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.matchingService.prepareMessage(req.agencyId!, buyerId, propertyId);
  }
}
