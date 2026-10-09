'use client';

import { useState } from 'react';
import {
  BUILDER_CAPTURE_GUIDANCE,
  DEMO_PROCESSING_MESSAGE,
  DEMO_RECONSTRUCTION_COMPLETE,
  DEMO_TOUR_DISCLAIMER,
  DEMO_TOUR_LABEL,
  PROVIDER_NOT_CONFIGURED_LABEL,
  MEDIA_CONSENT_TEXT,
  BUILDER_TOUR_STATUS_LABEL,
  validateBuilderMedia,
} from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SampleTourViewer } from '@/features/tours/sample-tour-viewer';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { bytes, fieldClass, when } from '@/features/builder/format';

export default function BuilderToursPage() {
  const { workspace, run, mode, projectId } = useBuilderWorkspace();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [source, setSource] = useState<'video' | 'photos' | 'existing_asset'>('video');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [project, setProject] = useState(projectId || '');
  const [towerId, setTowerId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [consent, setConsent] = useState(false);

  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const tours = workspace.tours.filter((tour) => !projectId || tour.projectId === projectId);
  const towers = workspace.towers.filter((tower) => tower.projectId === project);
  const floors = workspace.floors.filter((floor) => floor.towerId === towerId);
  const units = workspace.units.filter((unit) => unit.floorId === floorId);

  async function start() {
    if (!consent) {
      setProblems([MEDIA_CONSENT_TEXT]);
      return;
    }
    if (!project || (source !== 'existing_asset' && !file)) {
      setProblems(['Choose a project and a file.']);
      return;
    }
    if (file) {
      const errors = validateBuilderMedia({
        name: file.name,
        mime: file.type,
        size: file.size,
        durationSeconds: duration,
        kind: source === 'video' ? 'video' : 'image',
      });
      if (errors.length) {
        setProblems(errors);
        return;
      }
    }
    setProblems([]);
    setProgress(0);
    if (file) {
      const chunk = 256 * 1024;
      let offset = 0;
      while (offset < file.size) {
        await file.slice(offset, offset + chunk).arrayBuffer();
        offset += chunk;
        setProgress(Math.min(1, offset / file.size));
      }
    }
    const next = await run({
      type: 'create_tour',
      tour: {
        projectId: project,
        unitId: unitId || null,
        source,
        fileName: file?.name ?? null,
        mimeType: file?.type ?? null,
        sizeBytes: file?.size ?? null,
        durationSeconds: duration,
        consent: true,
      },
    });
    if (!next) {
      setProgress(null);
      return;
    }
    setProgress(null);
    setStep(1);
    setFile(null);
    setConsent(false);
    if (mode === 'demo' && next) {
      const created = next.tours[0];
      if (created?.status === 'uploaded') await run({ type: 'demo_process_tour', id: created.id });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">3D Property Experience</h2>
        <p className="text-sm text-muted-foreground">A tour is published only after a result exists and the builder approves it. Processing cannot skip review.</p>
        {mode === 'demo' && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Video selected</li>
            <li>Uploading — Demo</li>
            <li>Processing — Demo</li>
            <li>3D preview ready — Demo</li>
            <li>Review</li>
            <li>Approve</li>
            <li>Publish</li>
          </ol>
        )}
        {mode === 'live' && workspace.reconstructionConfigured === false && (
          <p className="mt-3 text-sm">{PROVIDER_NOT_CONFIGURED_LABEL}</p>
        )}
      </div>
      <section className="rounded-xl border p-5 space-y-4">
        <p className="text-sm font-medium">Step {step} of 4</p>
        {step === 1 && (
          <div className="space-y-3">
            <p className="font-medium">Create 3D tour</p>
            <div className="flex flex-wrap gap-2">
              {([['video', 'Create from walkthrough video'], ['photos', 'Create from photos'], ['existing_asset', 'Use existing 3D asset']] as const).map(([value, label]) => (
                <Button key={value} type="button" variant={source === value ? 'default' : 'outline'} onClick={() => setSource(value)}>{label}</Button>
              ))}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {BUILDER_CAPTURE_GUIDANCE.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <Button type="button" onClick={() => setStep(2)}>Continue</Button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <p className="font-medium">Upload</p>
            {source !== 'existing_asset' && (
              <label className="block rounded-lg border border-dashed p-6 text-sm">
                Drop a file or choose one
                <input
                  className="mt-3 block"
                  type="file"
                  accept={source === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'}
                  onChange={(event) => {
                    const next = event.target.files?.[0] ?? null;
                    setFile(next);
                    setDuration(null);
                    if (next?.type.startsWith('video/')) {
                      const video = document.createElement('video');
                      video.preload = 'metadata';
                      video.onloadedmetadata = () => setDuration(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
                      video.src = URL.createObjectURL(next);
                    }
                  }}
                />
              </label>
            )}
            {file && <p className="text-sm">{file.name} · {bytes(file.size)}{duration != null ? ` · ${duration}s` : ''}</p>}
            {progress != null && (
              <div className="flex items-center gap-3 text-sm">
                <span>Upload {Math.round(progress * 100)}%</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setProgress(null)}>Cancel</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => file && setProblems([])}>Retry</Button>
              </div>
            )}
            {problems.map((problem) => <p key={problem} className="text-sm text-destructive">{problem}</p>)}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button type="button" onClick={() => setStep(3)} disabled={source !== 'existing_asset' && !file}>Continue</Button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <p className="font-medium">Associate with a unit you manage</p>
            <div className="grid gap-3 md:grid-cols-2">
              <select className={fieldClass} value={project} onChange={(event) => { setProject(event.target.value); setTowerId(''); setFloorId(''); setUnitId(''); }} aria-label="Project">
                <option value="">Project</option>
                {workspace.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className={fieldClass} value={towerId} onChange={(event) => { setTowerId(event.target.value); setFloorId(''); setUnitId(''); }} aria-label="Tower">
                <option value="">Tower</option>
                {towers.map((tower) => <option key={tower.id} value={tower.id}>{tower.name}</option>)}
              </select>
              <select className={fieldClass} value={floorId} onChange={(event) => { setFloorId(event.target.value); setUnitId(''); }} aria-label="Floor">
                <option value="">Floor</option>
                {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.label}</option>)}
              </select>
              <select className={fieldClass} value={unitId} onChange={(event) => setUnitId(event.target.value)} aria-label="Unit">
                <option value="">Unit</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitNumber}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button type="button" onClick={() => setStep(4)} disabled={!project}>Continue</Button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <p className="font-medium">Review</p>
            <p className="text-sm">Project {workspace.projects.find((item) => item.id === project)?.name ?? '—'} · Unit {units.find((unit) => unit.id === unitId)?.unitNumber ?? 'Project level'} · {source.replaceAll('_', ' ')}</p>
            <p className="text-sm text-muted-foreground">{file ? `${file.name} · ${bytes(file.size)}` : 'Existing asset, no new file'}</p>
            {mode === 'demo' && <p className="text-sm">{DEMO_PROCESSING_MESSAGE}</p>}
            {mode === 'live' && <p className="text-sm">If no reconstruction provider is configured, the file stays uploaded and is not sent anywhere.</p>}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              {MEDIA_CONSENT_TEXT}
            </label>
            {problems.map((problem) => <p key={problem} className="text-sm text-destructive">{problem}</p>)}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button type="button" onClick={() => void start().catch((err: unknown) => setProblems([err instanceof Error ? err.message : 'Could not start.']))}>Start 3D processing</Button>
            </div>
          </div>
        )}
      </section>
      <section className="space-y-4">
        {tours.map((tour) => {
          const item = workspace.projects.find((row) => row.id === tour.projectId);
          const unit = workspace.units.find((row) => row.id === tour.unitId);
          const showSample = tour.demoSimulation && (tour.status === 'ready_for_review' || tour.status === 'approved' || tour.status === 'published');
          return (
            <article key={tour.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item?.name} {unit ? `· ${unit.unitNumber}` : ''}</p>
                  <p className="text-sm text-muted-foreground">{tour.fileName ?? 'Existing asset'} · {bytes(tour.sizeBytes)} · {when(tour.updatedAt)} · {tour.resultVersion ?? 'No result yet'}</p>
                </div>
                <Badge variant="outline">{BUILDER_TOUR_STATUS_LABEL[tour.status]}</Badge>
              </div>
              {tour.providerMessage && <p className="text-sm">{tour.providerMessage}</p>}
              {tour.demoSimulation && (tour.status === 'ready_for_review' || tour.status === 'approved' || tour.status === 'published') && (
                <p className="text-sm font-medium">{DEMO_RECONSTRUCTION_COMPLETE}</p>
              )}
              {tour.progress == null && tour.status === 'processing' && <p className="text-sm text-muted-foreground">No progress percentage is available from a reconstruction provider.</p>}
              {showSample && (
                <div className="space-y-2">
                  <Badge>{DEMO_TOUR_LABEL}</Badge>
                  <p className="text-sm">{DEMO_TOUR_DISCLAIMER}</p>
                  <SampleTourViewer />
                </div>
              )}
              {tour.resultKind === 'asset' && (
                <p className="text-sm">AI/3D generated asset · version {tour.resultVersion} · {when(tour.resultCreatedAt)}. The viewer accepts a stored asset key only, not page markup.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {tour.status === 'ready_for_review' && <Button type="button" onClick={() => run({ type: 'transition_tour', id: tour.id, to: 'approved' })}>Approve</Button>}
                {tour.status === 'ready_for_review' && <Button type="button" variant="outline" onClick={() => run({ type: 'transition_tour', id: tour.id, to: 'cancelled' })}>Reject</Button>}
                {tour.status === 'approved' && <Button type="button" onClick={() => run({ type: 'transition_tour', id: tour.id, to: 'published' })}>Publish</Button>}
                {tour.status === 'published' && <Button type="button" variant="outline" onClick={() => run({ type: 'transition_tour', id: tour.id, to: 'approved' })}>Unpublish</Button>}
                {tour.status === 'failed' && <Button type="button" variant="outline" onClick={() => run({ type: 'transition_tour', id: tour.id, to: 'queued' })}>Retry</Button>}
                {mode === 'live' && tour.status === 'uploaded' && (
                  <Button type="button" variant="outline" onClick={() => run({ type: 'transition_tour', id: tour.id, to: 'queued' })}>Queue with provider</Button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
