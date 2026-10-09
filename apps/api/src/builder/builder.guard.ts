import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.guard';

@Injectable()
export class BuilderGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user || req.user.role !== 'builder') {
      throw new ForbiddenException('A builder account is required');
    }
    const membership = await this.prisma.builderMembership.findUnique({ where: { accountId: req.user.id } });
    if (!membership) throw new ForbiddenException('Builder organization not found');
    const supplied = req.header('x-organization-id') ?? (typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined);
    if (supplied && supplied !== membership.organizationId) {
      console.log(JSON.stringify({ event: 'ignored_client_tenant' }));
    }
    req.organizationId = membership.organizationId;
    return true;
  }
}
