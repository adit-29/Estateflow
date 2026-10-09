import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { readSessionToken, SESSION_COOKIE } from './session-cookie';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user?: Awaited<ReturnType<AuthService['getSessionFromToken']>>;
  agencyId?: string;
  organizationId?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionToken(req.headers.authorization, req.cookies?.[SESSION_COOKIE]);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    req.user = await this.authService.getSessionFromToken(token);
    return true;
  }
}
