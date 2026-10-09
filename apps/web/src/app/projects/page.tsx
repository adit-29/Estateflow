'use client';

import Link from 'next/link';
import { createDemoBuilderWorkspace } from '@estateflow/shared';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Badge } from '@/components/ui/badge';

export default function ProjectsPage() {
  const ws = createDemoBuilderWorkspace(new Date('2026-10-01T10:00:00+05:30'));
  const published = ws.projects.filter((project) => project.status === 'active');

  return (
    <div>
      <PublicHeader />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div>
          <p className="text-meta text-primary">Projects</p>
          <h1 className="text-page">Builder Projects on EstateFlow</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Ye participating/demo builder records hain. Real builder partnerships invent nahi kiye gaye.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {published.map((project) => {
            const units = ws.units.filter((unit) => unit.projectId === project.id);
            const available = units.filter((unit) => unit.availability === 'available').length;
            const prices = units.map((unit) => unit.basePrice);
            const configs = [...new Set(units.map((unit) => unit.configuration))];
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border bg-card p-5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-card">{project.name}</h2>
                  <Badge variant="muted">Demo project</Badge>
                </div>
                <p className="mt-1 text-body text-muted-foreground">{project.developerName} · {project.locality}, {project.city}</p>
                <p className="mt-3 text-body">{configs.join(', ')}</p>
                <p className="text-body">₹{(Math.min(...prices) / 1_00_00_000).toFixed(2)}–{(Math.max(...prices) / 1_00_00_000).toFixed(2)} Cr</p>
                <p className="mt-2 text-meta text-muted-foreground">
                  Possession {project.possessionDate ?? 'not recorded'} · {project.constructionStatus.replace('_', ' ')} · {available} available units
                </p>
                <p className="mt-1 text-helper text-muted-foreground">Last updated {new Date(project.updatedAt).toLocaleDateString('en-IN')} · RERA {project.reraNumber ?? 'not recorded'}</p>
              </Link>
            );
          })}
        </div>
        {!published.length && <p className="text-body text-muted-foreground">Koi public project record nahi hai.</p>}
      </div>
      <PublicFooter />
    </div>
  );
}
