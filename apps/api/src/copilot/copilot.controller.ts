import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { resolveCopilotMode } from './copilot-mode';
import { CopilotService } from './copilot.service';

@Controller('copilot')
@UseGuards(AuthGuard)
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Get('status')
  status(@Req() req: AuthenticatedRequest) {
    this.assertDealer(req);
    return this.copilot.status();
  }

  @Post('test')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  test(@Req() req: AuthenticatedRequest) {
    this.assertDealer(req);
    return this.copilot.testConnection();
  }

  @Post('chat')
  @UseGuards(AgencyGuard)
  @Throttle({ default: { limit: Number(process.env.AI_CHAT_RATE_LIMIT_PER_MIN ?? 10), ttl: 60_000 } })
  chat(
    @Req() req: AuthenticatedRequest,
    @Body() body: { message?: unknown; conversationId?: unknown; pageContext?: { type?: unknown; id?: unknown } },
  ) {
    this.assertDealer(req);
    const pageContext =
      body?.pageContext && typeof body.pageContext === 'object'
        ? {
            type: typeof body.pageContext.type === 'string' ? body.pageContext.type : undefined,
            id: typeof body.pageContext.id === 'string' ? body.pageContext.id : undefined,
          }
        : undefined;
    return this.copilot.chat({
      agencyId: req.agencyId!,
      accountId: req.user!.id,
      message: typeof body?.message === 'string' ? body.message : '',
      conversationId: typeof body?.conversationId === 'string' ? body.conversationId : undefined,
      pageContext,
    });
  }

  @Post('actions/confirm')
  @UseGuards(AgencyGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirm(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    this.assertDealer(req);
    return this.copilot.confirmAction({ agencyId: req.agencyId!, accountId: req.user!.id, body });
  }

  @Get('visit-brief/:visitId')
  @UseGuards(AgencyGuard)
  visitBrief(@Req() req: AuthenticatedRequest, @Param('visitId', new ParseUUIDPipe()) visitId: string) {
    this.assertDealer(req);
    return this.copilot.visitBrief({ agencyId: req.agencyId!, visitId });
  }

  @Post('visit-summary')
  @UseGuards(AgencyGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  visitSummary(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    this.assertDealer(req);
    return this.copilot.visitSummary({ agencyId: req.agencyId!, accountId: req.user!.id, body });
  }

  private assertDealer(req: AuthenticatedRequest) {
    const resolved = resolveCopilotMode({ authenticated: Boolean(req.user), role: req.user?.role ?? null });
    if (resolved.mode !== 'live') throw new ForbiddenException(resolved.reason);
  }
}
