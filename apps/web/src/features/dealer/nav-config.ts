import {
  BarChart3,
  Bot,
  Calendar,
  Handshake,
  LayoutDashboard,
  Link2,
  Package,
  Settings,
  Shuffle,
  Users,
  UserSearch,
} from 'lucide-react';

export const dealerNav = [
  { href: '/dealer', label: 'Overview', icon: LayoutDashboard, ready: true },
  { href: '/dealer/copilot', label: 'Copilot', icon: Bot, ready: false, phase: 'Phase 8' },
  { href: '/dealer/leads', label: 'Leads', icon: UserSearch, ready: true },
  { href: '/dealer/buyers', label: 'Buyers', icon: Users, ready: true },
  { href: '/dealer/inventory', label: 'Inventory', icon: Package, ready: true },
  { href: '/dealer/matching', label: 'Matching', icon: Shuffle, ready: true },
  { href: '/dealer/site-visits', label: 'Site Visits', icon: Calendar, ready: true },
  { href: '/dealer/deals', label: 'Deals & Commissions', icon: Handshake, ready: true },
  { href: '/dealer/network', label: 'Network', icon: Link2, ready: true },
  { href: '/dealer/analytics', label: 'Analytics', icon: BarChart3, ready: false },
  { href: '/dealer/settings', label: 'Settings', icon: Settings, ready: false },
] as const;
