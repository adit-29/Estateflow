import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { TenantAccessService } from '../access/tenant-access.service';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, TenantAccessService],
  exports: [PropertiesService, TenantAccessService],
})
export class PropertiesModule {}
