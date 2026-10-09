'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, setAccessToken } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { dealerNav } from './nav-config';
import type { SessionUser } from '@estateflow/shared';

export function DealerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith('/dealer/onboarding');
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(async (u) => {
        setUser(u);
        if (u.onboardingStatus === 'not_started' && !pathname.includes('/onboarding')) {
          router.replace('/dealer/onboarding');
          return;
        }
        if (u.onboardingStatus === 'not_started') return;
        try {
          await api.getOnboarding();
        } catch {
          if (!pathname.includes('/onboarding')) {
            router.replace('/dealer/onboarding');
          }
        }
      })
      .catch(() => router.replace('/auth/sign-in'))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  async function signOut() {
    try {
      await api.signOut();
    } finally {
      setAccessToken(null);
      router.push('/');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (isOnboarding) {
    return <>{children}</>;
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn('flex flex-col gap-1', mobile && 'px-2')} aria-label="Dealer navigation">
      {dealerNav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== '/dealer' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => mobile && setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {!item.ready && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Soon</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">EstateFlow</span>
          <button type="button" className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 hidden lg:block">
          <NavLinks />
        </div>
        <div className="p-3 lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
          <NavLinks mobile />
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t p-3 hidden lg:block">
          <p className="truncate text-xs text-muted-foreground mb-2">{user?.email}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b px-4 lg:px-6">
          <button
            type="button"
            className="lg:hidden rounded-md p-2 hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {user && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Status: {user.onboardingStatus.replace('_', ' ')}
            </span>
          )}
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={signOut}>
            Sign out
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
