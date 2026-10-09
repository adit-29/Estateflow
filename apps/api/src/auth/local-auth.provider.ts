import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import type { AuthSignInInput, AuthSignUpInput } from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { appEnv } from '../config/runtime-env';
import type {
  AuthProviderSignInResult,
  AuthProviderSignUpResult,
  AuthProviderVerifyResult,
  AuthTokenPayload,
  IdentityProvider,
  PasswordResetRequestResult,
} from './auth-provider.interface';

const RESET_TTL_MS = 15 * 60 * 1000;

export function hashResetCode(secret: string, email: string, code: string): string {
  return createHash('sha256').update(`${email.trim().toLowerCase()}:${code}:${secret}`).digest('hex');
}

export function resetCodesMatch(storedHash: string | null | undefined, computedHash: string): boolean {
  if (!storedHash || storedHash.length !== computedHash.length) return false;
  return timingSafeEqual(Buffer.from(storedHash), Buffer.from(computedHash));
}

@Injectable()
export class LocalAuthProvider implements IdentityProvider {
  readonly mode = 'local' as const;

  constructor(private readonly prisma: PrismaService) {}

  private get secret(): string {
    const secret = process.env.LOCAL_AUTH_SECRET;
    if (appEnv() !== 'local' && (!secret || secret === 'change-me-in-development-only' || secret.length < 32)) {
      throw new Error('LOCAL_AUTH_SECRET is not safe for a deployed environment');
    }
    return secret || 'local-dev-insecure-secret';
  }

  private ttl(): number {
    return Number(process.env.LOCAL_AUTH_TOKEN_TTL_SECONDS ?? 86400);
  }

  async signUp(input: AuthSignUpInput): Promise<AuthProviderSignUpResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.localAuthCredential.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const subjectId = `local_${email.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const passwordHash = await bcrypt.hash(input.password, 10);
    const verifyCode = String(randomInt(100000, 999999));

    await this.prisma.localAuthCredential.create({
      data: { subjectId, email, passwordHash, verifyCode },
    });

    return {
      subjectId,
      email,
      requiresVerification: true,
      devVerifyCode: appEnv() === 'local' ? verifyCode : undefined,
    };
  }

  async signIn(input: AuthSignInInput): Promise<AuthProviderSignInResult> {
    const email = input.email.trim().toLowerCase();
    const cred = await this.prisma.localAuthCredential.findUnique({ where: { email } });
    if (!cred) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(input.password, cred.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const account = await this.prisma.account.findUnique({ where: { subjectId: cred.subjectId } });
    if (account && !account.emailVerified) {
      throw new UnauthorizedException({
        message: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        subjectId: cred.subjectId,
      });
    }

    const expiresIn = this.ttl();
    const accessToken = jwt.sign({ sub: cred.subjectId, email }, this.secret, {
      expiresIn,
    });

    return { subjectId: cred.subjectId, email, accessToken, expiresIn };
  }

  async verifyContact(subjectId: string, code: string): Promise<AuthProviderVerifyResult> {
    const cred = await this.prisma.localAuthCredential.findUnique({ where: { subjectId } });
    if (!cred) {
      throw new BadRequestException('Invalid verification request');
    }
    if (cred.verifyCode !== code) {
      throw new BadRequestException({ message: 'Invalid verification code', code: 'INVALID_CODE' });
    }

    await this.prisma.localAuthCredential.update({
      where: { subjectId },
      data: { verifyCode: null },
    });

    return { subjectId, email: cred.email, verified: true };
  }

  async verifyAccessToken(token: string): Promise<AuthTokenPayload> {
    try {
      const payload = jwt.verify(token, this.secret) as AuthTokenPayload;
      return payload;
    } catch {
      throw new UnauthorizedException({ message: 'Session expired', code: 'SESSION_EXPIRED' });
    }
  }

  async signOut(_subjectId: string): Promise<void> {
    // Stateless JWT — client discards token
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    const normalized = email.trim().toLowerCase();
    const cred = await this.prisma.localAuthCredential.findUnique({ where: { email: normalized } });
    if (!cred) {
      return {};
    }
    const resetCode = String(randomInt(100000, 999999));
    await this.prisma.localAuthCredential.update({
      where: { email: normalized },
      data: {
        resetTokenHash: hashResetCode(this.secret, normalized, resetCode),
        resetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    return { resetCode: appEnv() === 'local' ? resetCode : undefined };
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const cred = await this.prisma.localAuthCredential.findUnique({ where: { email: normalized } });
    if (!cred?.resetTokenHash || !cred.resetExpiresAt || cred.resetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException({ message: 'Invalid or expired reset code', code: 'INVALID_RESET' });
    }
    const computed = hashResetCode(this.secret, normalized, code);
    if (!resetCodesMatch(cred.resetTokenHash, computed)) {
      throw new BadRequestException({ message: 'Invalid or expired reset code', code: 'INVALID_RESET' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.localAuthCredential.update({
      where: { email: normalized },
      data: { passwordHash, resetTokenHash: null, resetExpiresAt: null, verifyCode: null },
    });
  }
}
