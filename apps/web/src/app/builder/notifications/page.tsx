'use client';

import Link from 'next/link';
import { builderNotifications } from '@estateflow/shared';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { when } from '@/features/builder/format';

export default function BuilderNotificationsPage() {
  const { workspace } = useBuilderWorkspace();
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const items = builderNotifications(workspace);
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Notifications</h2>
      {items.map((item) => (
        <Link key={item.id} href={item.href} className="block rounded-xl border p-4">
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.detail} · {when(item.at)} · {item.channel === 'demo' ? 'Demo / local' : 'This account'}</p>
        </Link>
      ))}
      {!items.length && <p className="text-sm text-muted-foreground">No pending assignments or tours waiting for review.</p>}
    </div>
  );
}
