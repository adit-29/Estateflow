'use client';

import { PublicHeader } from '@/components/public-header';
import { RolePicker } from '@/features/auth/role-picker';

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <RolePicker heading="Get started on EstateFlow" />
      </div>
    </div>
  );
}
