import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { NotificationsController } from './notifications.controller';
import { NotificationDeliveryService } from './notification-delivery.service';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [NotificationsController],
  providers: [NotificationDeliveryService],
})
export class NotificationsModule {}
