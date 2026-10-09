'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDemoStore, saveDemoStore } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type LeadRow, type PropertyRow } from '@/lib/api-client';
import { cachedMe } from '@/lib/session-cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';

export default function NewVisitPage() {
  const router = useRouter();
  const { notify } = useToast();
  const mode = useLiveMode();
  const [form, setForm] = useState({ property: '', buyer: '', when: '', propertyId: '', leadId: '', meetingPoint: '' });
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'live') return;
    Promise.all([api.listProperties({ scope: 'mine', pageSize: 50 }), api.listLeads({ pageSize: 50 })])
      .then(([props, leadPage]) => {
        setProperties(props.items);
        setLeads(leadPage.items);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load records for scheduling.'));
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'live') {
      setLoading(true);
      try {
        const me = await cachedMe();
        const when = form.when ? new Date(form.when).toISOString() : '';
        await api.createSiteVisit({
          propertyId: form.propertyId,
          leadId: form.leadId || undefined,
          scheduledAt: when,
          meetingPoint: form.meetingPoint || properties.find((p) => p.id === form.propertyId)?.locality || 'Site',
          assignedAccountId: me.id,
        });
        notify('Visit proposed. Confirm it from the visits list — the buyer is not messaged automatically.');
        router.push('/dealer/site-visits');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not schedule the visit.');
      } finally {
        setLoading(false);
      }
      return;
    }
    const store = getDemoStore();
    store.dealer.visits.unshift({
      id: `v${Date.now()}`,
      propertyTitle: form.property,
      buyerName: form.buyer,
      when: form.when,
      status: 'Proposed',
    });
    saveDemoStore(store);
    notify('Visit scheduled (demo)');
    router.push('/dealer/site-visits');
  }

  return (
    <div className="max-w-xl space-y-4">
      <Link href="/dealer/site-visits" className="text-sm text-muted-foreground">← Site visits</Link>
      <h2 className="text-2xl font-semibold">Schedule visit</h2>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <form onSubmit={submit} className="space-y-4 rounded-xl border p-6">
        {mode === 'live' ? (
          <>
            <div className="space-y-2">
              <Label>Property</Label>
              <select required className="h-10 w-full rounded-md border px-3" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                <option value="">Select a listing</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.locality}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Buyer (optional)</Label>
              <select className="h-10 w-full rounded-md border px-3" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
                <option value="">Not linked</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>When</Label>
              <Input required type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Meeting point</Label>
              <Input required minLength={3} value={form.meetingPoint} onChange={(e) => setForm({ ...form, meetingPoint: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2"><Label>Property</Label><Input required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })} /></div>
            <div className="space-y-2"><Label>Buyer name</Label><Input required value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} /></div>
            <div className="space-y-2"><Label>When</Label><Input required placeholder="e.g. Tomorrow 11 AM" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></div>
          </>
        )}
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save visit'}</Button>
      </form>
    </div>
  );
}
