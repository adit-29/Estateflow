'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, HardHat, Home, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@estateflow/shared';
import { DEMO_ENABLED } from '@/lib/demo-policy';
import { demoSignIn, homePathForRole } from '@/lib/demo-auth';
import { setWorkspaceMode } from '@/lib/workspace';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

export const ROLE_CARDS: {
  id: UserRole;
  title: string;
  description: string;
  demoLabel: string;
  icon: typeof Briefcase;
  tone: string;
}[] = [
  {
    id: 'dealer',
    title: 'Dealer',
    description: 'Leads, matching, visits, deals, and commissions.',
    demoLabel: 'Open dealer demo',
    icon: Briefcase,
    tone: 'from-teal-50 to-white border-teal-100',
  },
  {
    id: 'buyer',
    title: 'Buyer',
    description: 'Search, save homes, and manage visits. Saving a home does not contact a dealer.',
    demoLabel: 'Open buyer demo',
    icon: Home,
    tone: 'from-amber-50 to-white border-amber-100',
  },
  {
    id: 'builder',
    title: 'Builder',
    description: 'Projects, dealer routing, and walkthrough jobs on file.',
    demoLabel: 'Open builder demo',
    icon: HardHat,
    tone: 'from-indigo-50 to-white border-indigo-100',
  },
  {
    id: 'seller',
    title: 'Seller / Owner',
    description: 'List a property and track owner enquiries.',
    demoLabel: 'Open owner demo',
    icon: Store,
    tone: 'from-violet-50 to-white border-violet-100',
  },
];

export const VALID_ROLES: UserRole[] = ['dealer', 'buyer', 'builder', 'seller'];

export function parseRoleParam(value: string | null): UserRole | null {
  if (value && VALID_ROLES.includes(value as UserRole)) return value as UserRole;
  return null;
}

export function RolePicker({
  heading = 'How do you want to sign in?',
  next = 'signin',
}: {
  heading?: string;
  next?: 'signin' | 'signup';
}) {
  const router = useRouter();
  const { notify } = useToast();

  function exploreDemo(role: UserRole) {
    if (!DEMO_ENABLED) return;
    setWorkspaceMode('demo');
    const user = demoSignIn(role);
    notify(`Demo workspace — ${user.name}`);
    router.push(homePathForRole(user.role));
  }

  return (
    <div>
      <p className="text-sm font-medium text-amber-700">Workspaces</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Pick a workspace first. Dealer is not assumed. Live accounts stay empty until you add records.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ROLE_CARDS.map((role) => {
          const Icon = role.icon;
          return (
            <article key={role.id} className={cn('rounded-2xl border bg-gradient-to-b p-5 shadow-sm', role.tone)}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{role.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
              <div className="mt-5 flex flex-col gap-2">
                <Button asChild className="bg-amber-400 text-black hover:bg-amber-300">
                  <Link href={`/auth/${next === 'signup' ? 'sign-up' : 'sign-in'}?role=${role.id}`}>
                    Continue as {role.title}
                  </Link>
                </Button>
                {DEMO_ENABLED && (
                  <Button type="button" variant="outline" onClick={() => exploreDemo(role.id)}>
                    {role.demoLabel}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
