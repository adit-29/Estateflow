import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type {
  AuthSignInInput,
  AuthSignUpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyContactRequest,
} from '@estateflow/shared';
import { AuthService } from './auth.service';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import { SESSION_COOKIE, sessionCookieOptions } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('mode')
  getMode() {
    return this.authService.getAuthMode();
  }

  @Post('signup')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  signUp(@Body() body: AuthSignUpInput) {
    return this.authService.signUp(body);
  }

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verify(@Body() body: VerifyContactRequest) {
    return this.authService.verifyContact(body);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() body: ForgotPasswordInput) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() body: ResetPasswordInput) {
    return this.authService.resetPassword(body);
  }

  @Post('signin')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async signIn(@Body() body: AuthSignInInput, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.signIn(body);
    res.cookie(SESSION_COOKIE, result.accessToken, sessionCookieOptions(result.expiresIn));
    return { user: result.user, expiresIn: result.expiresIn, authMode: result.authMode };
  }

  @Post('signout')
  @UseGuards(AuthGuard)
  async signOut(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return this.authService.signOut(req.user!.subjectId);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
