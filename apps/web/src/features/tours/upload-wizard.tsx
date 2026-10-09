'use client';

import { useEffect, useState } from 'react';
import { CAPTURE_GUIDANCE, TOUR_DURATION_LIMITS, validateTourUpload, videoLimits } from '@estateflow/shared';
import { Button } from '@/components/ui/button';

export interface WizardProperty {
  id: string;
  title: string;
  locality: string;
}

export interface WizardSubmission {
  property: WizardProperty;
  file: File;
  durationSeconds: number | null;
  captureNotes: string;
  consent: true;
}

const STEPS = ['Property', 'Capture guide', 'Video', 'Notes', 'Review', 'Upload'] as const;

/** Reads duration from metadata in the browser. Returns null if the browser cannot decode the file. */
export function readVideoDuration(file: File, timeoutMs = 8000): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}

function formatBytes(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.ceil(n / 1000)} KB`;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

export function TourUploadWizard({
  properties,
  mode,
  disabledReason,
  maxBytes,
  onSubmit,
}: {
  properties: WizardProperty[];
  mode: 'demo' | 'live';
  disabledReason?: string | null;
  maxBytes?: number;
  onSubmit: (input: WizardSubmission, onProgress: (fraction: number) => void) => Promise<string>;
}) {
  const [step, setStep] = useState(0);
  const [propertyId, setPropertyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [probing, setProbing] = useState(false);
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const property = properties.find((p) => p.id === propertyId) ?? null;
  const limitBytes = maxBytes ?? videoLimits().maxBytes;
  const fileErrors = file
    ? validateTourUpload({ name: file.name, mime: file.type || 'application/octet-stream', size: file.size > 0 ? 1 : 0, durationSeconds: duration, consent: true }).concat(
        file.size > limitBytes ? [`Video must be under ${Math.round(limitBytes / 1_000_000)} MB.`] : [],
      )
    : [];
  const uniqueFileErrors = fileErrors;

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setProbing(true);
    setDuration(null);
    readVideoDuration(file).then((d) => {
      if (cancelled) return;
      setDuration(d);
      setProbing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const reset = () => {
    setStep(0);
    setFile(null);
    setDuration(null);
    setNotes('');
    setConsent(false);
    setProgress(null);
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    if (!property || !file || !consent) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const message = await onSubmit({ property, file, durationSeconds: duration, captureNotes: notes.trim(), consent: true }, setProgress);
      setResult(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      setProgress(null);
    } finally {
      setBusy(false);
    }
  };

  if (disabledReason) {
    return <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{disabledReason}</div>;
  }

  return (
    <section className="space-y-4 rounded-2xl border p-4" aria-label="Upload a walkthrough video">
      <ol className="flex flex-wrap gap-3 text-xs">
        {STEPS.map((label, index) => (
          <li key={label} aria-current={index === step ? 'step' : undefined} className={index === step ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3 text-sm">
          {properties.length === 0 ? (
            <p className="text-muted-foreground">Add a property to inventory first. Tours are always attached to one of your own properties.</p>
          ) : (
            <label className="block space-y-1">
              <span className="font-medium">Which property is this video of?</span>
              <select className="w-full rounded-md border bg-background px-3 py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">Select a property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} · {p.locality}</option>
                ))}
              </select>
            </label>
          )}
          <Button disabled={!property} onClick={() => setStep(1)}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3 text-sm">
          <p className="font-medium">How to film for a usable tour</p>
          <ul className="list-disc space-y-1 pl-5">
            {CAPTURE_GUIDANCE.map((g) => <li key={g}>{g}</li>)}
          </ul>
          <p className="text-xs text-muted-foreground">
            A normal video does not always produce an accurate 3D model. Coverage, lighting, and motion decide the result, and a provider may ask for more footage.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)}>I have a video</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            MP4, MOV, or WebM · up to {Math.round(limitBytes / 1_000_000)} MB · {TOUR_DURATION_LIMITS.minSeconds} seconds to {TOUR_DURATION_LIMITS.maxSeconds / 60} minutes.
          </p>
          <input
            aria-label="Walkthrough video"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p>
              {file.name} · {formatBytes(file.size)} · {probing ? 'reading duration…' : duration != null ? formatDuration(duration) : 'duration not readable in this browser (the server still checks size and type)'}
            </p>
          ) : null}
          {uniqueFileErrors.length > 0 ? (
            <ul className="space-y-1 text-destructive">{uniqueFileErrors.map((e) => <li key={e}>{e}</li>)}</ul>
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!file || probing || uniqueFileErrors.length > 0} onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">Capture notes (optional)</span>
            <textarea
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
              maxLength={2000}
              placeholder="Room order, anything missed, lighting issues…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">Do not include owner phone numbers or other personal details.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)}>Review</Button>
          </div>
        </div>
      )}

      {step === 4 && property && file && (
        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-[120px_1fr] gap-y-1">
            <dt className="text-muted-foreground">Property</dt><dd>{property.title} · {property.locality}</dd>
            <dt className="text-muted-foreground">Video</dt><dd>{file.name} · {formatBytes(file.size)}{duration != null ? ` · ${formatDuration(duration)}` : ''}</dd>
            <dt className="text-muted-foreground">Notes</dt><dd>{notes.trim() || 'None'}</dd>
            <dt className="text-muted-foreground">Destination</dt>
            <dd>{mode === 'live' ? 'Your private storage bucket through a short-lived signed URL.' : 'Nowhere. Demo mode keeps the file in this browser tab and uploads nothing.'}</dd>
          </dl>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I own this video or have the owner&apos;s permission to use it, it was filmed with the occupant&apos;s consent, and it shows no documents, valuables, or people who have not agreed to appear.
            </span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button disabled={!consent} onClick={() => setStep(5)}>Confirm</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3 text-sm">
          {mode === 'demo' ? <p className="rounded-md bg-muted px-3 py-2 text-xs font-medium">DEMO SIMULATION · no file leaves this browser and no processing happens.</p> : null}
          {progress != null ? (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{mode === 'demo' ? 'Simulated upload' : 'Uploading'} · {Math.round(progress * 100)}%</p>
            </div>
          ) : null}
          {result ? <p role="status">{result}</p> : null}
          {error ? <p className="text-destructive" role="alert">{error}</p> : null}
          <div className="flex gap-2">
            {!result ? (
              <>
                <Button variant="outline" disabled={busy} onClick={() => setStep(4)}>Back</Button>
                <Button disabled={busy} onClick={submit}>{busy ? 'Working…' : mode === 'demo' ? 'Run demo simulation' : 'Upload video'}</Button>
              </>
            ) : (
              <Button variant="outline" onClick={reset}>Upload another video</Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
