import { z } from 'zod';
import { videoLimits } from './reconstruction';

/** Tour job states stored on ReconstructionJob.status. */
export type TourJobStatus =
  | 'draft'
  | 'uploading'
  | 'video_uploaded'
  | 'queued'
  | 'processing'
  | 'needs_more_footage'
  | 'ready'
  | 'failed';

export const TOUR_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  uploading: 'Uploading',
  video_uploaded: 'Video stored · not processed',
  queued: 'Queued',
  processing: 'Processing',
  needs_more_footage: 'Needs more footage',
  ready: 'Ready',
  failed: 'Failed',
  unavailable: 'Provider not configured',
};

const TRANSITIONS: Record<TourJobStatus, TourJobStatus[]> = {
  draft: ['uploading', 'failed'],
  uploading: ['video_uploaded', 'queued', 'failed'],
  video_uploaded: ['queued', 'failed'],
  queued: ['processing', 'ready', 'needs_more_footage', 'failed'],
  processing: ['processing', 'ready', 'needs_more_footage', 'failed'],
  needs_more_footage: [],
  ready: [],
  failed: [],
};

export function canTransition(from: string, to: TourJobStatus): boolean {
  return (TRANSITIONS[from as TourJobStatus] ?? []).includes(to);
}

export const CAPTURE_GUIDANCE = [
  'Move slowly — about one step per second.',
  'Cover every room, including corners and the ceiling line.',
  'Keep the camera steady at chest height; use both hands.',
  'Avoid rapid pans and sudden turns.',
  'Walk through connecting doorways so rooms can be linked.',
  'Turn on lights and open curtains; avoid filming into bright windows.',
  'Keep people, documents, valuables, and personal photos out of frame.',
];

export const TOUR_DURATION_LIMITS = { minSeconds: 20, maxSeconds: 30 * 60 };

export interface TourUploadInput {
  name: string;
  mime: string;
  size: number;
  durationSeconds?: number | null;
  consent: boolean;
}

/** Returns every problem at once so the dealer can fix them together. */
export function validateTourUpload(input: TourUploadInput): string[] {
  const limits = videoLimits();
  const errors: string[] = [];
  const lower = input.name.toLowerCase();
  if (!limits.extensions.some((ext) => lower.endsWith(ext)) || !(limits.mimeTypes as readonly string[]).includes(input.mime)) {
    errors.push('Use an MP4, MOV, or WebM video.');
  }
  if (!Number.isFinite(input.size) || input.size <= 0) errors.push('The file is empty.');
  else if (input.size > limits.maxBytes) errors.push(`Video must be under ${Math.round(limits.maxBytes / 1_000_000)} MB.`);
  if (input.durationSeconds != null) {
    if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < TOUR_DURATION_LIMITS.minSeconds) {
      errors.push(`Video must be at least ${TOUR_DURATION_LIMITS.minSeconds} seconds to cover a room.`);
    } else if (input.durationSeconds > TOUR_DURATION_LIMITS.maxSeconds) {
      errors.push(`Video must be under ${TOUR_DURATION_LIMITS.maxSeconds / 60} minutes.`);
    }
  }
  if (!input.consent) errors.push('Confirm you own or have permission to use this video.');
  return errors;
}

export function tourVideoExtension(name: string): string {
  const lower = name.toLowerCase();
  return lower.endsWith('.mov') ? '.mov' : lower.endsWith('.webm') ? '.webm' : '.mp4';
}

export function tourJobPrefix(agencyId: string, jobId: string) {
  return `agencies/${agencyId}/tours/${jobId}/`;
}

export function tourVideoKey(agencyId: string, jobId: string, fileName: string) {
  return `${tourJobPrefix(agencyId, jobId)}source${tourVideoExtension(fileName)}`;
}

/** A provider-returned model must live under this job's private prefix and be glTF. */
export function isJobModelKey(key: string, agencyId: string, jobId: string): boolean {
  if (key.includes('..') || key.startsWith('/')) return false;
  const lower = key.toLowerCase();
  return key.startsWith(tourJobPrefix(agencyId, jobId)) && (lower.endsWith('.glb') || lower.endsWith('.gltf'));
}

export const providerCallbackSchema = z
  .object({
    providerJobRef: z.string().min(1).max(200),
    status: z.enum(['processing', 'ready', 'needs_more_footage', 'failed']),
    progress: z.number().int().min(0).max(100).optional(),
    modelKey: z.string().max(500).optional(),
    message: z.string().max(500).optional(),
  })
  .strict();

export type ProviderCallback = z.infer<typeof providerCallbackSchema>;

export const SHARE_LINK_MAX_DAYS = 30;
