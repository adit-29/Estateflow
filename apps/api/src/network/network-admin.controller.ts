import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { NetworkService } from './network.service';

@Controller('network/reports')
@UseGuards(AuthGuard, AdminGuard)
export class NetworkAdminController {
  constructor(private readonly service: NetworkService) {}

  @Get('admin-queue')
  adminQueue() {
    return this.service.adminQueue();
  }
}
