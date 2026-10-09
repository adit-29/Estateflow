'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDemoStore, saveDemoStore } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';

export default function NewPropertyPage() {
  const router = useRouter();
  const { notify } = useToast();
  const mode = useLiveMode();
  const [form, setForm] = useState({ title: '', locality: '', price: '', beds: '', address: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (form.title.trim().length < 3) {
      setFieldError('Title must be at least 3 characters.');
      return;
    }
    if (mode === 'live') {
      setLoading(true);
      try {
        await api.createProperty({
          title: form.title.trim(),
          locality: form.locality.trim(),
          addressText: form.address || undefined,
          propertyType: 'flat',
          transactionType: 'sale',
          listingStatus: 'draft',
          bedrooms: form.beds ? Number(form.beds) : null,
          priceAmount: form.price ? Number(form.price) * 100000 : null,
          notes: form.notes || undefined,
        });
        notify('Property saved as draft. Review it before treating it as available.');
        router.push('/dealer/inventory');
      } catch (err) {
        setFieldError(err instanceof ApiError ? err.message : 'Could not save the property.');
      } finally {
        setLoading(false);
      }
      return;
    }
    const store = getDemoStore();
    store.dealer.properties.unshift({
      id: `p${Date.now()}`,
      title: form.title,
      locality: form.locality,
      price: Number(form.price) * 100000 || 0,
      type: 'Flat',
      beds: form.beds ? Number(form.beds) : undefined,
      status: 'Draft',
    });
    saveDemoStore(store);
    notify('Property saved (demo)');
    router.push('/dealer/inventory');
  }

  return (
    <div className="max-w-xl space-y-4">
      <Link href="/dealer/inventory" className="text-sm text-muted-foreground">← Properties</Link>
      <h2 className="text-2xl font-semibold">Add property</h2>
      <p className="text-sm text-muted-foreground">Save as a draft. Availability stays unverified until you confirm it on the property page.</p>
      {fieldError && <p role="alert" className="text-sm text-destructive">{fieldError}</p>}
      <form onSubmit={submit} className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2"><Label>Title</Label><Input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="space-y-2"><Label>Locality</Label><Input required value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} /></div>
        <div className="space-y-2"><Label>Address (optional)</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="space-y-2"><Label>Price (lakhs)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
        <div className="space-y-2"><Label>Bedrooms</Label><Input type="number" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} /></div>
        <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save draft'}</Button>
      </form>
    </div>
  );
}
