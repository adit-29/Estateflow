'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, LogOut, Menu, Pin, PinOff, Search, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { demoSignOut, getDemoSession } from '@/lib/demo-auth';
import { roleLabel } from '@/lib/demo-data';
import { api } from '@/lib/api-client';
import { cachedMe, clearCachedMe } from '@/lib/session-cache';
import { clearWorkspaceMode, getWorkspaceMode, usesDemoStore } from '@/lib/workspace';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@estateflow/shared';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const PIN_KEY = 'ef_sidebar_pinned_v2';

export function AppShell({
  role,
  nav,
  navGroups,
  bottomNav,
  children,
  title,
  headerActions,
}: {
  role: UserRole;
  nav?: NavItem[];
  navGroups?: NavGroup[];
  bottomNav?: NavItem[];
  children: React.ReactNode;
  title: string;
  headerActions?: React.ReactNode;
}) {
  const groups: NavGroup[] = useMemo(
    () => navGroups ?? [{ label: '', items: nav ?? [] }],
    [navGroups, nav],
  );
  const searchHref = role === 'dealer' || role === 'builder' ? `/${role}/search` : null;
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [demo, setDemo] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    setPinned(window.localStorage.getItem(PIN_KEY) === '1');
  }, []);

  useEffect(() => {
    const items = groups.flatMap((group) => group.items);
    for (const item of items) router.prefetch(item.href);
  }, [router, groups]);

  useEffect(() => {
    if (!searchHref) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        router.push(searchHref);
      }
      if (event.key === 'Escape' && !pinned) setHoverOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, searchHref, pinned]);

  useEffect(() => {
    const mode = getWorkspaceMode();
    if (usesDemoStore(mode)) {
      const session = getDemoSession();
      if (!session || session.role !== role) {
        router.replace(`/auth/sign-in?role=${role}`);
        return;
      }
      setUser(session);
      setDemo(true);
      setReady(true);
      return;
    }
    cachedMe()
      .then((account) => {
        if (account.role !== role) {
          router.replace(`/auth/sign-in?role=${role}`);
          return;
        }
        const local = account.email.split('@')[0] || 'there';
        setUser({ name: local, email: account.email });
        void api.getOnboarding()
          .then((row) => {
            const profile = row.profile as { fullName?: string } | null;
            if (profile?.fullName) setUser({ name: profile.fullName, email: account.email });
          })
          .catch(() => undefined);
        setDemo(false);
        setReady(true);
      })
      .catch(() => {
        clearWorkspaceMode();
        router.replace(`/auth/sign-in?role=${role}`);
      });
  }, [role, router]);

  function signOut() {
    if (demo) demoSignOut();
    else void api.signOut().catch(() => undefined);
    clearCachedMe();
    clearWorkspaceMode();
    router.push('/');
  }

  function setPinnedPref(next: boolean) {
    setPinned(next);
    window.localStorage.setItem(PIN_KEY, next ? '1' : '0');
    if (next) setHoverOpen(false);
  }

  function openHover() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setHoverOpen(true);
  }

  function scheduleHide() {
    if (pinned) return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setHoverOpen(false), 220);
  }

  if (!ready || !user) {
    return (
      <div className="min-h-screen space-y-4 bg-background p-8">
        <p className="text-body text-muted-foreground">Opening your {roleLabel(role).toLowerCase()}…</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    );
  }

  const drawerOpen = pinned || hoverOpen;

  const Nav = ({ mobile }: { mobile?: boolean }) => (
    <nav className="flex flex-col gap-5 p-3" aria-label="Primary">
      {groups.map((group) => (
        <div key={group.label || 'nav'}>
          {group.label ? (
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {group.label}
            </p>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== `/${role}` && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    if (mobile) setMobileOpen(false);
                    if (!pinned) setHoverOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                    active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground/80 hover:bg-muted',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <Badge variant="muted" className="text-helper">{item.badge}</Badge>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const Drawer = ({ mobile }: { mobile?: boolean }) => (
    <>
      <div className={cn(
        'flex h-16 items-center gap-2 border-b px-4',
        role === 'dealer' && 'bg-gradient-to-r from-teal-50 to-sky-50',
        role === 'builder' && 'bg-gradient-to-r from-indigo-50 to-violet-50',
        role === 'buyer' && 'bg-gradient-to-r from-orange-50 to-amber-50',
        role === 'seller' && 'bg-gradient-to-r from-violet-50 to-fuchsia-50',
      )}>
        <Building2 className={cn(
          'h-5 w-5 shrink-0',
          role === 'builder' && 'text-indigo-600',
          role === 'buyer' && 'text-orange-600',
          role === 'seller' && 'text-violet-600',
          role === 'dealer' && 'text-primary',
        )} />
        <span className="truncate font-semibold">EstateFlow</span>
        {mobile && (
          <button type="button" className="ml-auto" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Nav mobile={mobile} />
      </div>
      <div className="space-y-2 border-t p-3">
        <Link
          href={role === 'dealer' ? '/dealer/settings' : `/${role}`}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <UserRound className="h-4 w-4" />
          {user.name}
        </Link>
        <p className="truncate px-3 text-helper text-muted-foreground">{user.email}</p>
        <Badge variant="outline" className="ml-3">{demo ? 'Demo workspace' : 'Real account'}</Badge>
        <Button variant="outline" size="sm" className="w-full" onClick={signOut} aria-label="Sign out">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        {!mobile && (
          <button
            type="button"
            className="hidden w-full items-center justify-center gap-2 rounded-md border py-1.5 text-meta text-muted-foreground hover:bg-muted lg:flex"
            onClick={() => setPinnedPref(!pinned)}
            aria-pressed={pinned}
            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {pinned ? 'Auto-hide' : 'Keep open'}
          </button>
        )}
      </div>
    </>
  );

  const roleSurface =
    role === 'dealer' ? 'role-dealer' :
    role === 'builder' ? 'role-builder' :
    role === 'buyer' ? 'role-buyer' :
    role === 'seller' ? 'role-seller' : '';

  return (
    <div className={cn('flex min-h-screen bg-background', roleSurface)}>
      {pinned && (
        <aside className="relative hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
          <Drawer />
        </aside>
      )}

      {!pinned && (
        <div
          className={cn('fixed inset-y-0 left-0 z-40 hidden lg:block', drawerOpen ? 'w-64' : 'w-4')}
          onMouseEnter={openHover}
          onMouseLeave={scheduleHide}
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-primary/30" />
          <aside
            className={cn(
              'absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-card shadow-2xl transition-transform duration-200',
              drawerOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <Drawer />
          </aside>
        </div>
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Drawer mobile />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-white/70 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hidden rounded-md p-2 hover:bg-muted lg:inline-flex"
            onClick={() => { if (!pinned) setHoverOpen(true); }}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-helper text-muted-foreground">{roleLabel(role)}</p>
            <h1 className="truncate text-card">{title}</h1>
          </div>
          {searchHref ? (
            <Link href={searchHref} className="hidden w-56 items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-body text-muted-foreground hover:bg-muted lg:flex">
              <Search className="h-4 w-4" />
              <span>Search records…</span>
              <kbd className="ml-auto text-helper text-muted-foreground">Ctrl K</kbd>
            </Link>
          ) : null}
          {headerActions}
          <Badge variant="muted" className="hidden sm:inline-flex">{demo ? 'Demo data' : 'Live data'}</Badge>
        </header>
        <main className={cn('mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8', bottomNav && 'pb-24 lg:pb-8')}>{children}</main>
        {bottomNav && (
          <nav
            className={cn(
              'fixed inset-x-0 bottom-0 z-30 grid border-t bg-card lg:hidden',
              (bottomNav?.length ?? 0) >= 5 ? 'grid-cols-5' : 'grid-cols-4',
            )}
            aria-label="Mobile"
          >
            {bottomNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(`${item.href}/`));
              return (
                <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1 px-2 py-2 text-helper', active ? 'text-primary' : 'text-muted-foreground')}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
