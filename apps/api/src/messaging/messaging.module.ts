import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { WebhooksController } from './webhooks.controller';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import {
  FacebookMessengerProvider,
  InstagramMessagingProvider,
  MockMessagingProvider,
  WhatsAppCloudApiProvider,
} from './providers';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [WebhooksController, InboxController],
  providers: [
    MockMessagingProvider,
    WhatsAppCloudApiProvider,
    FacebookMessengerProvider,
    InstagramMessagingProvider,
    WhatsAppWebhookService,
    InboxService,
  ],
  exports: [
    MockMessagingProvider,
    WhatsAppCloudApiProvider,
    FacebookMessengerProvider,
    InstagramMessagingProvider,
  ],
})
export class MessagingModule {}
