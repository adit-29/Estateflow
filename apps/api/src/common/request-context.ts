import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && /^[A-Za-z0-9-]{8,80}$/.test(incoming) ? incoming : randomUUID();
  (req as Request & { requestId?: string }).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  const started = Date.now();
  res.on('finish', () => {
    // Path only: query strings can carry tokens and are never logged.
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : 'info',
      event: 'request',
      ts: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path.startsWith('/tours/shared/') ? '/tours/shared/:token' : req.path,
      status: res.statusCode,
      ms: Date.now() - started,
    }));
  });
  next();
}
