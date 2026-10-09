import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [AuthModule, DealerModule, PropertiesModule],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
