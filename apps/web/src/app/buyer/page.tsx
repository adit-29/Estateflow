'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDemoStore, saveDemoStore, type DemoBuyerProperty } from '@/lib/demo-data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast';
import { EmptyState } from '@/components/ux';

export default function BuyerDiscoverPage() {
  const [properties, setProperties] = useState<DemoBuyerProperty[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const { notify } = useToast();

  useEffect(() => {
    const store = getDemoStore();
    setProperties(store.buyer.properties);
    setSaved(store.buyer.savedIds);
  }, []);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q.toLowerCase()) && !p.locality.toLowerCase().includes(q.toLowerCase())) return false;
      if (maxBudget && p.price > Number(maxBudget) * 100000) return false;
      return true;
    });
  }, [properties, q, maxBudget]);

  function toggleSave(id: string) {
    const store = getDemoStore();
    store.buyer.savedIds = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    saveDemoStore(store);
    setSaved(store.buyer.savedIds);
    notify(saved.includes(id) ? 'Removed from saved' : 'Saved property');
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Buyer</p>
            <h2 className="mt-1 text-2xl font-bold">Find a place that fits your life.</h2>
            <p className="mt-1 text-sm text-white/90">Demo listings stored in this browser. Saving a home does not contact a dealer.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/40 bg-white/15 text-white hover:bg-white/25"><Link href="/buyer/saved">Open saved properties</Link></Button>
            <Button asChild className="bg-white text-orange-800 hover:bg-white/90"><Link href="/explore">Explore public listings</Link></Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Where do you want to live?" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Input placeholder="Max budget (lakhs)" type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} className="max-w-[180px]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((p, index) => (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className={`flex h-36 items-center justify-center text-sm font-medium text-white ${['bg-gradient-to-br from-orange-400 to-amber-500', 'bg-gradient-to-br from-teal-500 to-sky-500', 'bg-gradient-to-br from-violet-500 to-fuchsia-500', 'bg-gradient-to-br from-rose-400 to-orange-500'][index % 4]}`}>
              {p.imageLabel}
            </div>
            <div className="space-y-2 p-4">
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.locality} · ₹{(p.price / 100000).toFixed(0)} L {p.beds ? `· ${p.beds} BHK` : ''}</p>
              <div className="flex items-center justify-between">
                <Badge variant="warm">Demo listing</Badge>
                <Button size="sm" className={saved.includes(p.id) ? 'bg-orange-600 text-white hover:bg-orange-700' : ''} variant={saved.includes(p.id) ? 'default' : 'outline'} onClick={() => toggleSave(p.id)}>
                  {saved.includes(p.id) ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState title="No properties match your filters" body="Clear the locality or budget, or browse the public demo listings." action={{ href: '/explore', label: 'Explore properties' }} />
      )}
    </div>
  );
}
