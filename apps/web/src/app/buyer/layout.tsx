'use client';

import { AppShell, type NavItem } from '@/features/shell/app-shell';
import { Heart, Home, Search } from 'lucide-react';

const nav: NavItem[] = [
  { href: '/buyer', label: 'Discover', icon: Search },
  { href: '/buyer/saved', label: 'Saved', icon: Heart },
  { href: '/buyer/enquiries', label: 'Enquiries', icon: Home },
];

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="buyer" nav={nav} title="Buyer portal">
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        Demo preview — the dealer workspace is the primary product in this release.
      </div>
      {children}
    </AppShell>
  );
}
