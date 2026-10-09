import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignUpInner } from './sign-up-inner';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create your EstateFlow account.',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/20">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Dealer sign-up stores name, phone, company and operating areas, then continues to verification and onboarding.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <SignUpInner />
          </Suspense>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/get-started">← Back to role selection</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
