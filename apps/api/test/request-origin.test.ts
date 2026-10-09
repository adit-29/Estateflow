import { describe, expect, it } from 'vitest';
import {
  allowedOrigins,
  cookieMutationOriginAllowed,
  originFromHeaders,
  originIsAllowed,
} from '../src/config/request-origin';
import { hashResetCode, resetCodesMatch } from '../src/auth/local-auth.provider';

describe('cookie mutation origin', () => {
  const env = { CORS_ORIGIN: 'http://localhost:3000,https://app.example.com' };

  it('parses comma-separated origins', () => {
    expect(allowedOrigins(env)).toEqual(['http://localhost:3000', 'https://app.example.com']);
  });

  it('allows cookie mutations only from listed origins', () => {
    expect(
      cookieMutationOriginAllowed({
        method: 'POST',
        path: '/leads',
        origin: 'http://localhost:3000',
        hasSessionCookie: true,
        env,
      }),
    ).toBe(true);
    expect(
      cookieMutationOriginAllowed({
        method: 'POST',
        path: '/leads',
        origin: 'https://evil.example',
        hasSessionCookie: true,
        env,
      }),
    ).toBe(false);
    expect(
      cookieMutationOriginAllowed({
        method: 'POST',
        path: '/leads',
        hasSessionCookie: true,
        env,
      }),
    ).toBe(false);
  });

  it('skips GET, webhooks, and bearer-only requests', () => {
    expect(
      cookieMutationOriginAllowed({
        method: 'GET',
        path: '/leads',
        origin: 'https://evil.example',
        hasSessionCookie: true,
        env,
      }),
    ).toBe(true);
    expect(
      cookieMutationOriginAllowed({
        method: 'POST',
        path: '/webhooks/whatsapp',
        origin: 'https://evil.example',
        hasSessionCookie: true,
        env,
      }),
    ).toBe(true);
    expect(
      cookieMutationOriginAllowed({
        method: 'POST',
        path: '/leads',
        origin: 'https://evil.example',
        hasSessionCookie: false,
        env,
      }),
    ).toBe(true);
  });

  it('falls back to Referer origin', () => {
    expect(originFromHeaders(undefined, 'http://localhost:3000/dealer/leads')).toBe('http://localhost:3000');
    expect(originIsAllowed('http://localhost:3000', env)).toBe(true);
  });
});

describe('password reset hashing', () => {
  it('matches only the issued code for that email', () => {
    const secret = 'unit-test-secret-not-for-production';
    const hash = hashResetCode(secret, 'Dealer@Agency.test', '123456');
    expect(resetCodesMatch(hash, hashResetCode(secret, 'dealer@agency.test', '123456'))).toBe(true);
    expect(resetCodesMatch(hash, hashResetCode(secret, 'dealer@agency.test', '000000'))).toBe(false);
    expect(resetCodesMatch(hash, hashResetCode('other-secret', 'dealer@agency.test', '123456'))).toBe(false);
    expect(resetCodesMatch(null, hash)).toBe(false);
  });
});
