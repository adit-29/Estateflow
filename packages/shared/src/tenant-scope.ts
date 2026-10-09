/**
 * Agency id comes from the server session membership.
 * A tenant id sent by the browser is ignored.
 */
export function agencyFromSession(sessionAgencyId: string | undefined, _clientSupplied?: string | null): string {
  if (!sessionAgencyId) {
    throw new Error('missing_membership');
  }
  return sessionAgencyId;
}

export function clientTenantWasIgnored(sessionAgencyId: string, clientSupplied?: string | null): boolean {
  return Boolean(clientSupplied && clientSupplied !== sessionAgencyId);
}
