import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  // Do not $connect in OnModuleInit. Nest waits for init before listen(); a down
  // database would prevent /health from ever answering, which breaks ECS liveness.
  // Prisma connects on the first query. /health stays dependency-free; /health/ready checks the database.

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
