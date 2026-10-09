import { Module } from '@nestjs/common';
import { DealerController } from './dealer.controller';
import { DealerService } from './dealer.service';
import { AgencyGuard } from './agency.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DealerController],
  providers: [DealerService, AgencyGuard],
  exports: [DealerService, AgencyGuard],
})
export class DealerModule {}
