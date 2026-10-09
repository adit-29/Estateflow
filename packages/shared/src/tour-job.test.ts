import { describe, expect, it } from 'vitest';
import { canTransition, isJobModelKey, providerCallbackSchema, tourVideoKey, validateTourUpload } from './tour-job';

const ok = { name: 'flat.mp4', mime: 'video/mp4', size: 50_000_000, durationSeconds: 120, consent: true };

describe('validateTourUpload', () => {
  it('accepts a normal walkthrough', () => {
    expect(validateTourUpload(ok)).toEqual([]);
  });

  it('rejects wrong type, oversize, bad duration, and missing consent together', () => {
    const errors = validateTourUpload({ name: 'flat.avi', mime: 'video/x-msvideo', size: 900_000_000, durationSeconds: 5, consent: false });
    expect(errors).toHaveLength(4);
    expect(errors.join(' ')).toMatch(/MP4/);
    expect(errors.join(' ')).toMatch(/under 500 MB/);
    expect(errors.join(' ')).toMatch(/at least 20 seconds/);
    expect(errors.join(' ')).toMatch(/permission/);
  });

  it('rejects a renamed file whose MIME does not match', () => {
    expect(validateTourUpload({ ...ok, mime: 'application/pdf' })).toHaveLength(1);
  });

  it('rejects over-long video and empty files', () => {
    expect(validateTourUpload({ ...ok, durationSeconds: 3600 })[0]).toMatch(/under 30 minutes/);
    expect(validateTourUpload({ ...ok, size: 0 })[0]).toMatch(/empty/);
  });

  it('skips duration when the browser could not read it', () => {
    expect(validateTourUpload({ ...ok, durationSeconds: null })).toEqual([]);
  });
});

describe('tour job transitions', () => {
  it('follows the upload → queue → processing → ready path', () => {
    expect(canTransition('draft', 'uploading')).toBe(true);
    expect(canTransition('uploading', 'video_uploaded')).toBe(true);
    expect(canTransition('video_uploaded', 'queued')).toBe(true);
    expect(canTransition('queued', 'processing')).toBe(true);
    expect(canTransition('processing', 'ready')).toBe(true);
  });

  it('never skips upload or leaves a terminal state', () => {
    expect(canTransition('draft', 'ready')).toBe(false);
    expect(canTransition('draft', 'queued')).toBe(false);
    expect(canTransition('video_uploaded', 'ready')).toBe(false);
    expect(canTransition('ready', 'processing')).toBe(false);
    expect(canTransition('failed', 'queued')).toBe(false);
    expect(canTransition('needs_more_footage', 'ready')).toBe(false);
    expect(canTransition('unavailable', 'ready')).toBe(false);
  });
});

describe('private keys', () => {
  it('scopes videos and models to the agency and job', () => {
    expect(tourVideoKey('a1', 'j1', 'Walk.MOV')).toBe('agencies/a1/tours/j1/source.mov');
    expect(isJobModelKey('agencies/a1/tours/j1/model.glb', 'a1', 'j1')).toBe(true);
    expect(isJobModelKey('agencies/a2/tours/j1/model.glb', 'a1', 'j1')).toBe(false);
    expect(isJobModelKey('agencies/a1/tours/j1/../../a2/model.glb', 'a1', 'j1')).toBe(false);
    expect(isJobModelKey('agencies/a1/tours/j1/model.html', 'a1', 'j1')).toBe(false);
  });

  it('rejects unknown callback fields', () => {
    expect(providerCallbackSchema.safeParse({ providerJobRef: 'x', status: 'ready', extra: 1 }).success).toBe(false);
    expect(providerCallbackSchema.safeParse({ providerJobRef: 'x', status: 'draft' }).success).toBe(false);
  });
});
