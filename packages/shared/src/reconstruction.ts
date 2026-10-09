export type TourState =
  | 'no_tour'
  | 'video_required'
  | 'video_uploaded'
  | 'processing_requested'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'unavailable';

export interface ReconstructionJobView {
  id: string;
  propertyId: string;
  state: TourState;
  provider: 'mock' | 'unconfigured';
  assetUrl: string | null;
  approved: boolean;
  published: boolean;
  error?: string;
}

export function reconstructionConfigured(): boolean {
  return Boolean(process.env.RECONSTRUCTION_PROVIDER && process.env.RECONSTRUCTION_PROVIDER !== 'mock' && process.env.RECONSTRUCTION_API_KEY);
}

export function createDemoTour(propertyId: string, sampleAssetUrl?: string | null): ReconstructionJobView {
  if (!sampleAssetUrl) {
    return {
      id: `demo-${propertyId}`,
      propertyId,
      state: 'unavailable',
      provider: 'mock',
      assetUrl: null,
      approved: false,
      published: false,
      error: 'Interactive 3D sample not configured',
    };
  }
  return {
    id: `demo-${propertyId}`,
    propertyId,
    state: 'ready',
    provider: 'mock',
    assetUrl: sampleAssetUrl,
    approved: false,
    published: false,
  };
}

export function publishTour(job: ReconstructionJobView, approve: boolean): ReconstructionJobView {
  if (!approve || job.state !== 'ready' || !job.assetUrl) return { ...job, published: false, approved: false };
  return { ...job, approved: true, published: true };
}

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export function videoLimits() {
  return {
    maxBytes: Number(process.env.RECONSTRUCTION_MAX_BYTES ?? 500_000_000),
    extensions: ['.mp4', '.mov', '.webm'],
    mimeTypes: VIDEO_MIME_TYPES,
  };
}

export function validateVideoUpload(input: { name: string; mime: string; size: number }): { ok: true } | { ok: false; error: string } {
  const limits = videoLimits();
  const lower = input.name.toLowerCase();
  const extensionOk = limits.extensions.some((ext) => lower.endsWith(ext));
  if (!extensionOk || !limits.mimeTypes.includes(input.mime as (typeof VIDEO_MIME_TYPES)[number])) {
    return { ok: false, error: 'Use an MP4, MOV, or WebM video.' };
  }
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > limits.maxBytes) {
    return { ok: false, error: `Video must be under ${Math.round(limits.maxBytes / 1_000_000)} MB.` };
  }
  return { ok: true };
}

export type ReconstructionDecision =
  | { type: 'not_found' }
  | { type: 'duplicate'; jobId: string }
  | { type: 'invalid_video'; error: string }
  | { type: 'create'; status: 'unavailable' | 'failed'; errorCategory: string | null; message: string };

export function reconstructionCreateDecision(input: {
  propertyAgencyId: string | null;
  requestAgencyId: string;
  existingJobId: string | null;
  video: { ok: true } | { ok: false; error: string };
  configured: boolean;
}): ReconstructionDecision {
  if (!input.propertyAgencyId || input.propertyAgencyId !== input.requestAgencyId) return { type: 'not_found' };
  if (input.existingJobId) return { type: 'duplicate', jobId: input.existingJobId };
  if (!input.video.ok) return { type: 'invalid_video', error: input.video.error };
  if (!input.configured) {
    return {
      type: 'create',
      status: 'unavailable',
      errorCategory: 'provider_not_configured',
      message: '3D processing is not configured yet. Your video can be saved as a demo upload, but a real reconstruction cannot be generated in this environment.',
    };
  }
  return {
    type: 'create',
    status: 'failed',
    errorCategory: 'provider_adapter_not_implemented',
    message: 'A reconstruction key is set, but this build has no documented vendor API to call.',
  };
}

export function classifyTourAsset(url: string | null): 'missing' | 'gltf' | 'unsupported' {
  if (!url) return 'missing';
  if (url.startsWith('javascript:') || url.startsWith('data:')) return 'unsupported';
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.glb') || path.endsWith('.gltf')) return 'gltf';
  return 'unsupported';
}

export async function withProviderTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('provider_timeout')), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface ReconstructionProvider {
  readonly name: string;
  createReconstructionJob(input: { propertyId: string; uploadKey: string }): Promise<{
    providerJobRef: string | null;
    status: TourState;
    assetUrl: string | null;
    message: string;
  }>;
  getJobStatus(jobId: string): Promise<{ status: TourState; progress: number | null }>;
  getReconstructionResult(jobId: string): Promise<{ assetUrl: string | null }>;
  cancelJob(jobId: string): Promise<{ supported: boolean }>;
}

export class MockReconstructionProvider implements ReconstructionProvider {
  readonly name = 'mock';

  constructor(private readonly sample?: { propertyId: string; assetUrl: string }) {}

  async createReconstructionJob(input: { propertyId: string }) {
    if (this.sample && input.propertyId === this.sample.propertyId && classifyTourAsset(this.sample.assetUrl) === 'gltf') {
      return {
        providerJobRef: null,
        status: 'ready' as const,
        assetUrl: this.sample.assetUrl,
        message: 'Demo sample asset. This video was not reconstructed.',
      };
    }
    return {
      providerJobRef: null,
      status: 'unavailable' as const,
      assetUrl: null,
      message: '3D processing is not configured yet. Your video can be saved as a demo upload, but a real reconstruction cannot be generated in this environment.',
    };
  }

  async getJobStatus(): Promise<{ status: TourState; progress: number | null }> {
    return { status: 'unavailable', progress: null };
  }

  async getReconstructionResult(): Promise<{ assetUrl: string | null }> {
    return { assetUrl: this.sample?.assetUrl ?? null };
  }

  async cancelJob(): Promise<{ supported: boolean }> {
    return { supported: false };
  }
}

export class ConfiguredReconstructionProvider implements ReconstructionProvider {
  readonly name = 'configured';

  async createReconstructionJob() {
    return {
      providerJobRef: null,
      status: 'failed' as const,
      assetUrl: null,
      message: 'A reconstruction key is set, but this build has no documented vendor API to call.',
    };
  }

  async getJobStatus(): Promise<{ status: TourState; progress: number | null }> {
    return { status: 'failed', progress: null };
  }

  async getReconstructionResult(): Promise<{ assetUrl: string | null }> {
    return { assetUrl: null };
  }

  async cancelJob(): Promise<{ supported: boolean }> {
    return { supported: false };
  }
}

export interface ObjectStorage {
  createUploadUrl(input: { key: string; contentType: string }): Promise<{ url: string | null; reason: string }>;
}

export class UnconfiguredObjectStorage implements ObjectStorage {
  async createUploadUrl(_input: { key: string; contentType: string }): Promise<{ url: string | null; reason: string }> {
    return {
      url: null,
      reason: 'Object storage is not configured. Set S3_BUCKET in the deployment environment. Access keys stay on the server.',
    };
  }
}
