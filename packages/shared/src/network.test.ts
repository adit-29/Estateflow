import { describe, expect, it } from 'vitest';
import { inviteCanBeAcceptedBy } from './network';

describe('inviteCanBeAcceptedBy', () => {
  it('requires a matching invitee email', () => {
    expect(inviteCanBeAcceptedBy('a@agency.test', 'a@agency.test')).toBe(true);
    expect(inviteCanBeAcceptedBy('A@Agency.Test', 'a@agency.test')).toBe(true);
    expect(inviteCanBeAcceptedBy('a@agency.test', 'other@agency.test')).toBe(false);
  });

  it('rejects phone-only or missing invitee email', () => {
    expect(inviteCanBeAcceptedBy(null, 'a@agency.test')).toBe(false);
    expect(inviteCanBeAcceptedBy(undefined, 'a@agency.test')).toBe(false);
    expect(inviteCanBeAcceptedBy('', 'a@agency.test')).toBe(false);
  });
});
