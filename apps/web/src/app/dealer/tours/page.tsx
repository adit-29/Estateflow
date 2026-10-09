'use client';

import { useLiveMode } from '@/components/use-live-mode';
import { DemoTours } from '@/features/tours/demo-tours';
import { LiveTours } from '@/features/tours/live-tours';

export default function ToursPage() {
  const mode = useLiveMode();
  if (mode === 'loading') return <p className="text-sm text-muted-foreground">Loading workspace…</p>;
  return mode === 'live' ? <LiveTours /> : <DemoTours />;
}
