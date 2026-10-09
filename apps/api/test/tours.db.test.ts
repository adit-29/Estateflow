/**
 * Runs against a real Postgres when TEST_DATABASE_URL is set (migrations applied). Skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../src/prisma/prisma.service';
import { TourService } from '../src/reconstruction/tour.service';
import { UnconfiguredTourStorage, type StoredObject, type TourStorage } from '../src/reconstruction/tour-storage';
import {
  NoReconstructionProvider,
  ProviderSubmitError,
  UnimplementedVendorProvider,
  verifyProviderSignature,
  type TourReconstructionProvider,
} from '../src/reconstruction/tour-provider';

const url = process.env.TEST_DATABASE_URL;
const run = describe.skipIf(!url);

async function statusOf(p: Promise<unknown>) {
  try {
    await p;
    return 200;
  } catch (e) {
    return e instanceof HttpException ? e.getStatus() : 500;
  }
}

class FakeStorage implements TourStorage {
  readonly configured = true;
  readonly label = 'fake';
  objects = new Map<string, StoredObject>();
  async presignUpload(input: { key: string; contentType: string; size: number }) {
    return { url: `https://fake-bucket.invalid/${input.key}?sig=put`, headers: { 'Content-Type': input.contentType }, expiresInSeconds: 900 };
  }
  async head(key: string) {
    return this.objects.get(key) ?? null;
  }
  async presignView(key: string) {
    return { url: `https://fake-bucket.invalid/${key}?sig=get`, expiresInSeconds: 600 };
  }
}

class FakeProvider implements TourReconstructionProvider {
  readonly name = 'fakevendor';
  readonly configured = true;
  readonly label = 'fake';
  fail = false;
  submitted: string[] = [];
  async submit(input: { jobId: string }) {
    if (this.fail) throw new ProviderSubmitError('provider_rejected', 'Vendor rejected the video.');
    this.submitted.push(input.jobId);
    return { providerJobRef: `ref-${input.jobId}` };
  }
}

run('Phase 15 tours against Postgres', () => {
  let prisma: PrismaService;
  let tours: TourService;
  const ids = {} as Record<'agencyA' | 'agencyB' | 'ownerA' | 'ownerB' | 'propA' | 'propA2' | 'propB', string>;
  const storage = new FakeStorage();
  const provider = new FakeProvider();
  let n = 0;
  const input = (propertyId: string, over: Record<string, unknown> = {}) => ({
    propertyId,
    idempotencyKey: `k-${++n}`,
    fileName: 'walk.mp4',
    mime: 'video/mp4',
    size: 40_000_000,
    durationSeconds: 90,
    captureNotes: 'Living room then kitchen',
    consent: true,
    ...over,
  });

  async function uploadedJob(agencyId: string, accountId: string, propertyId: string) {
    const job = await tours.create(agencyId, accountId, input(propertyId));
    await tours.uploadUrl(agencyId, accountId, job.id);
    const row = await prisma.reconstructionJob.findUniqueOrThrow({ where: { id: job.id } });
    storage.objects.set(row.uploadObjectKey!, { size: 40_000_000, contentType: 'video/mp4' });
    return tours.completeUpload(agencyId, accountId, job.id);
  }

  async function readyJob() {
    const job = await uploadedJob(ids.agencyA, ids.ownerA, ids.propA);
    const modelKey = `agencies/${ids.agencyA}/tours/${job.id}/model.glb`;
    storage.objects.set(modelKey, { size: 1000, contentType: 'model/gltf-binary' });
    await tours.applyCallback('fakevendor', { providerJobRef: `ref-${job.id}`, status: 'ready', modelKey });
    return job.id;
  }

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } }) as unknown as PrismaService;
    tours = new TourService(prisma, storage, provider);
    await prisma.$executeRawUnsafe(
      'TRUNCATE "TourShareLink","ReconstructionJob","AuditEvent","Property","DealerMembership","Agency","Account" CASCADE',
    );
    const mk = (email: string) => prisma.account.create({ data: { subjectId: `local:${email}`, email, role: 'dealer', emailVerified: true } });
    const [ownerA, ownerB] = await Promise.all([mk('ta@example.test'), mk('tb@example.test')]);
    const agencyA = await prisma.agency.create({ data: { name: 'Tours A' } });
    const agencyB = await prisma.agency.create({ data: { name: 'Tours B' } });
    await prisma.dealerMembership.createMany({ data: [{ agencyId: agencyA.id, accountId: ownerA.id, role: 'owner' }, { agencyId: agencyB.id, accountId: ownerB.id, role: 'owner' }] });
    const prop = (agencyId: string, title: string) =>
      prisma.property.create({ data: { agencyId, title, locality: 'Dwarka', addressText: 'Flat 12, private address', propertyType: 'flat', transactionType: 'sale' } });
    const [propA, propA2, propB] = await Promise.all([prop(agencyA.id, 'A 3BHK'), prop(agencyA.id, 'A 2BHK'), prop(agencyB.id, 'B flat')]);
    Object.assign(ids, { agencyA: agencyA.id, agencyB: agencyB.id, ownerA: ownerA.id, ownerB: ownerB.id, propA: propA.id, propA2: propA2.id, propB: propB.id });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('refuses real uploads with a setup state when private storage is not configured', async () => {
    const unconfigured = new TourService(prisma, new UnconfiguredTourStorage(), new NoReconstructionProvider());
    expect(unconfigured.status().storage).toMatchObject({ configured: false });
    expect(unconfigured.status().storage.setupGuidance.length).toBeGreaterThan(0);
    expect(await statusOf(unconfigured.create(ids.agencyA, ids.ownerA, input(ids.propA)))).toBe(503);
    expect(await prisma.reconstructionJob.count()).toBe(0);
  });

  it('validates the upload and requires consent on the server', async () => {
    expect(await statusOf(tours.create(ids.agencyA, ids.ownerA, input(ids.propA, { consent: false })))).toBe(400);
    expect(await statusOf(tours.create(ids.agencyA, ids.ownerA, input(ids.propA, { mime: 'text/html', fileName: 'x.html' })))).toBe(400);
    expect(await statusOf(tours.create(ids.agencyA, ids.ownerA, input(ids.propA, { size: 2_000_000_000 })))).toBe(400);
    expect(await statusOf(tours.create(ids.agencyA, ids.ownerA, input(ids.propA, { durationSeconds: 4 })))).toBe(400);
  });

  it('never lets one agency create or read jobs for another agency', async () => {
    expect(await statusOf(tours.create(ids.agencyA, ids.ownerA, input(ids.propB)))).toBe(404);
    const job = await tours.create(ids.agencyA, ids.ownerA, input(ids.propA));
    expect(await statusOf(tours.get(ids.agencyB, job.id))).toBe(404);
    expect(await statusOf(tours.uploadUrl(ids.agencyB, ids.ownerB, job.id))).toBe(404);
    expect(await statusOf(tours.media(ids.agencyB, job.id))).toBe(404);
    expect(await statusOf(tours.attach(ids.agencyB, ids.ownerB, job.id))).toBe(404);
    expect((await tours.list(ids.agencyB)).map((j) => j.id)).not.toContain(job.id);
  });

  it('is idempotent on the client key', async () => {
    const body = input(ids.propA);
    const a = await tours.create(ids.agencyA, ids.ownerA, body);
    const b = await tours.create(ids.agencyA, ids.ownerA, body);
    expect(a.id).toBe(b.id);
  });

  it('records consent and moves draft → uploading → queued only after storage confirms the file', async () => {
    const job = await tours.create(ids.agencyA, ids.ownerA, input(ids.propA));
    expect(job.status).toBe('draft');
    expect(job.consentAt).not.toBeNull();
    const signed = await tours.uploadUrl(ids.agencyA, ids.ownerA, job.id);
    expect(signed.url).toContain(`agencies/${ids.agencyA}/tours/${job.id}/source.mp4`);
    expect((await tours.get(ids.agencyA, job.id)).status).toBe('uploading');
    expect(await statusOf(tours.completeUpload(ids.agencyA, ids.ownerA, job.id))).toBe(409);
    const row = await prisma.reconstructionJob.findUniqueOrThrow({ where: { id: job.id } });
    storage.objects.set(row.uploadObjectKey!, { size: 40_000_000, contentType: 'video/mp4' });
    const done = await tours.completeUpload(ids.agencyA, ids.ownerA, job.id);
    expect(done.status).toBe('queued');
    expect(provider.submitted).toContain(job.id);
    expect(await statusOf(tours.uploadUrl(ids.agencyA, ids.ownerA, job.id))).toBe(409);
  });

  it('fails the job when the stored object does not match the declared file', async () => {
    const job = await tours.create(ids.agencyA, ids.ownerA, input(ids.propA));
    await tours.uploadUrl(ids.agencyA, ids.ownerA, job.id);
    const row = await prisma.reconstructionJob.findUniqueOrThrow({ where: { id: job.id } });
    storage.objects.set(row.uploadObjectKey!, { size: 1, contentType: 'text/html' });
    const done = await tours.completeUpload(ids.agencyA, ids.ownerA, job.id);
    expect(done).toMatchObject({ status: 'failed', errorCategory: 'upload_mismatch' });
  });

  it('keeps the video stored but unprocessed when no provider is configured', async () => {
    const svc = new TourService(prisma, storage, new NoReconstructionProvider());
    const job = await svc.create(ids.agencyA, ids.ownerA, input(ids.propA));
    await svc.uploadUrl(ids.agencyA, ids.ownerA, job.id);
    const row = await prisma.reconstructionJob.findUniqueOrThrow({ where: { id: job.id } });
    storage.objects.set(row.uploadObjectKey!, { size: 40_000_000, contentType: 'video/mp4' });
    const done = await svc.completeUpload(ids.agencyA, ids.ownerA, job.id);
    expect(done.status).toBe('video_uploaded');
    expect(done.providerMessage).toMatch(/not sent/);
    expect(await statusOf(svc.submit(ids.agencyA, ids.ownerA, job.id))).toBe(503);
  });

  it('records provider failure honestly instead of queueing', async () => {
    provider.fail = true;
    try {
      const done = await uploadedJob(ids.agencyA, ids.ownerA, ids.propA);
      expect(done).toMatchObject({ status: 'failed', errorCategory: 'provider_rejected', providerMessage: 'Vendor rejected the video.' });
    } finally {
      provider.fail = false;
    }
    const svc = new TourService(prisma, storage, new UnimplementedVendorProvider('acme'));
    const job = await svc.create(ids.agencyA, ids.ownerA, input(ids.propA));
    await svc.uploadUrl(ids.agencyA, ids.ownerA, job.id);
    const row = await prisma.reconstructionJob.findUniqueOrThrow({ where: { id: job.id } });
    storage.objects.set(row.uploadObjectKey!, { size: 40_000_000, contentType: 'video/mp4' });
    expect(await svc.completeUpload(ids.agencyA, ids.ownerA, job.id)).toMatchObject({ status: 'failed', errorCategory: 'provider_adapter_not_implemented' });
  });

  it('applies provider callbacks through the state machine only', async () => {
    const job = await uploadedJob(ids.agencyA, ids.ownerA, ids.propA);
    const ref = `ref-${job.id}`;
    expect(await tours.applyCallback('fakevendor', { providerJobRef: ref, status: 'processing', progress: 40 })).toMatchObject({ applied: true });
    expect(await statusOf(tours.applyCallback('fakevendor', { providerJobRef: ref, status: 'ready' }))).toBe(400);
    expect(await statusOf(tours.applyCallback('fakevendor', { providerJobRef: ref, status: 'ready', modelKey: `agencies/${ids.agencyB}/tours/${job.id}/model.glb` }))).toBe(400);
    expect(await statusOf(tours.applyCallback('otherprovider', { providerJobRef: ref, status: 'failed' }))).toBe(404);
    expect(await tours.applyCallback('fakevendor', { providerJobRef: ref, status: 'needs_more_footage', message: 'Kitchen not covered' })).toMatchObject({ applied: true, status: 'needs_more_footage' });
    expect(await tours.applyCallback('fakevendor', { providerJobRef: ref, status: 'processing' })).toMatchObject({ applied: false });
    expect((await tours.get(ids.agencyA, job.id)).providerMessage).toBe('Kitchen not covered');
  });

  it('verifies callback signatures over the raw body', () => {
    const raw = Buffer.from('{"providerJobRef":"x","status":"ready"}');
    const sig = `sha256=${createHmac('sha256', 's3cret').update(raw).digest('hex')}`;
    expect(verifyProviderSignature(raw, sig, 's3cret')).toBe(true);
    expect(verifyProviderSignature(raw, sig, 'other')).toBe(false);
    expect(verifyProviderSignature(raw, sig, undefined)).toBe(false);
    expect(verifyProviderSignature(Buffer.from('{}'), sig, 's3cret')).toBe(false);
  });

  it('attaches only Ready tours, one per property', async () => {
    const pending = await tours.create(ids.agencyA, ids.ownerA, input(ids.propA));
    expect(await statusOf(tours.attach(ids.agencyA, ids.ownerA, pending.id))).toBe(409);
    const first = await readyJob();
    const second = await readyJob();
    expect((await tours.attach(ids.agencyA, ids.ownerA, first)).attachedAt).not.toBeNull();
    await tours.attach(ids.agencyA, ids.ownerA, second);
    expect((await tours.get(ids.agencyA, first)).attachedAt).toBeNull();
    expect((await tours.get(ids.agencyA, second)).attachedAt).not.toBeNull();
    const media = await tours.media(ids.agencyA, second);
    expect(media.model?.url).toContain('model.glb?sig=get');
    expect(media.video?.url).toContain('source.mp4?sig=get');
  });

  it('shares through expiring, revocable, hashed links that expose no private details', async () => {
    const jobId = await readyJob();
    expect(await statusOf(tours.createShareLink(ids.agencyA, ids.ownerA, jobId, 7))).toBe(409);
    await tours.attach(ids.agencyA, ids.ownerA, jobId);
    expect(await statusOf(tours.createShareLink(ids.agencyA, ids.ownerA, jobId, 90))).toBe(400);
    expect(await statusOf(tours.createShareLink(ids.agencyB, ids.ownerB, jobId, 7))).toBe(404);
    const link = await tours.createShareLink(ids.agencyA, ids.ownerA, jobId, 7);
    const stored = await prisma.tourShareLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(stored.tokenHash).not.toBe(link.token);
    const view = await tours.viewShared(link.token);
    expect(view.property).toEqual({ title: 'A 3BHK', locality: 'Dwarka' });
    expect(JSON.stringify(view)).not.toMatch(/private address|agencyId/);
    expect(view.model?.url).toContain('model.glb');
    expect(await statusOf(tours.viewShared('x'.repeat(32)))).toBe(404);
    expect(await statusOf(tours.revokeShareLink(ids.agencyB, ids.ownerB, link.id))).toBe(404);
    await tours.revokeShareLink(ids.agencyA, ids.ownerA, link.id);
    expect(await statusOf(tours.viewShared(link.token))).toBe(404);

    const expiring = await tours.createShareLink(ids.agencyA, ids.ownerA, jobId, 1);
    await prisma.tourShareLink.update({ where: { id: expiring.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await statusOf(tours.viewShared(expiring.token))).toBe(404);

    const detached = await tours.createShareLink(ids.agencyA, ids.ownerA, jobId, 1);
    await tours.detach(ids.agencyA, ids.ownerA, jobId);
    expect(await statusOf(tours.viewShared(detached.token))).toBe(404);
  });
});
