import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicHeader } from '@/components/public-header';
import { RoleSignInInner } from './role-sign-in-inner';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Choose a workspace, then sign in to EstateFlow.',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <Suspense fallback={<p className="p-10 text-center text-sm text-muted-foreground">Loading sign-in…</p>}>
        <RoleSignInInner />
      </Suspense>
    </div>
  );
}
