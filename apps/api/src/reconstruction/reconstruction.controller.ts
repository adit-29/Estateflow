import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { providerCallbackSchema } from '@estateflow/shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { TourService, type CreateTourJobInput } from './tour.service';
import { verifyProviderSignature } from './tour-provider';

@Controller('reconstruction')
@UseGuards(AuthGuard, AgencyGuard)
export class ReconstructionController {
  constructor(private readonly tours: TourService) {}

  @Get('status')
  status() {
    return this.tours.status();
  }

  @Get('jobs')
  list(@Req() req: AuthenticatedRequest, @Query('propertyId') propertyId?: string) {
    return this.tours.list(req.agencyId!, typeof propertyId === 'string' && propertyId ? propertyId : undefined);
  }

  @Post('jobs')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateTourJobInput) {
    return this.tours.create(req.agencyId!, req.user!.id, body ?? ({} as CreateTourJobInput));
  }

  @Get('jobs/:id')
  get(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.get(req.agencyId!, id);
  }

  @Post('jobs/:id/upload-url')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  uploadUrl(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.uploadUrl(req.agencyId!, req.user!.id, id);
  }

  @Post('jobs/:id/complete')
  @HttpCode(200)
  complete(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.completeUpload(req.agencyId!, req.user!.id, id);
  }

  @Post('jobs/:id/submit')
  @HttpCode(200)
  submit(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.submit(req.agencyId!, req.user!.id, id);
  }

  @Get('jobs/:id/media')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  media(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.media(req.agencyId!, id);
  }

  @Post('jobs/:id/attach')
  @HttpCode(200)
  attach(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.attach(req.agencyId!, req.user!.id, id);
  }

  @Post('jobs/:id/detach')
  @HttpCode(200)
  detach(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.detach(req.agencyId!, req.user!.id, id);
  }

  @Get('jobs/:id/share-links')
  shareLinks(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.listShareLinks(req.agencyId!, id);
  }

  @Post('jobs/:id/share-links')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createShareLink(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: { expiresInDays?: number }) {
    return this.tours.createShareLink(req.agencyId!, req.user!.id, id, Number(body?.expiresInDays ?? 7));
  }

  @Post('share-links/:linkId/revoke')
  @HttpCode(200)
  revoke(@Req() req: AuthenticatedRequest, @Param('linkId', ParseUUIDPipe) linkId: string) {
    return this.tours.revokeShareLink(req.agencyId!, req.user!.id, linkId);
  }
}

@Controller('tours')
export class PublicTourController {
  constructor(private readonly tours: TourService) {}

  @Get('shared/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  shared(@Param('token') token: string) {
    return this.tours.viewShared(token);
  }
}

@Controller('reconstruction/callbacks')
export class ProviderCallbackController {
  constructor(private readonly tours: TourService) {}

  @Post(':provider')
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  callback(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-estateflow-signature') signature: string | undefined,
  ) {
    const configured = process.env.RECONSTRUCTION_PROVIDER?.trim();
    if (!configured || configured !== provider || !verifyProviderSignature(req.rawBody, signature, process.env.RECONSTRUCTION_WEBHOOK_SECRET)) {
      throw new UnauthorizedException('Invalid provider signature');
    }
    const parsed = providerCallbackSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestException('Invalid callback payload');
    return this.tours.applyCallback(provider, parsed.data);
  }
}
