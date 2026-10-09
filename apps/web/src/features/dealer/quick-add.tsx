'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACTIONS = [
  { href: '/dealer/leads/new', label: 'Add lead', hint: 'Buyer name, phone, requirement' },
  { href: '/dealer/inventory/new', label: 'Add property', hint: 'Listing you can currently offer' },
  { href: '/dealer/site-visits/new', label: 'Schedule visit', hint: 'Buyer + property + time' },
  { href: '/dealer/follow-ups', label: 'Create follow-up', hint: 'Open reminders' },
  { href: '/dealer/deals', label: 'Open deals', hint: 'Pipeline and negotiation' },
];

export function QuickAdd() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <Button type="button" size="sm" variant="accept" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <Plus className="mr-1 h-4 w-4" />
        Quick add
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Quick add"
            className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Add to EstateFlow</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1">
              {ACTIONS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-3 py-2 hover:bg-muted"
                    onClick={() => setOpen(false)}
                  >
                    <p className="text-body font-medium">{item.label}</p>
                    <p className="text-helper text-muted-foreground">{item.hint}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
