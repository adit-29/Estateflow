'use client';

import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ux';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="A dedicated document vault is not in the database yet. Keep files against the lead, property, or deal they belong to, and use notes for references."
      />
      <EmptyState
        title="No standalone vault"
        body="Upload and permissioned file storage will attach to records when the Document model ships. Until then, store notes on the related record."
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/dealer/leads">Open leads</Link>
        <Link className="underline" href="/dealer/inventory">Open properties</Link>
        <Link className="underline" href="/dealer/deals">Open deals</Link>
      </div>
    </div>
  );
}
