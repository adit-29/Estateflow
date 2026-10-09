import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { DealerOnboardingInput } from '@estateflow/shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { DealerService } from './dealer.service';

@Controller('dealer')
@UseGuards(AuthGuard)
export class DealerController {
  constructor(private readonly dealerService: DealerService) {}

  @Get('profile')
  async profile(@Req() req: AuthenticatedRequest) {
    this.dealerService.assertDealer(req.user!);
    return this.dealerService.getProfile(req.user!.id);
  }

  @Get('onboarding')
  async onboarding(@Req() req: AuthenticatedRequest) {
    this.dealerService.assertDealer(req.user!);
    return this.dealerService.getOnboardingDraft(req.user!.id);
  }

  @Patch('onboarding')
  async saveProgress(
    @Req() req: AuthenticatedRequest,
    @Body() body: Partial<DealerOnboardingInput>,
  ) {
    this.dealerService.assertDealer(req.user!);
    return this.dealerService.saveOnboardingProgress(req.user!.id, body);
  }

  @Post('onboarding/submit')
  async submit(@Req() req: AuthenticatedRequest, @Body() body: DealerOnboardingInput) {
    this.dealerService.assertDealer(req.user!);
    return this.dealerService.submitOnboarding(req.user!.id, body);
  }
}
