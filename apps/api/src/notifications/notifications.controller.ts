import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  defaultNotificationPreference,
  notificationDedupeKey,
  preferenceAllows,
  type NotificationKind,
} from '@estateflow/shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDeliveryService } from './notification-delivery.service';

@Controller('notifications')
@UseGuards(AuthGuard, AgencyGuard)
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.prisma.notification.findMany({
      where: { agencyId: req.agencyId, accountId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, kind: true, title: true, body: true, readAt: true, createdAt: true },
    });
  }

  @Patch('read-all')
  async readAll(@Req() req: AuthenticatedRequest) {
    const updated = await this.prisma.notification.updateMany({
      where: { agencyId: req.agencyId, accountId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: updated.count };
  }

  @Patch(':id/read')
  async read(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, agencyId: req.agencyId, accountId: req.user!.id },
      data: { readAt: new Date() },
    });
    return { updated: updated.count };
  }

  @Get('preferences')
  async preferences(@Req() req: AuthenticatedRequest) {
    const row = await this.prisma.notificationPreference.findUnique({ where: { accountId: req.user!.id } });
    return row ?? defaultNotificationPreference();
  }

  @Patch('preferences')
  async updatePreferences(@Req() req: AuthenticatedRequest, @Body() body: Partial<ReturnType<typeof defaultNotificationPreference>>) {
    const current = defaultNotificationPreference();
    return this.prisma.notificationPreference.upsert({
      where: { accountId: req.user!.id },
      create: { accountId: req.user!.id, ...current, ...body },
      update: body,
    });
  }

  @Get('delivery-status')
  deliveryStatus() {
    return this.delivery.availability();
  }

  @Get('deliveries')
  deliveries(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.delivery.list(req.agencyId!, req.user!.id, status);
  }

  @Post('deliveries/:id/retry')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  retry(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.delivery.retry(req.agencyId!, req.user!.id, id);
  }

  @Post('deliveries/:id/dismiss')
  dismiss(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.delivery.dismiss(req.agencyId!, req.user!.id, id);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async enqueue(@Req() req: AuthenticatedRequest, @Body() body: { kind: NotificationKind; title: string; body: string; entityId: string }) {
    const kinds: NotificationKind[] = ['reminder', 'visit_change', 'shared_inventory', 'collaboration_request'];
    if (!body || !kinds.includes(body.kind) || typeof body.title !== 'string' || typeof body.body !== 'string' || typeof body.entityId !== 'string') {
      throw new BadRequestException('kind, title, body, and entityId are required.');
    }
    const prefs = await this.preferences(req);
    if (!preferenceAllows(prefs, body.kind)) return { skipped: true };
    const dedupeKey = notificationDedupeKey(body.kind, body.entityId.slice(0, 80));
    const agencyId = req.agencyId!;
    const title = body.title.slice(0, 140);
    const text = body.body.slice(0, 500);
    let notification: { id: string };
    let duplicate = false;
    try {
      notification = await this.prisma.notification.create({
        data: { agencyId, accountId: req.user!.id, kind: body.kind, title, body: text, dedupeKey },
        select: { id: true },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      duplicate = true;
      notification = await this.prisma.notification.findUniqueOrThrow({
        where: { agencyId_dedupeKey: { agencyId, dedupeKey } },
        select: { id: true },
      });
    }
    const deliveries = duplicate
      ? []
      : await this.delivery.fanOut({ agencyId, notificationId: notification.id, to: req.user!.email, title, body: text });
    return { id: notification.id, duplicate, deliveries: deliveries.length, delivery: this.delivery.availability().summary };
  }
}
