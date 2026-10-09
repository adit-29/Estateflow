import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DealerModule } from './dealer/dealer.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PropertiesModule } from './properties/properties.module';
import { BuyersModule } from './buyers/buyers.module';
import { MatchingModule } from './matching/matching.module';
import { SiteVisitsModule } from './site-visits/site-visits.module';
import { DealsPipelineModule } from './deals-pipeline/deals-pipeline.module';
import { CommissionsModule } from './commissions/commissions.module';
import { NetworkModule } from './network/network.module';
import { MessagingModule } from './messaging/messaging.module';
import { CopilotModule } from './copilot/copilot.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReconstructionModule } from './reconstruction/reconstruction.module';
import { BuilderModule } from './builder/builder.module';
import { HealthController, SystemController } from './health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.AUTH_RATE_LIMIT_TTL_MS ?? 60_000),
        limit: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
      },
    ]),
    PrismaModule,
    AuthModule,
    DealerModule,
    LeadsModule,
    DashboardModule,
    PropertiesModule,
    BuyersModule,
    MatchingModule,
    SiteVisitsModule,
    DealsPipelineModule,
    CommissionsModule,
    NetworkModule,
    MessagingModule,
    CopilotModule,
    AnalyticsModule,
    SearchModule,
    NotificationsModule,
    ReconstructionModule,
    BuilderModule,
  ],
  controllers: [HealthController, SystemController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
