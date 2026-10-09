import { Module } from '@nestjs/common';
import { SiteVisitsController } from './site-visits.controller';
import { SiteVisitsService } from './site-visits.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [AuthModule, DealerModule, PropertiesModule],
  controllers: [SiteVisitsController],
  providers: [SiteVisitsService],
  exports: [SiteVisitsService],
})
export class SiteVisitsModule {}
