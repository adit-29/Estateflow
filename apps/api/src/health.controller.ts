import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaService } from './prisma/prisma.service';
import { AuthGuard } from './auth/auth.guard';
import { appEnv, integrationSetup } from './config/runtime-env';

export function expectedMigrations(dir = process.env.MIGRATIONS_DIR || path.join(__dirname, '../prisma/migrations')): string[] | null {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d{14}_/.test(d.name))
      .map((d) => d.name)
      .sort();
  } catch {
    return null;
  }
}

export function migrationReadiness(expected: string[] | null, applied: { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]) {
  const done = new Set(applied.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name));
  const failed = applied.filter((m) => !m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);
  const pending = expected ? expected.filter((name) => !done.has(name)) : [];
  return { failed, pending, known: expected !== null };
}

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up. No dependencies are checked so a slow database does not kill tasks. */
  @Get()
  check() {
    return { ok: true, env: appEnv(), version: process.env.APP_VERSION || null, authMode: process.env.AUTH_PROVIDER ?? 'local' };
  }

  /** Readiness: database reachable and every migration shipped in this image is applied. */
  @Get('ready')
  async ready() {
    if (!process.env.DATABASE_URL) {
      throw new ServiceUnavailableException({ message: 'Database is not configured', code: 'database_not_configured' });
    }
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ message: 'Database is unavailable', code: 'database_unavailable' });
    }
    let applied: { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[] = [];
    try {
      applied = await this.prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    } catch {
      throw new ServiceUnavailableException({ message: 'Migrations have not been applied', code: 'migrations_missing' });
    }
    const state = migrationReadiness(expectedMigrations(), applied);
    if (state.failed.length) throw new ServiceUnavailableException({ message: `A migration failed: ${state.failed[0]}`, code: 'migration_failed' });
    if (state.pending.length) throw new ServiceUnavailableException({ message: `${state.pending.length} migration(s) pending. Run the migrate task.`, code: 'migrations_pending' });
    return { ok: true, database: 'up', migrations: state.known ? 'current' : 'unknown' };
  }
}

@Controller('system')
@UseGuards(AuthGuard)
export class SystemController {
  /** Presence of server configuration only. Never returns values. */
  @Get('setup')
  setup() {
    return { env: appEnv(), integrations: integrationSetup() };
  }
}
