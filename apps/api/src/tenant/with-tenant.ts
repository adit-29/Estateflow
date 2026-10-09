import type { PrismaService } from '../prisma/prisma.service';

/**
 * Sets the tenant for this transaction only.
 * Prisma must run the query on the same `tx` client. A session-level SET would
 * leak across the connection pool, so this helper uses set_config(..., true).
 */
export async function withTenant<T>(
  prisma: PrismaService,
  agencyId: string,
  accountId: string | undefined,
  fn: (tx: PrismaService) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${agencyId}, true)`;
    if (accountId) {
      await tx.$executeRaw`SELECT set_config('app.current_account', ${accountId}, true)`;
    }
    return fn(tx as unknown as PrismaService);
  });
}
