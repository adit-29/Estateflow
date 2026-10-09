'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';
import { api, ApiError } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.forgotPassword({ email: email.trim() });
      notify(result.resetCode ? `Local reset code ${result.resetCode}` : result.message);
      const q = new URLSearchParams({ email: email.trim() });
      router.push(`/auth/reset-password?${q}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start password reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Local auth issues a hashed reset code. No email is sent until a notification provider is configured.
          The response is the same whether or not the account exists.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Continue'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/auth/sign-in" className="underline-offset-4 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
