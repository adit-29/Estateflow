'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDemoStore } from '@/lib/demo-data';
import { api, ApiError } from '@/lib/api-client';
import { useLiveMode } from '@/components/use-live-mode';
import { Badge } from '@/components/ui/badge';

const LABELS: Record<string, string> = {
  expected: 'Estimated',
  pending: 'Due',
  'partially paid': 'Partially paid',
  paid: 'Paid',
  not_recorded: 'Not recorded',
};

export default function CommissionsPage() {
  const mode = useLiveMode();
  const [rows, setRows] = useState<{ label: string; amount: string }[]>([]);
  const [items, setItems] = useState<{ id: string; title: string; status: string; amount: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'demo' && mode !== 'live') return;
    if (mode === 'demo') {
      const grouped = new Map<string, number>();
      for (const row of getDemoStore().dealer.commissions ?? []) {
        const key = LABELS[row.status] ?? row.status;
        grouped.set(key, (grouped.get(key) ?? 0) + (row.amount ?? 0));
      }
      setRows([...grouped.entries()].map(([label, amount]) => ({ label, amount: `₹${amount.toLocaleString('en-IN')}` })));
      setItems((getDemoStore().dealer.commissions ?? []).map((row) => ({
        id: row.id,
        title: row.dealTitle,
        status: LABELS[row.status] ?? row.status,
        amount: row.amount != null ? `₹${row.amount.toLocaleString('en-IN')}` : 'Not recorded',
      })));
      return;
    }
    api.commissionSummary()
      .then((body) => {
        const payload = body as {
          totals?: Record<string, number>;
          items?: { id: string; paymentStatus: string; deal?: { title?: string }; fixedAmount?: string | number | null; percentage?: string | number | null }[];
        };
        const totals = payload.totals ?? {};
        setRows(Object.entries(totals).map(([label, amount]) => ({ label, amount: `₹${Number(amount).toLocaleString('en-IN')}` })));
        setItems((payload.items ?? []).map((row) => ({
          id: row.id,
          title: row.deal?.title ?? 'Deal',
          status: row.paymentStatus,
          amount: row.fixedAmount != null ? `₹${Number(row.fixedAmount).toLocaleString('en-IN')}` : row.percentage != null ? `${row.percentage}%` : 'Not recorded',
        })));
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load commissions.'));
  }, [mode]);

  return (
    <div className="max-w-xl space-y-4">
      <Link href="/dealer/deals" className="text-sm text-muted-foreground">← Deals</Link>
      <h2 className="text-2xl font-semibold">Commission summary</h2>
      <p className="text-sm text-muted-foreground">Estimated means not yet agreed. Due is recorded and unpaid. Paid is a stored payment. This app does not guarantee collection.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="rounded-xl border p-6 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No commission amounts are stored.</p> : rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm"><span>{row.label}</span><span className="font-medium">{row.amount}</span></div>
        ))}
      </div>
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((row) => (
            <li key={row.id} className="flex justify-between rounded-xl border p-3 text-sm">
              <span>{row.title} · {row.status}</span>
              <span className="font-medium">{row.amount}</span>
            </li>
          ))}
        </ul>
      )}
      <Badge variant="muted">{mode === 'demo' ? 'Demo data' : 'Your agency'}</Badge>
    </div>
  );
}
