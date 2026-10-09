'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@estateflow/shared';
import {
  DEMO_PASSWORD,
  DEMO_USERS,
  demoSignIn,
  demoSignInWithPassword,
  homePathForRole,
} from '@/lib/demo-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/toast';
import { api, ApiError } from '@/lib/api-client';
import { setWorkspaceMode } from '@/lib/workspace';
import { DEMO_ENABLED } from '@/lib/demo-policy';
import { ROLE_CARDS } from '@/features/auth/role-picker';
import { cn } from '@/lib/utils';

const roleTitles: Record<UserRole, string> = {
  dealer: 'Dealer',
  buyer: 'Buyer',
  builder: 'Builder',
  seller: 'Seller / Owner',
};

const ROLE_STORY: Record<UserRole, { kicker: string; title: string; body: string; points: string[] }> = {
  dealer: {
    kicker: 'Dealer Connect',
    title: 'Run the desk from one workspace',
    body: 'Leads, matching, visits, deals, and commissions. Live accounts stay empty until you add records.',
    points: ['Buyer pipeline on file', 'Inventory and matching', 'Copilot drafts from CRM records'],
  },
  buyer: {
    kicker: 'Buyers',
    title: 'Search, save, and visit',
    body: 'A demo preview of the buyer portal. Saving a home does not contact a dealer.',
    points: ['Saved homes', 'Visit requests', 'Compare listings'],
  },
  builder: {
    kicker: 'Developers',
    title: 'Projects and dealer routing',
    body: 'Towers, units, site visits, and walkthrough jobs that are already on file.',
    points: ['Assign buyers to dealers', '3D tour jobs', 'Project inventory'],
  },
  seller: {
    kicker: 'Owners',
    title: 'List and track enquiries',
    body: 'Owner workspace for listing a property. This is a demo preview until a live owner account is created.',
    points: ['List a home', 'Owner enquiries', 'Demo catalogue only'],
  },
};

const ROLE_PILLS: { id: UserRole; label: string }[] = [
  { id: 'dealer', label: 'Dealer' },
  { id: 'buyer', label: 'Buyer' },
  { id: 'builder', label: 'Builder' },
  { id: 'seller', label: 'Owner' },
];

export function RoleSignInForm({ role }: { role: UserRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveAccount = role === 'dealer' || role === 'builder';
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(liveAccount ? null : false);
  const demoUser = DEMO_USERS[role];
  const story = ROLE_STORY[role];

  useEffect(() => {
    if (role !== 'dealer' && role !== 'builder') return;
    api.getAuthMode()
      .then((mode) => setAuthConfigured(mode.configured))
      .catch(() => setAuthConfigured(false));
  }, [role]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    setLoading(true);
    if (role === 'dealer' || role === 'builder') {
      if (!authConfigured) {
        setLoading(false);
        setError('Authentication provider not configured.');
        return;
      }
      try {
        const result = await api.signIn({ email: email.trim(), password });
        if (result.user.role !== role) {
          await api.signOut().catch(() => undefined);
          setError(`This account is a ${result.user.role} account.`);
          setLoading(false);
          return;
        }
        setWorkspaceMode('live');
        notify(`Signed in as ${result.user.email}`);
        router.push(homePathForRole(role));
      } catch (err) {
        if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
          const q = new URLSearchParams({ email: email.trim() });
          notify('Verify your email before signing in.');
          router.push(`/auth/verify?${q}`);
          setLoading(false);
          return;
        }
        const message = err instanceof ApiError ? err.message : 'Sign-in failed.';
        setError(message.includes('not configured') ? 'Authentication provider not configured.' : message);
      } finally {
        setLoading(false);
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
    const user = demoSignInWithPassword(role, email, password);
    setLoading(false);
    if (!user) {
      setError(DEMO_ENABLED ? 'Invalid demo credentials. Use the demo email and password shown below.' : `${roleTitles[role]} accounts are not available yet.`);
      return;
    }
    setWorkspaceMode('demo');
    notify(`Signed in as ${user.name} (demo preview)`);
    router.push(homePathForRole(role));
  }

  function exploreDemo() {
    if (!DEMO_ENABLED) return;
    setWorkspaceMode('demo');
    const user = demoSignIn(role);
    notify(`Demo workspace started for ${roleTitles[role]}`);
    router.push(homePathForRole(user.role));
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#111] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">{story.kicker}</p>
          <h1 className="mt-4 max-w-md text-3xl font-semibold tracking-tight">{story.title}</h1>
          <p className="mt-3 max-w-md text-sm text-white/70">{story.body}</p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {story.points.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="mx-auto max-w-lg text-xs text-white/45">
          {ROLE_CARDS.find((item) => item.id === role)?.description} Public cards stay demo unless you are on a live account.
        </p>
      </aside>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="grid grid-cols-4 gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
            {ROLE_PILLS.map((item) => (
              <Link
                key={item.id}
                href={`/auth/sign-in?role=${item.id}`}
                className={cn(
                  'rounded-full px-2 py-2 text-center text-xs font-medium sm:text-sm',
                  role === item.id ? 'bg-amber-400 text-black' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium text-amber-700">{roleTitles[role]}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground lg:hidden">{story.body}</p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {searchParams.get('verified') && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Email verified — sign in to continue.
                </p>
              )}
              {error && (
                <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-12 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={demoUser.email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={remember} onCheckedChange={(c) => setRemember(c === true)} />
                Remember me on this device
              </label>
              {(role === 'dealer' || role === 'builder') && authConfigured === false && (
                <p className="text-sm text-muted-foreground">
                  Authentication provider not configured. {DEMO_ENABLED ? 'You can still open the fictional demo workspace below. ' : ''}Cognito is not connected.
                </p>
              )}
              <Button
                type="submit"
                className="h-12 w-full bg-amber-400 text-black hover:bg-amber-300"
                disabled={loading || ((role === 'dealer' || role === 'builder') && authConfigured === false)}
              >
                {loading ? 'Signing in…' : `Sign in as ${roleTitles[role]}`}
              </Button>
            </form>

            {DEMO_ENABLED && (
              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-sm font-medium">Explore demo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Local preview account — not production security.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Email <code className="rounded bg-white px-1">{demoUser.email}</code>
                  {DEMO_PASSWORD ? (
                    <>
                      {' '}· password <code className="rounded bg-white px-1">{DEMO_PASSWORD}</code>
                    </>
                  ) : null}
                </p>
                <Button type="button" variant="outline" className="mt-3 w-full bg-white" onClick={exploreDemo} disabled={loading}>
                  Open {roleTitles[role]} demo
                </Button>
              </div>
            )}

            {liveAccount && (
              <p className="mt-4 text-center text-sm">
                <Link href="/auth/forgot-password" className="text-muted-foreground underline-offset-4 hover:underline">
                  Forgot password
                </Link>
              </p>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here?{' '}
              <Link href={`/auth/sign-up?role=${role}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
            <p className="mt-2 text-center">
              <Link href="/auth/sign-in" className="text-sm text-muted-foreground hover:text-foreground">
                Choose a different role
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
