'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SecureTourViewer } from '@/components/tour-viewer';
import {
  ApiError,
  api,
  uploadToSignedUrl,
  type TourJob,
  type TourMedia,
  type TourSetupStatus,
  type TourShareLinkRow,
} from '@/lib/api-client';
import { TourUploadWizard, type WizardProperty, type WizardSubmission } from './upload-wizard';
import { SampleTourViewer } from './sample-tour-viewer';

const ACTIVE = new Set(['uploading', 'queued', 'processing']);

function statusVariant(status: string): 'default' | 'muted' | 'outline' {
  if (status === 'ready') return 'default';
  if (status === 'failed' || status === 'needs_more_footage') return 'outline';
  return 'muted';
}

export function LiveTours() {
  const [setup, setSetup] = useState<TourSetupStatus | null>(null);
  const [properties, setProperties] = useState<WizardProperty[]>([]);
  const [jobs, setJobs] = useState<TourJob[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setJobs(await api.listTourJobs());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tour jobs.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [status, props] = await Promise.all([api.tourStatus(), api.listProperties({ pageSize: 100 })]);
        setSetup(status);
        setProperties(props.items.map((p) => ({ id: p.id, title: p.title, locality: p.locality })));
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load tours.');
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (!jobs.some((j) => ACTIVE.has(j.status))) return;
    const timer = setInterval(refresh, 10_000);
    return () => clearInterval(timer);
  }, [jobs, refresh]);

  const upload = async (input: WizardSubmission, onProgress: (f: number) => void) => {
    const job = await api.createTourJob({
      propertyId: input.property.id,
      idempotencyKey: crypto.randomUUID(),
      fileName: input.file.name,
      mime: input.file.type,
      size: input.file.size,
      durationSeconds: input.durationSeconds == null ? null : Math.round(input.durationSeconds),
      captureNotes: input.captureNotes,
      consent: input.consent,
    });
    const signed = await api.tourUploadUrl(job.id);
    await uploadToSignedUrl(signed.url, input.file, signed.headers, onProgress);
    const done = await api.completeTourUpload(job.id);
    await refresh();
    setSelected(done.id);
    return `${done.statusLabel}. ${done.providerMessage ?? ''}`.trim();
  };

  if (error && !setup) return <p className="text-sm text-destructive">{error}</p>;
  if (!setup) return <p className="text-sm text-muted-foreground">Loading tours…</p>;

  const selectedJob = jobs.find((j) => j.id === selected) ?? null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">3D tours</h2>
        <p className="text-sm text-muted-foreground">Upload a walkthrough video, track processing, and share finished tours with buyers.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SetupCard title="Private video storage" configured={setup.storage.configured} label={setup.storage.label} guidance={setup.storage.setupGuidance} />
        <SetupCard title="Reconstruction provider" configured={setup.provider.configured} label={setup.provider.label} guidance={setup.provider.setupGuidance} />
      </div>

      <TourUploadWizard
        mode="live"
        properties={properties}
        maxBytes={setup.limits.maxBytes}
        disabledReason={
          setup.storage.configured
            ? null
            : 'Real uploads are disabled because private storage is not configured on the server. Nothing can be uploaded until S3_BUCKET and S3_REGION are set for the API.'
        }
        onSubmit={upload}
      />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Tour jobs</h3>
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
        </div>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tour jobs yet.</p>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {jobs.map((j) => (
              <li key={j.id}>
                <button type="button" onClick={() => setSelected(j.id)} className={`flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm ${selected === j.id ? 'bg-muted' : ''}`}>
                  <span>
                    <span className="font-medium">{j.property?.title ?? 'Property'}</span>
                    <span className="text-muted-foreground"> · {j.fileName ?? 'no file'} · {new Date(j.createdAt).toLocaleString('en-IN')}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {j.attachedAt ? <Badge variant="outline">On listing</Badge> : null}
                    <Badge variant={statusVariant(j.status)}>{j.statusLabel}{j.progress != null && ACTIVE.has(j.status) ? ` · ${j.progress}%` : ''}</Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedJob ? <JobDetail key={selectedJob.id} job={selectedJob} setup={setup} onChanged={refresh} /> : null}

      <section className="space-y-2">
        <Button variant="outline" size="sm" onClick={() => setShowSample((v) => !v)}>{showSample ? 'Hide' : 'Show'} sample viewer</Button>
        {showSample ? <SampleTourViewer /> : null}
      </section>
    </div>
  );
}

function SetupCard({ title, configured, label, guidance }: { title: string; configured: boolean; label: string; guidance: string[] }) {
  return (
    <div className="space-y-2 rounded-2xl border p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <Badge variant={configured ? 'muted' : 'outline'}>{label}</Badge>
      </div>
      {!configured && guidance.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">{guidance.map((g) => <li key={g}>{g}</li>)}</ul>
      ) : null}
    </div>
  );
}

