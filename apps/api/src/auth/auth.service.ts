import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  authSignInSchema,
  authSignUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyContactRequestSchema,
  type AuthSignInInput,
  type AuthSignUpInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SessionUser,
  type VerifyContactRequest,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IDENTITY_PROVIDER, type IdentityProvider } from './auth-provider.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_PROVIDER) private readonly idp: IdentityProvider,
  ) {}

  getAuthMode() {
    return {
      provider: this.idp.mode,
      label: this.idp.mode === 'local' ? 'Local development auth' : 'Amazon Cognito',
      configured: this.idp.mode === 'local',
    };
  }

  async signUp(raw: AuthSignUpInput) {
    const input = authSignUpSchema.parse(raw);
    const result = await this.idp.signUp(input);

    const existingAccount = await this.prisma.account.findUnique({
      where: { subjectId: result.subjectId },
    });
    if (!existingAccount) {
      try {
        await this.prisma.account.create({
          data: {
            subjectId: result.subjectId,
            email: result.email,
            role: input.role,
            emailVerified: false,
            onboardingStatus: 'not_started',
          },
        });
      } catch (e: unknown) {
        const prismaError = e as { code?: string };
        if (prismaError.code === 'P2002') {
          throw new ConflictException('An account with this email already exists');
        }
        throw e;
      }
      if (input.role === 'builder') {
        const account = await this.prisma.account.findUniqueOrThrow({ where: { subjectId: result.subjectId } });
        const existing = await this.prisma.builderMembership.findUnique({ where: { accountId: account.id } });
        if (!existing) {
          await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_account', ${account.id}, true)`;
            const organization = await tx.builderOrganization.create({ data: { name: 'Builder organization' } });
            await tx.$executeRaw`SELECT set_config('app.current_tenant', ${organization.id}, true)`;
            await tx.builderMembership.create({ data: { organizationId: organization.id, accountId: account.id } });
          });
        }
      }
    }

    return {
      subjectId: result.subjectId,
      email: result.email,
      requiresVerification: result.requiresVerification,
      devVerifyCode: result.devVerifyCode,
      authMode: this.getAuthMode(),
    };
  }

  async verifyContact(raw: VerifyContactRequest) {
    const input = verifyContactRequestSchema.parse(raw);
    let subjectId = input.subjectId;
    if (!subjectId && input.email) {
      const cred = await this.prisma.localAuthCredential.findUnique({
        where: { email: input.email.trim().toLowerCase() },
      });
      if (!cred) {
        throw new BadRequestException({ message: 'Invalid verification request', code: 'INVALID_CODE' });
      }
      subjectId = cred.subjectId;
    }
    if (!subjectId) {
      throw new BadRequestException({ message: 'Invalid verification request', code: 'INVALID_CODE' });
    }
    const result = await this.idp.verifyContact(subjectId, input.code);

    await this.prisma.account.update({
      where: { subjectId: result.subjectId },
      data: { emailVerified: true },
    });

    return { verified: true, email: result.email };
  }

  async signIn(raw: AuthSignInInput) {
    const input = authSignInSchema.parse(raw);
    try {
      const result = await this.idp.signIn(input);
      let account = await this.prisma.account.findUnique({
        where: { subjectId: result.subjectId },
      });
      if (!account) {
        account = await this.prisma.account.create({
          data: {
            subjectId: result.subjectId,
            email: result.email,
            role: 'dealer',
            emailVerified: true,
            onboardingStatus: 'not_started',
          },
        });
      }

      const user = await this.toSessionUser(account.id);
      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user,
        authMode: this.getAuthMode(),
      };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      throw err;
    }
  }

  async signOut(subjectId: string) {
    await this.idp.signOut(subjectId);
    return { ok: true };
  }

  async forgotPassword(raw: ForgotPasswordInput) {
    const input = forgotPasswordSchema.parse(raw);
    const result = await this.idp.requestPasswordReset(input.email);
    return {
      ok: true,
      message: 'If that account exists, a reset code has been issued.',
      resetCode: result.resetCode,
    };
  }

  async resetPassword(raw: ResetPasswordInput) {
    const input = resetPasswordSchema.parse(raw);
    await this.idp.resetPassword(input.email, input.code, input.password);
    return { ok: true };
  }

  async getSessionFromToken(token: string): Promise<SessionUser> {
    const payload = await this.idp.verifyAccessToken(token);
    const account = await this.prisma.account.findUnique({
      where: { subjectId: payload.sub },
    });
    if (!account || account.deletedAt) {
      throw new UnauthorizedException({ message: 'Session expired', code: 'SESSION_EXPIRED' });
    }
    if (account.role !== 'dealer' && account.role !== 'builder') {
      throw new UnauthorizedException('Role not enabled');
    }
    return this.toSessionUser(account.id);
  }

  private async toSessionUser(accountId: string): Promise<SessionUser> {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    return {
      id: account.id,
      subjectId: account.subjectId,
      email: account.email,
      role: account.role,
      emailVerified: account.emailVerified,
      platformAdmin: account.platformAdmin,
      onboardingStatus: account.onboardingStatus,
    };
  }
}
