import { describe, expect, it } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import { S3TourStorage, UnconfiguredTourStorage, createTourStorage, readStorageConfig } from '../src/reconstruction/tour-storage';
import { NoReconstructionProvider, UnimplementedVendorProvider, createTourProvider } from '../src/reconstruction/tour-provider';

// Presigning is local computation; no request reaches AWS. These stand in for task-role session credentials.
const client = new S3Client({
  region: 'ap-south-1',
  credentials: { accessKeyId: 'ASIA' + 'TEST'.repeat(4), secretAccessKey: 'test-secret-never-in-url', sessionToken: 'session' },
});

describe('private tour storage', () => {
  it('is unconfigured without a bucket and region', () => {
    expect(readStorageConfig({}).configured).toBe(false);
    expect(createTourStorage({})).toBeInstanceOf(UnconfiguredTourStorage);
    expect(createTourStorage({ S3_BUCKET: 'b', S3_REGION: 'ap-south-1' })).toBeInstanceOf(S3TourStorage);
  });

  it('issues short-lived upload URLs bound to key, type, and size without exposing the secret key', async () => {
    const storage = new S3TourStorage('ef-media', 'ap-south-1', client);
    const signed = await storage.presignUpload({ key: 'agencies/a1/tours/j1/source.mp4', contentType: 'video/mp4', size: 1234 });
    const url = new URL(signed.url);
    expect(url.hostname).toContain('ef-media');
    expect(url.pathname).toContain('agencies/a1/tours/j1/source.mp4');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toMatch(/content-length/);
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toMatch(/content-type/);
    expect(signed.url).not.toContain('test-secret-never-in-url');
  });

  it('issues view URLs that expire in ten minutes', async () => {
    const storage = new S3TourStorage('ef-media', 'ap-south-1', client);
    const signed = await storage.presignView('agencies/a1/tours/j1/model.glb', 'model/gltf-binary');
    expect(new URL(signed.url).searchParams.get('X-Amz-Expires')).toBe('600');
  });
});

describe('reconstruction provider selection', () => {
  it('stays unconfigured for mock/none or without a key', () => {
    expect(createTourProvider({})).toBeInstanceOf(NoReconstructionProvider);
    expect(createTourProvider({ RECONSTRUCTION_PROVIDER: 'mock', RECONSTRUCTION_API_KEY: 'k' })).toBeInstanceOf(NoReconstructionProvider);
    expect(createTourProvider({ RECONSTRUCTION_PROVIDER: 'acme' })).toBeInstanceOf(NoReconstructionProvider);
  });

  it('fails honestly when a vendor is named but no adapter exists', async () => {
    const provider = createTourProvider({ RECONSTRUCTION_PROVIDER: 'acme', RECONSTRUCTION_API_KEY: 'k' });
    expect(provider).toBeInstanceOf(UnimplementedVendorProvider);
    await expect(provider.submit({ jobId: 'j', videoKey: 'k', captureNotes: null })).rejects.toMatchObject({ category: 'provider_adapter_not_implemented' });
  });
});
