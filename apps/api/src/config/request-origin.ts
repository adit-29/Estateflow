const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SKIP_PREFIXES = ['/webhooks', '/reconstruction/callbacks', '/health'];

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function originFromHeaders(originHeader?: string, refererHeader?: string): string | undefined {
  if (originHeader?.trim()) return originHeader.trim();
  if (!refererHeader) return undefined;
  try {
    return new URL(refererHeader).origin;
  } catch {
    return undefined;
  }
}

export function originIsAllowed(origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin) return false;
  return allowedOrigins(env).includes(origin);
}

export function shouldSkipCookieOriginCheck(method: string, path: string): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  return SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Cookie-authenticated mutations must come from an allowed web origin. Bearer-only requests are unchanged. */
export function cookieMutationOriginAllowed(input: {
  method: string;
  path: string;
  origin?: string;
  referer?: string;
  hasSessionCookie: boolean;
  env?: NodeJS.ProcessEnv;
}): boolean {
  if (!input.hasSessionCookie) return true;
  if (shouldSkipCookieOriginCheck(input.method, input.path)) return true;
  return originIsAllowed(originFromHeaders(input.origin, input.referer), input.env);
}
