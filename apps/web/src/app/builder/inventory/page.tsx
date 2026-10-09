'use client';

import Link from 'next/link';
import { UNIT_STATUS_LABEL, unitTotalPrice } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { inr } from '@/features/builder/format';

export default function InventoryPage() {
  const { workspace, projectId } = useBuilderWorkspace();
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const projects = workspace.projects.filter((project) => !projectId || project.id === projectId);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Inventory</h2>
      <p className="text-sm text-muted-foreground">One unit record is shared with authorized dealers. Dealers do not get a separate copy.</p>
      {projects.map((project) => (
        <section key={project.id} className="space-y-3">
          <Link href={`/builder/projects/${project.id}`} className="font-medium hover:underline">{project.name}</Link>
          {workspace.towers.filter((tower) => tower.projectId === project.id).map((tower) => (
            <div key={tower.id} className="rounded-xl border p-4">
              <p className="text-sm font-medium">{tower.name}</p>
              {workspace.floors.filter((floor) => floor.towerId === tower.id).map((floor) => (
                <div key={floor.id} className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{floor.label}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {workspace.units.filter((unit) => unit.floorId === floor.id).map((unit) => (
                      <li key={unit.id} className="flex items-center justify-between gap-3">
                        <span>{unit.unitNumber} · {unit.configuration} · {unit.carpetAreaSqft || '—'} sq ft carpet</span>
                        <span className="flex items-center gap-2">
                          {inr(unitTotalPrice(unit))}
                          <Badge variant="muted">{UNIT_STATUS_LABEL[unit.availability]}</Badge>
                          <Link href={`/builder/units/${unit.id}/layout`} className="text-sm text-primary">
                            {unit.layout?.rooms.length ? 'Edit layout' : 'Create layout'}
                          </Link>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
