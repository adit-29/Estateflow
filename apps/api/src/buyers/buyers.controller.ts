import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { BuyersService } from './buyers.service';

@Controller('buyers')
@UseGuards(AuthGuard, AgencyGuard)
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.buyersService.list(req.agencyId!, query);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.buyersService.get(req.agencyId!, id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.buyersService.create(req.agencyId!, req.user!.id, body);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.buyersService.update(req.agencyId!, req.user!.id, id, body);
  }
}
