import { Module } from '@nestjs/common';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [CommissionsController],
  providers: [CommissionsService],
})
export class CommissionsModule {}
