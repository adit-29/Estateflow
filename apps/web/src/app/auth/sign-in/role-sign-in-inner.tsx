'use client';

import { useSearchParams } from 'next/navigation';
import { RoleSignInForm } from '@/features/auth/role-sign-in';
import { parseRoleParam, RolePicker } from '@/features/auth/role-picker';

export function RoleSignInInner() {
  const params = useSearchParams();
  const role = parseRoleParam(params.get('role'));
  if (!role) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <RolePicker heading="Sign in to EstateFlow" />
      </div>
    );
  }
  return <RoleSignInForm role={role} />;
}
