'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDemoStore, getDemoTours, saveDemoTours, type DemoTourJob } from '@/lib/demo-data';
import { TourUploadWizard, type WizardSubmission } from './upload-wizard';
import { SampleTourViewer } from './sample-tour-viewer';

function simulateProgress(onProgress: (f: number) => void) {
  return new Promise<void>((resolve) => {
    let f = 0;
    const timer = setInterval(() => {
      f = Math.min(1, f + 0.2);
      onProgress(f);
      if (f >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 250);
  });
}

export function DemoTours() {
  const [jobs, setJobs] = useState<DemoTourJob[]>([]);
  const properties = getDemoStore().dealer.properties.map((p) => ({ id: p.id, title: p.title, locality: p.locality }));

  useEffect(() => setJobs(getDemoTours()), []);

  const persist = (next: DemoTourJob[]) => {
    setJobs(next);
    saveDemoTours(next);
  };

  const simulate = async (input: WizardSubmission, onProgress: (f: number) => void) => {
    await simulateProgress(onProgress);
    const job: DemoTourJob = {
      id: `demo-tour-${Date.now()}`,
      propertyId: input.property.id,
      propertyTitle: input.property.title,
      fileName: input.file.name,
      sizeBytes: input.file.size,
      durationSeconds: input.durationSeconds == null ? null : Math.round(input.durationSeconds),
      captureNotes: input.captureNotes,
      consentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      simulated: true,
      sampleAttached: false,
    };
    persist([job, ...getDemoTours()]);
    return 'Demo simulation complete. The file stayed in your browser, nothing was uploaded, and no 3D model was generated.';
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">3D tours</h2>
          <Badge variant="outline">Demo workspace</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Try the upload flow and the sample viewer. Demo uploads are simulated in this browser: no video is stored or processed, and demo jobs never become Ready.
        </p>
      </div>

      <SampleTourViewer />

      <TourUploadWizard mode="demo" properties={properties} onSubmit={simulate} />

      <section className="space-y-2">
        <h3 className="font-medium">Simulated jobs</h3>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No simulated uploads yet.</p>
        ) : (
          <ul className="divide-y rounded-2xl border text-sm">
            {jobs.map((j) => (
              <li key={j.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{j.propertyTitle}</span>
                    <span className="text-muted-foreground"> · {j.fileName} · {new Date(j.createdAt).toLocaleString('en-IN')}</span>
                  </span>
                  <Badge variant="muted">Demo simulation · not processed</Badge>
                </div>
                {j.captureNotes ? <p className="text-xs text-muted-foreground">Notes: {j.captureNotes}</p> : null}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {j.sampleAttached ? <Badge variant="outline">Sample scene shown on this demo property</Badge> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => persist(jobs.map((x) => (x.id === j.id ? { ...x, sampleAttached: !x.sampleAttached } : x)))}
                  >
                    {j.sampleAttached ? 'Remove sample from property' : 'Attach sample scene to demo property'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => persist(jobs.filter((x) => x.id !== j.id))}>Delete demo job</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">Share links and real reconstructions need a live workspace with private storage and a reconstruction provider configured.</p>
      </section>
    </div>
  );
}
