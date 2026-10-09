import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { SearchController } from './search.controller';

@Module({
  imports: [AuthModule, DealerModule],
  controllers: [SearchController],
})
export class SearchModule {}
