import { Injectable, NotImplementedException } from '@nestjs/common';
import type { AuthSignInInput, AuthSignUpInput } from '@estateflow/shared';
import type {
  AuthProviderSignInResult,
  AuthProviderSignUpResult,
  AuthProviderVerifyResult,
  AuthTokenPayload,
  IdentityProvider,
} from './auth-provider.interface';

/**
 * Production identity provider — wire Amazon Cognito SDK here.
 * Not active until AUTH_PROVIDER=cognito and pool credentials are configured.
 */
@Injectable()
export class CognitoAuthProvider implements IdentityProvider {
  readonly mode = 'cognito' as const;

  private notConfigured(): never {
    throw new NotImplementedException(
      'Cognito auth is not configured. Set COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, and COGNITO_REGION.',
    );
  }

  signUp(_input: AuthSignUpInput): Promise<AuthProviderSignUpResult> {
    return Promise.resolve(this.notConfigured());
  }

  signIn(_input: AuthSignInInput): Promise<AuthProviderSignInResult> {
    return Promise.resolve(this.notConfigured());
  }

  verifyContact(_subjectId: string, _code: string): Promise<AuthProviderVerifyResult> {
    return Promise.resolve(this.notConfigured());
  }

  verifyAccessToken(_token: string): Promise<AuthTokenPayload> {
    return Promise.resolve(this.notConfigured());
  }

  signOut(_subjectId: string): Promise<void> {
    return Promise.resolve(this.notConfigured());
  }

  requestPasswordReset(_email: string) {
    return Promise.resolve(this.notConfigured());
  }

  resetPassword(_email: string, _code: string, _newPassword: string): Promise<void> {
    return Promise.resolve(this.notConfigured());
  }
}
