'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, api, setPendingSubjectId } from '@/lib/api-client';
import { setWorkspaceMode } from '@/lib/workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLabel, setAuthLabel] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const modeInfo = await api.getAuthMode();
      setAuthLabel(modeInfo.label);
      if (!modeInfo.configured) {
        setError('Authentication provider not configured.');
        return;
      }

      if (mode === 'sign-up') {
        const res = await api.signUp({ email, password, role: 'dealer' });
        setPendingSubjectId(res.subjectId);
        if (res.devVerifyCode) {
          sessionStorage.setItem('ef_dev_code', res.devVerifyCode);
        }
        router.push('/auth/verify');
        return;
      }

      const res = await api.signIn({ email, password });
      setWorkspaceMode('live');
      if (res.user.onboardingStatus === 'not_started') {
        router.push('/dealer/onboarding');
      } else {
        router.push('/dealer');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setError('Please verify your email before signing in.');
        } else if (err.code === 'SESSION_EXPIRED') {
          setError('Your session has expired. Please sign in again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {authLabel && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Auth mode: {authLabel}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Please wait…' : mode === 'sign-up' ? 'Create dealer account' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === 'sign-up' ? (
          <>
            Already registered?{' '}
            <Link href="/auth/sign-in" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New dealer?{' '}
            <Link href="/auth/sign-up" className="text-primary underline-offset-4 hover:underline">
              Create account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
