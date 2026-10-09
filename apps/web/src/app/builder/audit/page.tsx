'use client';

import { useState } from 'react';
import { pageItems, qualitySignals } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { when } from '@/features/builder/format';

export default function BuilderAuditPage() {
  const { workspace } = useBuilderWorkspace();
  const [page, setPage] = useState(0);
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const paged = pageItems(workspace.timeline, page, 15);
  const signals = qualitySignals(workspace).slice(0, 8);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Audit</h2>
        <p className="text-sm text-muted-foreground">Actor, event, and time come from stored workspace events. Secrets are not written here.</p>
      </div>
      {signals.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-medium">Data quality</h3>
          <ul className="space-y-2">
            {signals.map((signal) => (
              <li key={`${signal.code}-${signal.detail}`} className="rounded-lg border px-3 py-2 text-sm">
                <span className="font-medium">{signal.label}.</span> {signal.detail}
              </li>
            ))}
          </ul>
        </section>
      )}
      {!workspace.timeline.length && <p className="text-sm text-muted-foreground">No events yet. Creating a project or changing a unit will record one.</p>}
      <ul className="space-y-2">
        {paged.items.map((event) => (
          <li key={event.id} className="rounded-lg border px-3 py-2 text-sm">
            <p className="font-medium">{event.detail}</p>
            <p className="text-muted-foreground">{event.actor ?? 'Builder'} · {event.entity} · {when(event.at)}</p>
          </li>
        ))}
      </ul>
      {workspace.timeline.length > 15 && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button type="button" variant="outline" size="sm" disabled={(page + 1) * 15 >= workspace.timeline.length} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
