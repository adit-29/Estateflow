'use client';

import Link from 'next/link';

export default function NewBuyerPage() {
  return (
    <div className="max-w-xl space-y-4">
      <Link href="/dealer/buyers" className="text-sm text-muted-foreground">← Buyers</Link>
      <h2 className="text-2xl font-semibold">Add buyer</h2>
      <p className="text-sm text-muted-foreground">Use “Add lead” to create demo buyer requirements in this preview.</p>
      <Link href="/dealer/leads/new" className="text-primary underline-offset-4 hover:underline">Go to add lead →</Link>
    </div>
  );
}