function JobDetail({ job, setup, onChanged }: { job: TourJob; setup: TourSetupStatus; onChanged: () => Promise<void> }) {
  const [media, setMedia] = useState<TourMedia | null>(null);
  const [links, setLinks] = useState<TourShareLinkRow[]>([]);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (job.status === 'ready') setLinks(await api.tourShareLinks(job.id).catch(() => []));
  }, [job.id, job.status]);

  useEffect(() => {
    if (job.hasVideo || job.hasModel) api.tourMedia(job.id).then(setMedia).catch(() => setMedia(null));
    loadLinks();
  }, [job.id, job.hasVideo, job.hasModel, loadLinks]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await onChanged();
      await loadLinks();
    } catch (e) {
      setMessage(e instanceof ApiError || e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border p-4 text-sm" aria-label="Tour job detail">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{job.property?.title ?? 'Tour job'}</h3>
        <Badge variant={statusVariant(job.status)}>{job.statusLabel}</Badge>
      </div>
      <dl className="grid grid-cols-[140px_1fr] gap-y-1">
        <dt className="text-muted-foreground">Provider</dt><dd>{job.provider === 'none' ? 'Not configured' : job.provider}</dd>
        <dt className="text-muted-foreground">Consent recorded</dt><dd>{job.consentAt ? new Date(job.consentAt).toLocaleString('en-IN') : 'No'}</dd>
        <dt className="text-muted-foreground">Uploaded</dt><dd>{job.uploadedAt ? new Date(job.uploadedAt).toLocaleString('en-IN') : 'Not yet'}</dd>
        {job.progress != null ? (<><dt className="text-muted-foreground">Provider progress</dt><dd>{job.progress}%</dd></>) : null}
        {job.captureNotes ? (<><dt className="text-muted-foreground">Capture notes</dt><dd>{job.captureNotes}</dd></>) : null}
      </dl>
      {job.providerMessage ? <p className={job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>{job.providerMessage}</p> : null}
      {job.status === 'needs_more_footage' ? <p>The provider could not build a complete model. Film the missing areas and upload a new video.</p> : null}
      {job.status === 'uploading' ? <p className="text-muted-foreground">Waiting for the upload to finish. If the tab was closed, upload the video again as a new job.</p> : null}

      {job.status === 'video_uploaded' ? (
        <Button
          disabled={busy || !setup.provider.configured}
          onClick={() => act(() => api.submitTourJob(job.id))}
          title={setup.provider.configured ? undefined : 'No reconstruction provider is configured'}
        >
          Send for processing
        </Button>
      ) : null}

      {media && (media.model || media.video) ? <SecureTourViewer model={media.model} video={media.video} /> : null}

      {job.status === 'ready' ? (
        <div className="space-y-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {job.attachedAt ? (
              <>
                <Badge variant="outline">Attached to property</Badge>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.detachTour(job.id))}>Detach (revokes share links)</Button>
              </>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => act(() => api.attachTour(job.id))}>Attach to property</Button>
            )}
          </div>
          {job.attachedAt ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  Link expires in
                  <select className="rounded-md border bg-background px-2 py-1" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                    {[1, 3, 7, 14, setup.shareLinkMaxDays].filter((v, i, a) => a.indexOf(v) === i).map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
                  </select>
                </label>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const link = await api.createTourShareLink(job.id, days);
                      setNewLink(`${window.location.origin}${link.path}`);
                    })
                  }
                >
                  Create share link
                </Button>
              </div>
              {newLink ? (
                <p className="break-all rounded-md bg-muted px-3 py-2 text-xs">
                  {newLink}
                  <br />
                  <span className="text-muted-foreground">Copy it now. Only a hash is stored, so it cannot be shown again.</span>
                </p>
              ) : null}
              {links.length > 0 ? (
                <ul className="space-y-1 text-xs">
                  {links.map((l) => {
                    const expired = new Date(l.expiresAt) <= new Date();
                    return (
                      <li key={l.id} className="flex flex-wrap items-center gap-2">
                        <span>Created {new Date(l.createdAt).toLocaleDateString('en-IN')} · {l.revokedAt ? 'Revoked' : expired ? 'Expired' : `Expires ${new Date(l.expiresAt).toLocaleDateString('en-IN')}`} · {l.viewCount} view{l.viewCount === 1 ? '' : 's'}</span>
                        {!l.revokedAt && !expired ? <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.revokeTourShareLink(l.id))}>Revoke</Button> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {message ? <p className="text-destructive" role="alert">{message}</p> : null}
    </section>
  );
}
