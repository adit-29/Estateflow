'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ProjectWorkspace } from '@/features/builder/project-workspace';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
      <ProjectWorkspace projectId={projectId} />
    </Suspense>
  );
}
