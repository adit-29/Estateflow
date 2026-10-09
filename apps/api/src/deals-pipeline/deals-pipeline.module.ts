import { Module } from '@nestjs/common';
import { DealsPipelineController } from './deals-pipeline.controller';
import { DealsPipelineService } from './deals-pipeline.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [DealsPipelineController],
  providers: [DealsPipelineService],
})
export class DealsPipelineModule {}
