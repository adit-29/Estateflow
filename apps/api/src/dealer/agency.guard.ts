import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { agencyFromSession, clientTenantWasIgnored } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.guard';

@Injectable()
export class AgencyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new ForbiddenException();
    }

    const membership = await this.prisma.dealerMembership.findFirst({
      where: { accountId: req.user.id },
      include: { agency: true },
    });

    if (!membership) {
      throw new ForbiddenException('Complete dealer onboarding to access the workspace');
    }

    const supplied = req.header('x-agency-id') ?? (typeof req.query.agencyId === 'string' ? req.query.agencyId : undefined);
    if (clientTenantWasIgnored(membership.agencyId, supplied)) {
      console.log(JSON.stringify({ event: 'ignored_client_tenant' }));
    }
    req.agencyId = agencyFromSession(membership.agencyId);
    return true;
  }
}
