'use client';

import { AppShell, type NavItem } from '@/features/shell/app-shell';
import { Home, Inbox, PlusCircle } from 'lucide-react';

const nav: NavItem[] = [
  { href: '/seller', label: 'My listings', icon: Home },
  { href: '/seller/new', label: 'Add property', icon: PlusCircle },
  { href: '/seller/enquiries', label: 'Enquiries', icon: Inbox },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="seller" nav={nav} title="Seller portal">
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        Demo preview — listings are saved locally only, not published publicly.
      </div>
      {children}
    </AppShell>
  );
}
