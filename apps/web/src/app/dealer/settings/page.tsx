'use client';

import Link from 'next/link';
import { useState } from 'react';
import { resetDemoStore } from '@/lib/demo-data';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';
import { useLiveMode } from '@/components/use-live-mode';

export default function SettingsPage() {
  const mode = useLiveMode();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);

  function reset() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    resetDemoStore();
    setConfirming(false);
    notify('Demo data reset');
    window.location.reload();
  }

  if (mode === 'loading') return <p className="text-sm text-muted-foreground">Loading workspace…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">{mode === 'live' ? 'Agency settings. Demo records are not used here.' : 'Demo workspace preferences'}</p>
      </div>
      <section className="rounded-xl border p-6 space-y-3">
        <h3 className="font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          {mode === 'live'
            ? 'Connection status comes from the API. A service is never shown as connected unless its own check has passed.'
            : 'WhatsApp, Messenger, and Instagram stay disconnected in the demo workspace.'}
        </p>
        <Button variant="outline" asChild>
          <Link href="/dealer/settings/integrations">Open integrations</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dealer/settings/ai">AI provider</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dealer/tours">3D tours</Link>
        </Button>
      </section>
      {mode === 'demo' ? (
        <section className="rounded-xl border p-6 space-y-4">
          <h3 className="font-medium">Demo data</h3>
          <p className="text-sm text-muted-foreground">
            Clears fictional records stored in this browser only. It does not delete agency records in the API database.
          </p>
          <Button variant={confirming ? 'destructive' : 'outline'} onClick={reset}>
            {confirming ? 'Click again to confirm reset' : 'Reset demo data'}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
