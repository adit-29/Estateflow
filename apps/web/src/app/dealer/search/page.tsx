'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MemorySearchIndex } from '@estateflow/shared';
import { getDemoStore } from '@/lib/demo-data';
import { api } from '@/lib/api-client';
import { useLiveMode } from '@/components/use-live-mode';
import { EmptyState, PageHeader } from '@/components/ux';

const GROUPS = [
  { key: 'BUYERS', types: ['buyer', 'lead'] },
  { key: 'PROPERTIES', types: ['property'] },
  { key: 'DEALS', types: ['deal'] },
  { key: 'VISITS', types: ['visit'] },
] as const;

export default function DealerSearchPage() {
  const mode = useLiveMode();
  const [q, setQ] = useState('');
  const [liveHits, setLiveHits] = useState<{ type: string; id: string; title: string; subtitle: string }[]>([]);
  const demoHits = useMemo(() => {
    if (mode !== 'demo') return [];
    const store = getDemoStore().dealer;
    const index = new MemorySearchIndex([
      ...store.leads.map((item) => ({ type: 'buyer' as const, id: item.id, title: item.name, subtitle: item.locality, href: `/dealer/leads/${item.id}` })),
      ...store.properties.map((item) => ({ type: 'property' as const, id: item.id, title: item.title, subtitle: item.locality, href: `/dealer/inventory/${item.id}` })),
      ...store.deals.map((item) => ({ type: 'deal' as const, id: item.id, title: item.title, subtitle: item.stage, href: '/dealer/deals' })),
      ...store.visits.map((item) => ({ type: 'visit' as const, id: item.id, title: `${item.buyerName} → ${item.propertyTitle}`, subtitle: item.when, href: '/dealer/site-visits' })),
    ]);
    return index.search(q, 20);
  }, [q, mode]);

  useEffect(() => {
    if (mode !== 'live' || q.trim().length < 2) {
      setLiveHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      api.search(q).then((page) => setLiveHits(page.items)).catch(() => setLiveHits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [mode, q]);

  const hits = mode === 'live' ? liveHits : demoHits;

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Search" description={mode === 'live' ? 'Agency-scoped PostgreSQL search. Browser demo store is not used.' : 'Demo mode is browser records only. Ctrl+K yahan laata hai.'} />
      <input
        className="h-11 w-full rounded-md border px-3 text-body"
        aria-label="Search buyers, properties, visits, deals"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rahul, Dwarka, visit…"
      />
      {q.trim().length < 2 ? (
        <EmptyState title="Type at least 2 letters" body="Results group by buyers, properties, deals aur visits." />
      ) : hits.length === 0 ? (
        <EmptyState title="No matches" body="Is query ke liye authorized records nahi mile." />
      ) : (
        GROUPS.map((group) => {
          const rows = hits.filter((hit) => (group.types as readonly string[]).includes(hit.type));
          if (!rows.length) return null;
          return (
            <section key={group.key}>
              <h3 className="text-helper font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.key}</h3>
              <ul className="mt-2 divide-y rounded-xl border">
                {rows.map((hit) => {
                  const href = 'href' in hit && typeof hit.href === 'string' ? hit.href : hit.type === 'property' ? `/dealer/inventory/${hit.id}` : `/dealer/leads/${hit.id}`;
                  return (
                    <li key={`${hit.type}-${hit.id}`}>
                      <Link href={href} className="block p-3 hover:bg-muted/40">
                        <p className="font-medium">{hit.title}</p>
                        <p className="text-meta text-muted-foreground">{hit.subtitle}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
