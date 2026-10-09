import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { ReconstructionJob, ReconstructionStatus } from '@prisma/client';
import {
  CAPTURE_GUIDANCE,
  SHARE_LINK_MAX_DAYS,
  TOUR_DURATION_LIMITS,
  TOUR_STATUS_LABEL,
  canTransition,
  isJobModelKey,
  tourVideoKey,
  validateTourUpload,
  videoLimits,
  type ProviderCallback,
  type TourJobStatus,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_SETUP_GUIDANCE, TOUR_STORAGE, type TourStorage } from './tour-storage';
import { PROVIDER_SETUP_GUIDANCE, ProviderSubmitError, TOUR_PROVIDER, type TourReconstructionProvider } from './tour-provider';

export interface CreateTourJobInput {
  propertyId: string;
  idempotencyKey: string;
  fileName: string;
  mime: string;
  size: number;
  durationSeconds?: number | null;
  captureNotes?: string | null;
  consent: boolean;
}

export function hashShareToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TourService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TOUR_STORAGE) private readonly storage: TourStorage,
    @Inject(TOUR_PROVIDER) private readonly provider: TourReconstructionProvider,
  ) {}

  status() {
    const limits = videoLimits();
    return {
      storage: { configured: this.storage.configured, label: this.storage.label, setupGuidance: this.storage.configured ? [] : STORAGE_SETUP_GUIDANCE },
      provider: {
        name: this.provider.name,
        configured: this.provider.configured,
        verified: false,
        label: this.provider.label,
        setupGuidance: PROVIDER_SETUP_GUIDANCE,
      },
      limits: { maxBytes: limits.maxBytes, mimeTypes: limits.mimeTypes, extensions: limits.extensions, ...TOUR_DURATION_LIMITS },
      guidance: CAPTURE_GUIDANCE,
      shareLinkMaxDays: SHARE_LINK_MAX_DAYS,
    };
  }

  view(job: ReconstructionJob & { property?: { title: string; locality: string } | null }) {
    return {
      id: job.id,
      propertyId: job.propertyId,
      property: job.property ? { title: job.property.title, locality: job.property.locality } : undefined,
      status: job.status,
      statusLabel: TOUR_STATUS_LABEL[job.status] ?? job.status,
      provider: job.provider,
      errorCategory: job.errorCategory,
      providerMessage: job.providerMessage,
      progress: job.progress,
      fileName: job.fileName,
      mimeType: job.mimeType,
      sizeBytes: job.sizeBytes == null ? null : Number(job.sizeBytes),
      durationSeconds: job.durationSeconds,
      captureNotes: job.captureNotes,
      consentAt: job.consentAt,
      uploadedAt: job.uploadedAt,
      hasVideo: Boolean(job.uploadedAt && job.uploadObjectKey),
      hasModel: Boolean(job.status === 'ready' && job.resultModelKey),
      attachedAt: job.attachedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private async audit(accountId: string | null, action: string, jobId: string, payload: Record<string, unknown>) {
    await this.prisma.auditEvent.create({ data: { accountId, action, entity: 'ReconstructionJob', entityId: jobId, payload: payload as object } });
  }

  private requireStorage() {
    if (!this.storage.configured) {
      throw new ServiceUnavailableException({
        message: 'Private video storage is not configured. Real uploads are disabled.',
        code: 'storage_not_configured',
        setupGuidance: STORAGE_SETUP_GUIDANCE,
      });
    }
  }

  private async owned(agencyId: string, id: string) {
    const job = await this.prisma.reconstructionJob.findFirst({ where: { id, agencyId }, include: { property: { select: { title: true, locality: true } } } });
    if (!job) throw new NotFoundException('Tour job not found');
    return job;
  }

  private async move(job: ReconstructionJob, to: TourJobStatus, data: Partial<ReconstructionJob> = {}) {
    if (!canTransition(job.status, to)) throw new ConflictException(`A ${TOUR_STATUS_LABEL[job.status] ?? job.status} job cannot move to ${TOUR_STATUS_LABEL[to]}.`);
    const updated = await this.prisma.reconstructionJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { ...data, status: to as ReconstructionStatus } as never,
    });
    if (updated.count !== 1) throw new ConflictException('The job changed while this request was running. Refresh and try again.');
    return this.prisma.reconstructionJob.findUniqueOrThrow({ where: { id: job.id }, include: { property: { select: { title: true, locality: true } } } });
  }

  async list(agencyId: string, propertyId?: string) {
    const jobs = await this.prisma.reconstructionJob.findMany({
      where: { agencyId, ...(propertyId ? { propertyId } : {}) },
      include: { property: { select: { title: true, locality: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return jobs.map((j) => this.view(j));
  }

  async get(agencyId: string, id: string) {
    return this.view(await this.owned(agencyId, id));
  }

  async create(agencyId: string, accountId: string, input: CreateTourJobInput) {
    this.requireStorage();
    if (!input.idempotencyKey || input.idempotencyKey.length > 100) throw new BadRequestException('idempotencyKey is required.');
    const existing = await this.prisma.reconstructionJob.findFirst({ where: { agencyId, idempotencyKey: input.idempotencyKey } });
    if (existing) return this.get(agencyId, existing.id);
    const property = await this.prisma.property.findFirst({ where: { id: input.propertyId, agencyId, deletedAt: null }, select: { id: true } });
    if (!property) throw new NotFoundException('Property not found');
    const errors = validateTourUpload({
      name: String(input.fileName ?? ''),
      mime: String(input.mime ?? ''),
      size: Number(input.size),
      durationSeconds: input.durationSeconds ?? null,
      consent: input.consent === true,
    });
    if (errors.length) throw new BadRequestException({ message: errors.join(' '), code: 'invalid_tour_upload' });
    const notes = input.captureNotes?.toString().trim().slice(0, 2000) || null;
    const now = new Date();
    const job = await this.prisma.reconstructionJob.create({
      data: {
        agencyId,
        propertyId: property.id,
        provider: this.provider.name,
        status: 'draft',
        idempotencyKey: input.idempotencyKey,
        fileName: input.fileName.slice(0, 200),
        mimeType: input.mime,
        sizeBytes: BigInt(Math.trunc(input.size)),
        durationSeconds: input.durationSeconds == null ? null : Math.round(input.durationSeconds),
        captureNotes: notes,
        consentAt: now,
        consentAccountId: accountId,
        createdByAccountId: accountId,
        retentionUntil: new Date(now.getTime() + Number(process.env.RECONSTRUCTION_RETENTION_DAYS || 30) * 86_400_000),
      },
    });
    await this.audit(accountId, 'tour.create', job.id, { propertyId: property.id, sizeBytes: Number(job.sizeBytes), consent: true });
    return this.get(agencyId, job.id);
  }

  async uploadUrl(agencyId: string, accountId: string, id: string) {
    this.requireStorage();
    const job = await this.owned(agencyId, id);
    if (job.status !== 'draft' && job.status !== 'uploading') throw new ConflictException('This job already has a video.');
    const key = tourVideoKey(agencyId, job.id, job.fileName ?? 'source.mp4');
    const signed = await this.storage.presignUpload({ key, contentType: job.mimeType!, size: Number(job.sizeBytes) });
    if (job.status === 'draft') await this.move(job, 'uploading', { uploadObjectKey: key });
    await this.audit(accountId, 'tour.upload_url', job.id, { expiresInSeconds: signed.expiresInSeconds });
    return { method: 'PUT' as const, ...signed };
  }

  async completeUpload(agencyId: string, accountId: string, id: string) {
    this.requireStorage();
    let job = await this.owned(agencyId, id);
    if (job.status !== 'uploading' || !job.uploadObjectKey) throw new ConflictException('Request an upload URL first.');
    const stored = await this.storage.head(job.uploadObjectKey);
    if (!stored) throw new ConflictException({ message: 'The video has not arrived in storage yet. Retry the upload.', code: 'upload_not_found' });
    if (stored.size !== Number(job.sizeBytes) || (stored.contentType && stored.contentType !== job.mimeType)) {
      job = await this.move(job, 'failed', { errorCategory: 'upload_mismatch', providerMessage: 'The stored file does not match the declared size or type.' });
      await this.audit(accountId, 'tour.upload_mismatch', job.id, { storedSize: stored.size });
      return this.view(job);
    }
    const uploadedAt = new Date();
    if (!this.provider.configured) {
      job = await this.move(job, 'video_uploaded', {
        uploadedAt,
        providerMessage: 'Stored privately. No reconstruction provider is configured, so the video was not sent for processing.',
      });
      await this.audit(accountId, 'tour.uploaded', job.id, { submitted: false });
      return this.view(job);
    }
    job = await this.move(job, 'video_uploaded', { uploadedAt });
    return this.submitToProvider(job, accountId);
  }

  async submit(agencyId: string, accountId: string, id: string) {
    const job = await this.owned(agencyId, id);
    if (job.status !== 'video_uploaded') throw new ConflictException('Only a stored, unprocessed video can be submitted.');
    if (!this.provider.configured) {
      throw new ServiceUnavailableException({ message: 'No reconstruction provider is configured. Nothing was sent.', code: 'provider_not_configured', setupGuidance: PROVIDER_SETUP_GUIDANCE });
    }
    return this.submitToProvider(job, accountId);
  }

  private async submitToProvider(job: ReconstructionJob, accountId: string) {
    try {
      const { providerJobRef } = await this.provider.submit({ jobId: job.id, videoKey: job.uploadObjectKey!, captureNotes: job.captureNotes });
      const queued = await this.move(job, 'queued', { providerJobRef, provider: this.provider.name, errorCategory: null, providerMessage: null });
      await this.audit(accountId, 'tour.submitted', job.id, { provider: this.provider.name });
      return this.view(queued);
    } catch (error) {
      const category = error instanceof ProviderSubmitError ? error.category : 'provider_error';
      const message = error instanceof ProviderSubmitError ? error.message : 'The reconstruction provider could not be reached. The job was not queued.';
      const failed = await this.move(job, 'failed', { errorCategory: category, providerMessage: message });
      await this.audit(accountId, 'tour.provider_failed', job.id, { category });
      return this.view(failed);
    }
  }

  async applyCallback(providerName: string, event: ProviderCallback) {
    const job = await this.prisma.reconstructionJob.findFirst({ where: { providerJobRef: event.providerJobRef, provider: providerName } });
    if (!job) throw new NotFoundException('Unknown provider job');
    if (job.status === event.status && event.status !== 'processing') return { applied: false, status: job.status };
    if (!canTransition(job.status, event.status)) return { applied: false, status: job.status };
    const data: Partial<ReconstructionJob> = { progress: event.progress ?? job.progress, providerMessage: event.message?.slice(0, 500) ?? null };
    if (event.status === 'ready') {
      if (!event.modelKey || !isJobModelKey(event.modelKey, job.agencyId, job.id)) {
        throw new BadRequestException('A ready callback must include a .glb/.gltf modelKey under this job\'s private prefix.');
      }
      if (this.storage.configured && !(await this.storage.head(event.modelKey))) {
        throw new BadRequestException('The model file was not found in storage.');
      }
      data.resultModelKey = event.modelKey;
      data.progress = 100;
    }
    if (event.status === 'failed') data.errorCategory = 'provider_failed';
    if (event.status === 'needs_more_footage') data.errorCategory = 'needs_more_footage';
    const updated = await this.move(job, event.status, data);
    await this.audit(null, 'tour.provider_callback', job.id, { status: event.status });
    return { applied: true, status: updated.status };
  }

  async media(agencyId: string, id: string) {
    return this.signedMedia(await this.owned(agencyId, id));
  }

  private async signedMedia(job: ReconstructionJob) {
    if (!this.storage.configured) return { model: null, video: null, storageConfigured: false };
    const model = job.status === 'ready' && job.resultModelKey ? await this.storage.presignView(job.resultModelKey, job.resultModelKey.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json') : null;
    const video = job.uploadedAt && job.uploadObjectKey ? await this.storage.presignView(job.uploadObjectKey, job.mimeType ?? undefined) : null;
    return { model, video, storageConfigured: true };
  }

  async attach(agencyId: string, accountId: string, id: string) {
    const job = await this.owned(agencyId, id);
    if (job.status !== 'ready' || !job.resultModelKey) throw new ConflictException('Only a Ready tour can be attached to a property.');
    await this.prisma.$transaction([
      this.prisma.reconstructionJob.updateMany({ where: { agencyId, propertyId: job.propertyId, attachedAt: { not: null } }, data: { attachedAt: null } }),
      this.prisma.reconstructionJob.update({ where: { id: job.id }, data: { attachedAt: new Date() } }),
    ]);
    await this.audit(accountId, 'tour.attach', job.id, { propertyId: job.propertyId });
    return this.get(agencyId, id);
  }

  async detach(agencyId: string, accountId: string, id: string) {
    const job = await this.owned(agencyId, id);
    await this.prisma.reconstructionJob.update({ where: { id: job.id }, data: { attachedAt: null } });
    await this.prisma.tourShareLink.updateMany({ where: { agencyId, jobId: job.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit(accountId, 'tour.detach', job.id, {});
    return this.get(agencyId, id);
  }

  async createShareLink(agencyId: string, accountId: string, id: string, expiresInDays: number) {
    const job = await this.owned(agencyId, id);
    if (job.status !== 'ready' || !job.attachedAt) throw new ConflictException('Attach a Ready tour to its property before sharing it.');
    const days = Math.trunc(Number(expiresInDays));
    if (!Number.isFinite(days) || days < 1 || days > SHARE_LINK_MAX_DAYS) throw new BadRequestException(`Expiry must be 1–${SHARE_LINK_MAX_DAYS} days.`);
    const token = randomBytes(24).toString('base64url');
    const link = await this.prisma.tourShareLink.create({
      data: { agencyId, jobId: job.id, tokenHash: hashShareToken(token), expiresAt: new Date(Date.now() + days * 86_400_000), createdByAccountId: accountId },
    });
    await this.audit(accountId, 'tour.share_link_created', job.id, { linkId: link.id, days });
    return { id: link.id, token, path: `/tours/shared/${token}`, expiresAt: link.expiresAt };
  }

  async listShareLinks(agencyId: string, id: string) {
    await this.owned(agencyId, id);
    const links = await this.prisma.tourShareLink.findMany({ where: { agencyId, jobId: id }, orderBy: { createdAt: 'desc' } });
    return links.map((l) => ({ id: l.id, expiresAt: l.expiresAt, revokedAt: l.revokedAt, viewCount: l.viewCount, lastViewedAt: l.lastViewedAt, createdAt: l.createdAt }));
  }

  async revokeShareLink(agencyId: string, accountId: string, linkId: string) {
    const link = await this.prisma.tourShareLink.findFirst({ where: { id: linkId, agencyId } });
    if (!link) throw new NotFoundException('Share link not found');
    if (!link.revokedAt) await this.prisma.tourShareLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
    await this.audit(accountId, 'tour.share_link_revoked', link.jobId, { linkId });
    return { id: link.id, revoked: true };
  }

  /** Public viewer. Every failure looks the same so tokens cannot be probed. */
  async viewShared(token: string) {
    const notFound = new NotFoundException('This tour link is invalid, expired, or revoked.');
    if (!token || token.length < 20 || token.length > 100) throw notFound;
    const link = await this.prisma.tourShareLink.findUnique({
      where: { tokenHash: hashShareToken(token) },
      include: { job: { include: { property: { select: { title: true, locality: true, deletedAt: true } } } } },
    });
    const job = link?.job;
    if (!link || link.revokedAt || link.expiresAt <= new Date() || !job || job.status !== 'ready' || !job.attachedAt || job.property.deletedAt) throw notFound;
    await this.prisma.tourShareLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } });
    const media = await this.signedMedia(job);
    return {
      property: { title: job.property.title, locality: job.property.locality },
      expiresAt: link.expiresAt,
      model: media.model,
      video: media.video,
    };
  }
}
