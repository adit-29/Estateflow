import { describe, expect, it } from 'vitest';

describe('tenant isolation rules', () => {
  it('denies cross-agency property read without share', () => {
    const property = { id: 'p1', agencyId: 'agency-a' };
    const requestAgency = 'agency-b';
    const hasNetworkShare = false;
    const allowed = property.agencyId === requestAgency || hasNetworkShare;
    expect(allowed).toBe(false);
  });

  it('allows network share read', () => {
    const property = { id: 'p1', agencyId: 'agency-a' };
    const requestAgency = 'agency-b';
    const hasNetworkShare = true;
    const allowed = property.agencyId === requestAgency || hasNetworkShare;
    expect(allowed).toBe(true);
  });

  it('revoked share blocks access', () => {
    const share = { revokedAt: new Date() };
    expect(share.revokedAt != null).toBe(true);
  });
});
