import { appEnv } from '../config/runtime-env';

export const SESSION_COOKIE = 'ef_session';

export function readSessionToken(authorization?: string, cookieToken?: string): string | null {
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }
  const cookie = cookieToken?.trim();
  return cookie || null;
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: appEnv() !== 'local',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
}
