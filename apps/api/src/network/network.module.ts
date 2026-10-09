import { Module } from '@nestjs/common';
import { NetworkController } from './network.controller';
import { NetworkAdminController } from './network-admin.controller';
import { NetworkService } from './network.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [NetworkController, NetworkAdminController],
  providers: [NetworkService],
})
export class NetworkModule {}
