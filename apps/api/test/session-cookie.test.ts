import { describe, expect, it } from 'vitest';
import { readSessionToken } from '../src/auth/session-cookie';

describe('session token', () => {
  it('prefers the bearer token and ignores a browser-supplied agency header', () => {
    expect(readSessionToken('Bearer live-token', 'cookie-token')).toBe('live-token');
  });

  it('fails closed when no cookie or bearer token is present', () => {
    expect(readSessionToken(undefined, '  ')).toBeNull();
  });

  it('reads the httpOnly cookie when the browser does not send a bearer token', () => {
    expect(readSessionToken(undefined, 'cookie-token')).toBe('cookie-token');
  });
});
