import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
