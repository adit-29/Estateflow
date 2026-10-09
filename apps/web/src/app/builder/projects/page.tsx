'use client';

import Link from 'next/link';
import { PROJECT_STATUS_LABEL } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { EmptyState, PageHeader } from '@/components/ux';

export default function ProjectsPage() {
  const { workspace } = useBuilderWorkspace();
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Each project keeps its own inventory, media, dealers, and leads."
        primary={{ href: '/builder/projects/new', label: 'Create project' }}
      />
      {workspace.projects.length === 0 && (
        <EmptyState title="No projects yet" body="Create a project to add towers, units, and dealer access." action={{ href: '/builder/projects/new', label: 'Create project' }} />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {workspace.projects.map((project) => {
          const units = workspace.units.filter((unit) => unit.projectId === project.id).length;
          return (
            <Link key={project.id} href={`/builder/projects/${project.id}`} className="rounded-xl border p-5 hover:bg-muted/40">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{project.name}</p>
                <Badge variant="outline">{PROJECT_STATUS_LABEL[project.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{project.projectType} · {project.locality}, {project.city}</p>
              <p className="mt-3 text-sm">{units} units · {project.visibility} · {project.constructionStatus.replaceAll('_', ' ')}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
