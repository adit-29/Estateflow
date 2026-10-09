import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { InboxService } from './inbox.service';

@Controller('inbox')
@UseGuards(AuthGuard, AgencyGuard)
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get('status')
  status(@Req() req: AuthenticatedRequest) {
    return this.inbox.status(req.agencyId!);
  }

  @Post('whatsapp/connect')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  connect(@Req() req: AuthenticatedRequest, @Body() body: { confirm?: unknown }) {
    return this.inbox.connectWhatsApp({ agencyId: req.agencyId!, accountId: req.user!.id, confirm: body?.confirm });
  }

  @Get('conversations')
  conversations(@Req() req: AuthenticatedRequest) {
    return this.inbox.conversations(req.agencyId!);
  }

  @Get('conversations/:id')
  thread(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.inbox.thread(req.agencyId!, id);
  }

  @Get('conversations/:id/extraction')
  extraction(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.inbox.extraction(req.agencyId!, id);
  }

  @Post('conversations/:id/extraction/save')
  saveExtraction(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: unknown) {
    return this.inbox.saveExtraction({ agencyId: req.agencyId!, accountId: req.user!.id, conversationId: id, body });
  }

  @Post('conversations/:id/send')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  send(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: unknown) {
    return this.inbox.send({ agencyId: req.agencyId!, accountId: req.user!.id, conversationId: id, body });
  }
}
