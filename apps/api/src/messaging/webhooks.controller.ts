import { BadRequestException, Controller, Get, Headers, HttpCode, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { parseWhatsAppWebhook } from '@estateflow/shared';
import { verifyMetaSignature } from './webhook-security';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';

type RawRequest = Request & { rawBody?: Buffer };

@Controller('webhooks')
@SkipThrottle()
export class WebhooksController {
  constructor(private readonly whatsapp: WhatsAppWebhookService) {}

  @Get('whatsapp')
  verifyWhatsApp(@Query() query: Record<string, string>) {
    return this.verifyHandshake(query);
  }

  @Get('facebook')
  verifyFacebook(@Query() query: Record<string, string>) {
    return this.verifyHandshake(query);
  }

  @Get('instagram')
  verifyInstagram(@Query() query: Record<string, string>) {
    return this.verifyHandshake(query);
  }

  @Post('whatsapp')
  @HttpCode(200)
  async whatsappEvents(@Req() req: RawRequest, @Headers('x-hub-signature-256') signature?: string) {
    this.verifySignature(req, signature);
    const events = parseWhatsAppWebhook(req.body);
    const result = await this.whatsapp.process(events);
    return { ok: true, received: events.length, ...result };
  }

  @Post('facebook')
  @HttpCode(200)
  facebook(@Req() req: RawRequest, @Headers('x-hub-signature-256') signature?: string) {
    return this.recordOnly('facebook_messenger', req, signature);
  }

  @Post('instagram')
  @HttpCode(200)
  instagram(@Req() req: RawRequest, @Headers('x-hub-signature-256') signature?: string) {
    return this.recordOnly('instagram', req, signature);
  }

  private verifyHandshake(query: Record<string, string>) {
    const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (!token || query['hub.verify_token'] !== token || query['hub.mode'] !== 'subscribe') {
      throw new UnauthorizedException('Webhook verification failed');
    }
    return query['hub.challenge'] ?? '';
  }

  private verifySignature(req: RawRequest, signature?: string) {
    if (!req.rawBody) throw new BadRequestException('Raw body unavailable');
    if (!verifyMetaSignature(req.rawBody, signature, process.env.META_APP_SECRET)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private async recordOnly(channel: 'facebook_messenger' | 'instagram', req: RawRequest, signature?: string) {
    this.verifySignature(req, signature);
    const key = `${channel}:${createHash('sha256').update(req.rawBody!).digest('hex')}`;
    const { duplicate } = await this.whatsapp.recordOnly(channel, key);
    return { ok: true, duplicate, processed: false, reason: 'Channel not integrated yet; event verified and recorded only.' };
  }
}
