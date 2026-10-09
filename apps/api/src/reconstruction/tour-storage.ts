import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const TOUR_STORAGE = Symbol('TOUR_STORAGE');

export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const VIEW_URL_TTL_SECONDS = 10 * 60;

export const STORAGE_SETUP_GUIDANCE = [
  'Create a private S3 bucket with Block Public Access on and SSE encryption (infra/terraform/data.tf does this).',
  'Set S3_BUCKET and S3_REGION on the API only. Do not set AWS access keys; the API task role signs URLs.',
  'Allow browser PUT from the web origin in the bucket CORS rules.',
];

export interface StoredObject {
  size: number;
  contentType: string | null;
}

export interface TourStorage {
  readonly configured: boolean;
  readonly label: string;
  presignUpload(input: { key: string; contentType: string; size: number }): Promise<{ url: string; headers: Record<string, string>; expiresInSeconds: number }>;
  head(key: string): Promise<StoredObject | null>;
  presignView(key: string, contentType?: string): Promise<{ url: string; expiresInSeconds: number }>;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('storage_not_configured');
  }
}

export function readStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  const bucket = env.S3_BUCKET?.trim() || null;
  const region = env.S3_REGION?.trim() || env.AWS_REGION?.trim() || null;
  return { bucket, region, configured: Boolean(bucket && region) };
}

export class UnconfiguredTourStorage implements TourStorage {
  readonly configured = false;
  readonly label = 'Private storage not configured';
  async presignUpload(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
  async head(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
  async presignView(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
}

export class S3TourStorage implements TourStorage {
  readonly configured = true;
  readonly label = 'Private S3 bucket configured';
  private readonly client: S3Client;

  constructor(private readonly bucket: string, region: string, client?: S3Client) {
    this.client = client ?? new S3Client({ region });
  }

  async presignUpload(input: { key: string; contentType: string; size: number }) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.size,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    return { url, headers: { 'Content-Type': input.contentType }, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const out = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: Number(out.ContentLength ?? 0), contentType: out.ContentType ?? null };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || status === 403) return null;
      throw error;
    }
  }

  async presignView(key: string, contentType?: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentType: contentType });
    const url = await getSignedUrl(this.client, command, { expiresIn: VIEW_URL_TTL_SECONDS });
    return { url, expiresInSeconds: VIEW_URL_TTL_SECONDS };
  }
}

export function createTourStorage(env: NodeJS.ProcessEnv = process.env): TourStorage {
  const config = readStorageConfig(env);
  return config.configured ? new S3TourStorage(config.bucket!, config.region!) : new UnconfiguredTourStorage();
}
