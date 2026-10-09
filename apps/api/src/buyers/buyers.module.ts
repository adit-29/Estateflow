import { Module } from '@nestjs/common';
import { BuyersController } from './buyers.controller';
import { BuyersService } from './buyers.service';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [AuthModule, DealerModule, PropertiesModule],
  controllers: [BuyersController],
  providers: [BuyersService],
})
export class BuyersModule {}
