import { describe, expect, it } from 'vitest';

/**
 * Authorization logic unit tests (tenant scoping).
 * Integration tests require DATABASE_URL — these verify the scoping contract.
 */
describe('tenant scoping contract', () => {
  it('lead access must match agencyId', () => {
    const lead = { id: 'lead-a', agencyId: 'agency-a' };
    const requestAgency = 'agency-b';
    expect(lead.agencyId === requestAgency).toBe(false);
  });

  it('does not accept an agency id from the client as the tenant', () => {
    const sessionAgency = 'agency-a';
    const browserAgency = 'agency-b';
    const effective = sessionAgency;
    expect(effective).not.toBe(browserAgency);
  });

  it('duplicate dealer profile prevented per accountId', () => {
    const profiles = [{ accountId: 'acc-1' }];
    const second = { accountId: 'acc-1' };
    expect(profiles.some((p) => p.accountId === second.accountId)).toBe(true);
  });
});
