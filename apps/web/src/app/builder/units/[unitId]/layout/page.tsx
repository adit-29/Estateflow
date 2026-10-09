'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutEditor } from '@/features/builder/layout-editor';
import { useBuilderWorkspace } from '@/features/builder/builder-context';

export default function UnitLayoutPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const { workspace, run } = useBuilderWorkspace();
  const unit = workspace?.units.find((item) => item.id === unitId);
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  if (!unit) return <p className="text-body">Unit not found.</p>;

  return (
    <div className="space-y-4">
      <p className="text-meta text-muted-foreground"><Link href="/builder/inventory">Inventory</Link> / {unit.unitNumber}</p>
      <h1 className="text-page">Create layout · {unit.unitNumber}</h1>
      <p className="text-body text-muted-foreground">
        Rooms structured data ke taur par save hote hain. Ye photo se 3D scan nahi hai.
      </p>
      <LayoutEditor
        initial={unit.layout}
        onSave={(layout) => run({ type: 'save_unit_layout', unitId: unit.id, layout })}
      />
    </div>
  );
}
