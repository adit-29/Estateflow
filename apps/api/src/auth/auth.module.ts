import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthProvider } from './local-auth.provider';
import { CognitoAuthProvider } from './cognito-auth.provider';
import { IDENTITY_PROVIDER } from './auth-provider.interface';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';

const providerFactory = {
  provide: IDENTITY_PROVIDER,
  useFactory: (local: LocalAuthProvider, cognito: CognitoAuthProvider) => {
    return process.env.AUTH_PROVIDER === 'cognito' ? cognito : local;
  },
  inject: [LocalAuthProvider, CognitoAuthProvider],
};

@Module({
  controllers: [AuthController],
  providers: [AuthService, LocalAuthProvider, CognitoAuthProvider, providerFactory, AuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard, IDENTITY_PROVIDER],
})
export class AuthModule {}
