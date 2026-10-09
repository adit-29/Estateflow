'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError } from '@/lib/api-client';
import { demoNetwork } from '@/lib/demo-seed';

interface DirectoryRow {
  id: string;
  fullName: string;
  verificationStatus?: string;
  specializations?: { localities: string[] };
  note?: string;
}

export default function NetworkPage() {
  const { notify } = useToast();
  const mode = useLiveMode();
  const [email, setEmail] = useState('');
  const [rows, setRows] = useState<DirectoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'demo') {
      setRows(demoNetwork.map((d) => ({ id: d.id, fullName: d.name, specializations: { localities: d.areas.split(',').map((s) => s.trim()) }, note: d.agency })));
    }
    if (mode === 'live') {
      api.networkDirectory()
        .then((body) => setRows(Array.isArray(body) ? (body as DirectoryRow[]) : []))
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Directory could not be loaded.'));
    }
  }, [mode]);

  async function invite() {
    if (!email.trim()) return;
    if (mode === 'demo') {
      notify('Invitation recorded (demo)');
      setEmail('');
      return;
    }
    try {
      await api.networkInvite({ inviteeEmail: email.trim() });
      notify('Invite stored. The other dealer must accept before any split is assumed.');
      setEmail('');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not send the invite.');
    }
  }

  if (mode === 'loading' || rows === null) return error ? <ErrorState title="Network unavailable" body={error} onRetry={() => window.location.reload()} /> : <PageSkeleton />;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Network"
        description="Collaborate with consent. Commission splits are never assumed — they must be recorded explicitly."
        primary={{ href: '/dealer/passport', label: 'View dealer passport' }}
      />
      <section className="rounded-xl border p-6 space-y-3">
        <h3 className="font-medium">Invite a dealer</h3>
        <Input placeholder="dealer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={() => void invite()}>Send invite</Button>
      </section>
      {rows.length === 0 ? (
        <EmptyState title="No directory profiles yet" body="Dealers appear here only after they opt into the directory." />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border p-3 text-sm">
              <p className="font-medium">{row.fullName}</p>
              <p className="text-muted-foreground">{(row.specializations?.localities ?? []).join(', ') || 'Areas hidden'}</p>
              {row.note && <p className="text-helper text-muted-foreground">{row.note}</p>}
            </li>
          ))}
        </ul>
      )}
      <Badge variant="muted">{mode === 'demo' ? 'Demo directory' : 'Live directory · opted-in profiles only'}</Badge>
    </div>
  );
}
