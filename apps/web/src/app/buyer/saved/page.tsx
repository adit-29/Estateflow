'use client';

import { useEffect, useState } from 'react';
import { getDemoStore } from '@/lib/demo-data';

export default function SavedPage() {
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const store = getDemoStore();
    setItems(store.buyer.properties.filter((p) => store.buyer.savedIds.includes(p.id)));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Saved properties</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
              <span className="absolute inset-y-0 left-0 w-1.5 bg-orange-500" />
              <p className="pl-3 font-medium">{p.title}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
