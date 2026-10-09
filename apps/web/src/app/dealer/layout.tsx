'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell, type NavGroup } from '@/features/shell/app-shell';
import { CopilotLauncher } from '@/features/copilot/copilot-launcher';
import { QuickAdd } from '@/features/dealer/quick-add';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Building2,
  Bot,
  Calendar,
  Handshake,
  LayoutDashboard,
  Inbox,
  Link2,
  Package,
  Box,
  Bell,
  Search,
  Settings,
  Shuffle,
  Users,
  UserSearch,
  ListChecks,
  GraduationCap,
  IdCard,
  FileText,
  CheckSquare,
  MoreHorizontal,
  CircleHelp,
} from 'lucide-react';

const navGroups: NavGroup[] = [
  {
    label: 'Home',
    items: [
      { href: '/dealer', label: 'Home', icon: LayoutDashboard },
      { href: '/dealer/copilot', label: 'AI Copilot', icon: Bot },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/dealer/leads', label: 'Leads', icon: UserSearch },
      { href: '/dealer/inventory', label: 'Properties', icon: Package },
      { href: '/dealer/matching', label: 'Matching', icon: Shuffle },
      { href: '/dealer/follow-ups', label: 'Follow-ups', icon: ListChecks },
      { href: '/dealer/site-visits', label: 'Site visits', icon: Calendar },
      { href: '/dealer/deals', label: 'Deals', icon: Handshake },
      { href: '/dealer/deals/commissions', label: 'Commissions', icon: Handshake },
      { href: '/dealer/inbox', label: 'Messages', icon: Inbox },
      { href: '/dealer/network', label: 'Network', icon: Link2 },
      { href: '/dealer/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/dealer/documents', label: 'Documents', icon: FileText },
      { href: '/dealer/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/dealer/builder-leads', label: 'Builder leads', icon: Building2 },
      { href: '/dealer/buyers', label: 'Buyers', icon: Users },
      { href: '/dealer/demand', label: 'Demand pool', icon: BarChart3 },
      { href: '/dealer/performance', label: 'Performance', icon: BarChart3 },
      { href: '/dealer/passport', label: 'Dealer passport', icon: IdCard },
      { href: '/dealer/coach', label: 'Sales coach', icon: GraduationCap },
      { href: '/dealer/tours', label: '3D tours', icon: Box },
      { href: '/dealer/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dealer/search', label: 'Search', icon: Search },
      { href: '/dealer/notifications', label: 'Notifications', icon: Bell },
      { href: '/dealer/help', label: 'Help', icon: CircleHelp },
    ],
  },
];

const bottomNav = [
  { href: '/dealer', label: 'Home', icon: LayoutDashboard },
  { href: '/dealer/leads', label: 'Leads', icon: UserSearch },
  { href: '/dealer/inventory', label: 'Properties', icon: Package },
  { href: '/dealer/site-visits', label: 'Visits', icon: Calendar },
  { href: '/dealer/more', label: 'More', icon: MoreHorizontal },
];

const titles: Record<string, string> = {
  '/dealer': 'Home',
  '/dealer/inbox': 'Messages',
  '/dealer/settings/integrations': 'Integrations',
  '/dealer/settings/ai': 'AI provider',
  '/dealer/copilot': 'AI Copilot',
  '/dealer/leads': 'Leads',
  '/dealer/builder-leads': 'Builder leads',
  '/dealer/buyers': 'Buyers',
  '/dealer/inventory': 'Properties',
  '/dealer/matching': 'Matching',
  '/dealer/site-visits': 'Site visits',
  '/dealer/deals': 'Deals',
  '/dealer/deals/commissions': 'Commissions',
  '/dealer/network': 'Network',
  '/dealer/analytics': 'Analytics',
  '/dealer/tours': '3D tours',
  '/dealer/search': 'Search',
  '/dealer/notifications': 'Notifications',
  '/dealer/follow-ups': 'Follow-ups',
  '/dealer/performance': 'Performance',
  '/dealer/passport': 'Dealer Passport',
  '/dealer/coach': 'Sales Coach',
  '/dealer/settings': 'Settings',
  '/dealer/documents': 'Documents',
  '/dealer/tasks': 'Tasks',
  '/dealer/demand': 'Demand pool',
  '/dealer/help': 'Help',
  '/dealer/more': 'More',
};

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/dealer/onboarding')) {
    return <>{children}</>;
  }
  const title =
    Object.entries(titles)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([k]) => pathname === k || pathname.startsWith(`${k}/`))?.[1] ?? 'Workspace';
  return (
    <AppShell
      role="dealer"
      navGroups={navGroups}
      bottomNav={bottomNav}
      title={title}
      headerActions={
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <Link href="/dealer/copilot">Ask EstateFlow AI</Link>
          </Button>
          <Button asChild size="icon" variant="ghost" className="relative" aria-label="Notifications">
            <Link href="/dealer/notifications">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>
          <QuickAdd />
        </div>
      }
    >
      {children}
      <CopilotLauncher />
    </AppShell>
  );
}
