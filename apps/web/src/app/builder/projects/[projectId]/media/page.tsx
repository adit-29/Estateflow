'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { validateBuilderMedia, type BuilderMedia } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { bytes, fieldClass, when } from '@/features/builder/format';
import { api, uploadToSignedUrl } from '@/lib/api-client';

const CATEGORIES = ['Project photo', 'Exterior', 'Lobby', 'Living room', 'Bedroom', 'Kitchen', 'Bathroom', 'Amenities', 'Floor plan', 'Site plan', 'Walkthrough video', 'Project overview', 'Unit walkthrough', 'Amenity video', 'Brochure'];

export default function ProjectMediaPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { workspace, run, mode } = useBuilderWorkspace();
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [kind, setKind] = useState<BuilderMedia['kind']>('image');
  const [progress, setProgress] = useState<number | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const project = workspace?.projects.find((item) => item.id === projectId);
  const media = useMemo(() => (workspace?.media ?? []).filter((item) => item.projectId === projectId).sort((a, b) => a.sortOrder - b.sortOrder), [workspace, projectId]);

  if (!workspace || !project) return <p>Project not found.</p>;
  const current = project;
  const units = workspace.units.filter((unit) => unit.projectId === current.id);

  async function upload(file: File) {
    setProblems([]);
    const durationSeconds = await readDuration(file);
    const errors = validateBuilderMedia({ name: file.name, mime: file.type, size: file.size, durationSeconds, kind });
    if (errors.length) {
      setProblems(errors);
      return;
    }
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file));
    setProgress(0);
    let objectKey: string | null = null;
    if (mode === 'live') {
      const intent = await api.builderUploadIntent({ projectId: current.id, contentType: file.type, size: file.size });
      if (intent.url && intent.headers && intent.objectKey) {
        await uploadToSignedUrl(intent.url, file, intent.headers, setProgress);
        objectKey = intent.objectKey;
      } else {
        await readWithProgress(file, setProgress);
      }
    } else {
      await readWithProgress(file, setProgress);
    }
    await run({
      type: 'add_media',
      media: {
        projectId: current.id,
        unitId: unitId || null,
        kind,
        category,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        durationSeconds,
        objectKey,
        visibility: 'dealers',
        uploadedByName: mode === 'demo' ? 'Demo Builder' : 'Builder',
      },
    });
    setProgress(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{project.name} media</h2>
        <p className="text-sm text-muted-foreground">
          {workspace.storageMode === 'private_s3'
            ? 'Files upload to a private bucket with a short-lived signed URL.'
            : 'Demo/local storage. File bytes are not written to PostgreSQL. This browser keeps a preview only until you leave the page.'}
        </p>
      </div>
      <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-4">
        <select className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value as BuilderMedia['kind'])} aria-label="Media type">
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="floor_plan">Floor plan</option>
          <option value="brochure">Brochure</option>
        </select>
        <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className={fieldClass} value={unitId} onChange={(event) => setUnitId(event.target.value)} aria-label="Unit">
          <option value="">Whole project</option>
          {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitNumber}</option>)}
        </select>
        <Input
          type="file"
          aria-label="Upload media"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file).catch((err: unknown) => setProblems([err instanceof Error ? err.message : 'Upload failed.']));
          }}
        />
      </div>
      {progress != null && <p className="text-sm">Upload progress {Math.round(progress * 100)}%</p>}
      {problems.map((problem) => <p key={problem} role="alert" className="text-sm text-destructive">{problem}</p>)}
      {preview && (
        // Blob URLs exist only for this browser session, so the image optimizer cannot fetch them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Upload preview for this session" className="max-h-48 rounded-lg border object-cover" />
      )}
      <div className="space-y-2">
        {media.map((item, index) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{item.fileName} {item.isPrimary && <span className="text-primary">· Primary</span>}</p>
              <p className="text-muted-foreground">{item.category} · {item.kind} · {bytes(item.sizeBytes)} · {item.processingStatus} · {item.storage.replaceAll('_', ' ')} · {when(item.createdAt)} · {item.uploadedByName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => {
                const name = window.prompt('File name', item.fileName);
                if (name) void run({ type: 'update_media', id: item.id, fileName: name });
              }}>Rename</Button>
              {item.kind === 'image' && <Button type="button" size="sm" variant="outline" onClick={() => run({ type: 'update_media', id: item.id, isPrimary: true })}>Set primary</Button>}
              <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => {
                const ids = media.map((row) => row.id);
                const swap = ids[index - 1];
                ids[index - 1] = ids[index];
                ids[index] = swap;
                void run({ type: 'reorder_media', projectId: project.id, unitId: item.unitId, ids });
              }}>Move up</Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => run({ type: 'delete_media', id: item.id })}>Delete</Button>
            </div>
          </div>
        ))}
        {!media.length && <p className="text-sm text-muted-foreground">No media yet.</p>}
      </div>
    </div>
  );
}

function readDuration(file: File): Promise<number | null> {
  if (!file.type.startsWith('video/')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(Number.isFinite(duration) ? Math.round(duration) : null);
    };
    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
}

async function readWithProgress(file: File, onProgress: (fraction: number) => void) {
  const chunk = 256 * 1024;
  let offset = 0;
  while (offset < file.size) {
    await file.slice(offset, offset + chunk).arrayBuffer();
    offset += chunk;
    onProgress(Math.min(1, offset / file.size));
  }
}
