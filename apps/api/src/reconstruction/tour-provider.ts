import { createHmac, timingSafeEqual } from 'node:crypto';

export const TOUR_PROVIDER = Symbol('TOUR_PROVIDER');

export const PROVIDER_SETUP_GUIDANCE = [
  'No reconstruction vendor has been selected. See docs/reconstruction-provider.md.',
  'After a vendor is chosen and an adapter is written, set RECONSTRUCTION_PROVIDER, RECONSTRUCTION_API_KEY, and RECONSTRUCTION_WEBHOOK_SECRET on the API only.',
  'Until then, uploaded videos are stored privately and are not sent anywhere for processing.',
];

export interface ProviderSubmitInput {
  jobId: string;
  videoKey: string;
  captureNotes: string | null;
}

export interface TourReconstructionProvider {
  readonly name: string;
  readonly configured: boolean;
  readonly label: string;
  submit(input: ProviderSubmitInput): Promise<{ providerJobRef: string }>;
}

export class ProviderSubmitError extends Error {
  constructor(readonly category: string, message: string) {
    super(message);
  }
}

export class NoReconstructionProvider implements TourReconstructionProvider {
  readonly name = 'none';
  readonly configured = false;
  readonly label = 'Reconstruction provider not configured';
  async submit(): Promise<never> {
    throw new ProviderSubmitError('provider_not_configured', 'No reconstruction provider is configured.');
  }
}

/** A provider name and key are set, but no vendor adapter exists in this build. Jobs fail honestly. */
export class UnimplementedVendorProvider implements TourReconstructionProvider {
  readonly configured = true;
  readonly label = 'Configured · adapter not implemented';
  constructor(readonly name: string) {}
  async submit(): Promise<never> {
    throw new ProviderSubmitError(
      'provider_adapter_not_implemented',
      `RECONSTRUCTION_PROVIDER is set to "${this.name}", but this build has no adapter for that vendor. The video was not sent.`,
    );
  }
}

export function createTourProvider(env: NodeJS.ProcessEnv = process.env): TourReconstructionProvider {
  const name = env.RECONSTRUCTION_PROVIDER?.trim();
  if (!name || name === 'mock' || name === 'none' || !env.RECONSTRUCTION_API_KEY?.trim()) return new NoReconstructionProvider();
  return new UnimplementedVendorProvider(name);
}

/** Callbacks sign the raw body: header `x-estateflow-signature: sha256=<hex HMAC>`. */
export function verifyProviderSignature(raw: Buffer | string | undefined, header: string | undefined, secret: string | undefined): boolean {
  if (!secret || !raw || !header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const given = header.slice('sha256='.length);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(expected, 'utf8'));
}
