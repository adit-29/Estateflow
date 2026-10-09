import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
