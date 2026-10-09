'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnquiriesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/builder/leads');
  }, [router]);
  return <p className="text-sm text-muted-foreground">Opening leads…</p>;
}
