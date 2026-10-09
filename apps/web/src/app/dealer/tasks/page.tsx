'use client';

import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ux';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Follow-ups and site visits are the live task queues. A generic task table is not a separate database model."
        primary={{ href: '/dealer/follow-ups', label: 'Open follow-ups' }}
        secondary={{ href: '/dealer/site-visits', label: 'Open visits' }}
      />
      <EmptyState
        title="Use follow-ups and visits"
        body="Overdue buyer work lives on Follow-ups. Calendar work lives on Site visits. Home also surfaces what needs attention today."
        action={{ href: '/dealer', label: 'Back to home' }}
      />
      <p className="text-sm text-muted-foreground">
        Need a one-off reminder? <Link className="underline" href="/dealer/follow-ups">Create it against a lead</Link>.
      </p>
    </div>
  );
}
