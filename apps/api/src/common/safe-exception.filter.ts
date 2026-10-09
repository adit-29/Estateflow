import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { publicErrorMessage } from '@estateflow/shared';
import { reportError } from './error-reporter';

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const request = ctx.getRequest<{ requestId?: string; method?: string; path?: string }>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    let raw: string | undefined;
    let code: string | null = null;
    let setupGuidance: string | null = null;
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') raw = body;
      else if (body && typeof body === 'object' && 'message' in body) {
        const message = (body as { message?: unknown }).message;
        raw = typeof message === 'string' ? message : Array.isArray(message) ? message.join(', ') : undefined;
        const c = (body as { code?: unknown }).code;
        if (typeof c === 'string' && /^[a-z_]{3,40}$/i.test(c)) code = c;
        const g = (body as { setupGuidance?: unknown }).setupGuidance;
        if (typeof g === 'string') setupGuidance = g.slice(0, 400);
        else if (Array.isArray(g)) setupGuidance = g.filter((s): s is string => typeof s === 'string').join(' ').slice(0, 600);
      }
    }
    if (status >= 500 && !(status === 503 && code)) {
      reportError(exception, { requestId: request.requestId ?? null, method: request.method, path: request.path, status });
    } else {
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'http_error',
        requestId: request.requestId,
        status,
        code,
        name: exception instanceof Error ? exception.name : 'Error',
      }));
    }
    // Only 503s thrown on purpose with a code keep their message; unexpected 5xx stay generic.
    const intentionalUnavailable = status === 503 && code !== null && raw;
    response.status(status).json({
      message: intentionalUnavailable ? raw!.slice(0, 200) : publicErrorMessage(status, raw),
      requestId: request.requestId ?? null,
      ...(code ? { code } : {}),
      ...(setupGuidance ? { setupGuidance } : {}),
    });
  }
}
