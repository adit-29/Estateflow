'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PublicHeader } from '@/components/public-header';
import { SecureTourViewer } from '@/components/tour-viewer';
import { api, type SharedTourView } from '@/lib/api-client';

export default function SharedTourPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<SharedTourView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.sharedTour(token).then(setView).catch((e) => setError(e instanceof Error ? e.message : 'This tour link is not available.'));
  }, [token]);

  return (
    <div>
      <PublicHeader />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        {error ? <p className="text-sm">{error}</p> : null}
        {!error && !view ? <p className="text-sm text-muted-foreground">Loading tour…</p> : null}
        {view ? (
          <>
            <div>
              <h1 className="text-2xl font-semibold">{view.property.title}</h1>
              <p className="text-sm text-muted-foreground">{view.property.locality} · shared 3D tour · link expires {new Date(view.expiresAt).toLocaleDateString('en-IN')}</p>
            </div>
            <SecureTourViewer model={view.model} video={view.video} />
          </>
        ) : null}
      </div>
    </div>
  );
}
