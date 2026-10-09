'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { searchWorkspace } from '@estateflow/shared';
import { useBuilderWorkspace } from '@/features/builder/builder-context';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const { workspace } = useBuilderWorkspace();
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const result = searchWorkspace(workspace, q);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Search</h2>
      {!q && <p className="text-sm text-muted-foreground">Enter a project, unit, dealer, or buyer name in the header.</p>}
      {q && (
        <>
          {result.projects.map((project) => <Link key={project.id} href={`/builder/projects/${project.id}`} className="block rounded-lg border p-3">{project.name}</Link>)}
          {result.units.map((unit) => <Link key={unit.id} href={`/builder/projects/${unit.projectId}`} className="block rounded-lg border p-3">{unit.unitNumber} · {unit.configuration}</Link>)}
          {result.dealers.map((dealer) => <Link key={dealer.id} href="/builder/dealers" className="block rounded-lg border p-3">{dealer.name} · {dealer.agencyName}</Link>)}
          {result.leads.map((lead) => <Link key={lead.id} href={`/builder/leads/${lead.id}`} className="block rounded-lg border p-3">{lead.buyerName} · {lead.configuration}</Link>)}
          {!result.projects.length && !result.units.length && !result.dealers.length && !result.leads.length && <p className="text-sm text-muted-foreground">No records match.</p>}
        </>
      )}
    </div>
  );
}

export default function BuilderSearchPage() {
  return <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}><SearchResults /></Suspense>;
}
