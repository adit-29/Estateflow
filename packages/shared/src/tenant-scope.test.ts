import { describe, expect, it } from 'vitest';
import { agencyFromSession, clientTenantWasIgnored } from './tenant-scope';

describe('tenant scope', () => {
  it('uses the session agency and ignores a different browser tenant id', () => {
    expect(agencyFromSession('agency-a', 'agency-b')).toBe('agency-a');
    expect(clientTenantWasIgnored('agency-a', 'agency-b')).toBe(true);
  });

  it('refuses to invent an agency when the session has no membership', () => {
    expect(() => agencyFromSession(undefined, 'agency-b')).toThrow('missing_membership');
  });
});
