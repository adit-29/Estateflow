'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <Link href="/dealer/buyers" className="text-sm text-muted-foreground">← Buyers</Link>
      <h2 className="text-2xl font-semibold">Buyer detail</h2>
      <p className="text-muted-foreground text-sm">Demo buyer record: {id}</p>
      <p className="text-sm">Full buyer CRM is available in the API-backed build; this demo shows summary only.</p>
    </div>
  );
}
