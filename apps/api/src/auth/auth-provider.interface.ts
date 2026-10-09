import type { AuthSignInInput, AuthSignUpInput } from '@estateflow/shared';

export interface AuthProviderSignUpResult {
  subjectId: string;
  email: string;
  requiresVerification: boolean;
  /** Dev only: shown when AUTH_PROVIDER=local */
  devVerifyCode?: string;
}

export interface AuthProviderSignInResult {
  subjectId: string;
  email: string;
  accessToken: string;
  expiresIn: number;
}

export interface AuthProviderVerifyResult {
  subjectId: string;
  email: string;
  verified: boolean;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export interface PasswordResetRequestResult {
  /** Dev only: returned when APP_ENV=local so operators can test without email. */
  resetCode?: string;
}

export interface IdentityProvider {
  readonly mode: 'local' | 'cognito';
  signUp(input: AuthSignUpInput): Promise<AuthProviderSignUpResult>;
  signIn(input: AuthSignInInput): Promise<AuthProviderSignInResult>;
  verifyContact(subjectId: string, code: string): Promise<AuthProviderVerifyResult>;
  verifyAccessToken(token: string): Promise<AuthTokenPayload>;
  signOut(subjectId: string): Promise<void>;
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
