import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { ProviderCallbackController, PublicTourController, ReconstructionController } from './reconstruction.controller';
import { TourService } from './tour.service';
import { TOUR_STORAGE, createTourStorage } from './tour-storage';
import { TOUR_PROVIDER, createTourProvider } from './tour-provider';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [ReconstructionController, PublicTourController, ProviderCallbackController],
  providers: [
    TourService,
    { provide: TOUR_STORAGE, useFactory: () => createTourStorage() },
    { provide: TOUR_PROVIDER, useFactory: () => createTourProvider() },
  ],
})
export class ReconstructionModule {}
