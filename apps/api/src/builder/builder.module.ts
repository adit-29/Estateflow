import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { BuilderController, BuilderIncomingController } from './builder.controller';
import { BuilderGuard } from './builder.guard';
import { BuilderService } from './builder.service';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [BuilderController, BuilderIncomingController],
  providers: [BuilderService, BuilderGuard],
})
export class BuilderModule {}
