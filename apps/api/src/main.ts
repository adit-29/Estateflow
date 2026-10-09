import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import { requestContext } from './common/request-context';
import { SafeExceptionFilter } from './common/safe-exception.filter';
import { reportError } from './common/error-reporter';
import { appEnv, assertSafeRuntime } from './config/runtime-env';
import { allowedOrigins, cookieMutationOriginAllowed } from './config/request-origin';
import { SESSION_COOKIE } from './auth/session-cookie';

async function bootstrap() {
  assertSafeRuntime();
  process.on('unhandledRejection', (reason) => reportError(reason, { status: 500, path: 'process:unhandledRejection' }));
  process.on('uncaughtException', (error) => {
    reportError(error, { status: 500, path: 'process:uncaughtException' });
    process.exit(1);
  });

  const app = await NestFactory.create(AppModule, { rawBody: true, logger: ['error', 'warn', 'log'] });
  app.enableShutdownHooks();
  const http = app.getHttpAdapter().getInstance();
  http.set('trust proxy', 1);
  http.disable('x-powered-by');
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    const allowed = cookieMutationOriginAllowed({
      method: req.method,
      path: req.path,
      origin,
      referer,
      hasSessionCookie: Boolean(req.cookies?.[SESSION_COOKIE]),
    });
    if (!allowed) {
      res.status(403).json({ message: 'Invalid request origin', code: 'CSRF_ORIGIN' });
      return;
    }
    next();
  });
  app.use(requestContext);
  app.useGlobalFilters(new SafeExceptionFilter());
  const origins = allowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(JSON.stringify({ level: 'info', event: 'api_started', env: appEnv(), port, version: process.env.APP_VERSION || null }));
}

bootstrap().catch((error) => {
  console.error(JSON.stringify({ level: 'fatal', event: 'api_start_failed', message: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
