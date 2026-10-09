'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDemoStore, saveDemoStore } from '@/lib/demo-data';
import { api, ApiError } from '@/lib/api-client';
import { useLiveMode } from '@/components/use-live-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';

export default function NewLeadPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', locality: '', summary: '', timeline: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const mode = useLiveMode();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (form.name.trim().length < 2) {
      setFieldError('Name must be at least 2 characters.');
      return;
    }
    if (form.phone.trim().length < 10) {
      setFieldError('Phone must be at least 10 characters.');
      return;
    }
    setLoading(true);
    if (mode === 'live') {
      try {
        await api.createLead({
          name: form.name.trim(),
          phone: form.phone.trim(),
          source: 'other',
          requirementSummary: form.summary,
          preferredLocalities: form.locality ? [form.locality] : [],
          timeline: form.timeline || undefined,
          notes: form.notes || undefined,
          status: 'new',
        });
        notify('Lead saved to your agency');
        router.push('/dealer/leads');
      } catch (err) {
        setFieldError(err instanceof ApiError ? err.message : 'Could not save the lead.');
      } finally {
        setLoading(false);
      }
      return;
    }
    const store = getDemoStore();
    store.dealer.leads.unshift({
      id: `l${Date.now()}`,
      name: form.name,
      phone: form.phone,
      source: 'Manual',
      status: 'New',
      locality: form.locality,
      summary: form.summary,
      timeline: form.timeline || undefined,
      followUp: 'Today',
    });
    saveDemoStore(store);
    notify('Lead saved (demo)');
    router.push('/dealer/leads');
  }

  return (
    <div className="max-w-xl space-y-4">
      <Link href="/dealer/leads" className="text-sm text-muted-foreground">← Leads</Link>
      <h2 className="text-2xl font-semibold">Add lead</h2>
      {fieldError && <p role="alert" className="text-sm text-destructive">{fieldError}</p>}
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="n">Name</Label>
          <Input id="n" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p">Phone</Label>
          <Input id="p" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l">Locality</Label>
          <Input id="l" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s">Requirement summary</Label>
          <Input id="s" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t">Timeline</Label>
          <Input id="t" placeholder="e.g. 30 days" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save lead'}</Button>
      </form>
    </div>
  );
}
