import { createHmac, timingSafeEqual } from 'crypto';

/** Meta signs the exact request bytes. Pass the raw body, never a re-serialised JSON object. */
export function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string | undefined,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function assertTenant(recordAgencyId: string, sessionAgencyId: string): boolean {
  return recordAgencyId === sessionAgencyId;
}
