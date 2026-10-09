'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';
import { api, ApiError, getPendingSubjectId, setPendingSubjectId } from '@/lib/api-client';

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { notify } = useToast();
  const nextPath = params.get('next') || '/auth/sign-in';
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const subjectId = useMemo(() => getPendingSubjectId(), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    if (!subjectId && !email.includes('@')) {
      setError('Enter the email you used to sign up.');
      return;
    }
    setLoading(true);
    try {
      await api.verify({
        code,
        ...(subjectId ? { subjectId } : {}),
        ...(email.includes('@') ? { email: email.trim() } : {}),
      });
      setPendingSubjectId(null);
      notify('Email verified. You can sign in now.');
      router.push(nextPath.startsWith('/') ? nextPath : '/auth/sign-in');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code from sign-up. In local development the API returns the code in the sign-up
        response; production email delivery is not configured yet.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@agency.example"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/auth/sign-in" className="underline-offset-4 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <Suspense fallback={<p className="p-10 text-center text-sm text-muted-foreground">Loading verification…</p>}>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
