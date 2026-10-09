'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMode } from '@/components/use-live-mode';
import { ApiError, api, type AiStatus } from '@/lib/api-client';

export default function AiProviderSettingsPage() {
  const mode = useLiveMode();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'live') return;
    api
      .copilotStatus()
      .then(setStatus)
      .catch((e) => setResult(e instanceof ApiError ? e.message : 'Could not load AI status.'));
  }, [mode]);

  async function testConnection() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/backend/copilot/test', { method: 'POST', credentials: 'include' });
      const body = (await response.json()) as { detail?: string; message?: string };
      setResult(body.detail || body.message || `HTTP ${response.status}`);
      setStatus(await api.copilotStatus());
    } catch {
      setResult('Could not reach the API. No secret was stored in this browser.');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'loading') return <p className="text-sm text-muted-foreground">Loading workspace…</p>;

  if (mode === 'demo') {
    return (
      <div className="max-w-xl space-y-4">
        <h2 className="text-2xl font-semibold">AI provider</h2>
        <Badge variant="outline">DEMO MODE · Mock AI</Badge>
        <p className="text-sm text-muted-foreground">
          Demo chat uses the current demo CRM records in this browser and never calls a model API. Real accounts use the provider configured on the API server (`ollama`, `huggingface` / `hf`, or any OpenAI-compatible `/chat/completions` gateway).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-2xl font-semibold">AI provider</h2>
      <Badge variant="outline">{status?.label ?? 'Checking…'}</Badge>
      <p className="text-sm text-muted-foreground">
        The provider, model, and key live in the API server environment or its secrets manager. This page never accepts or shows a key.
      </p>
      {status && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Configured: {status.configured ? 'yes' : 'no'}</li>
          <li>Verified by a successful call: {status.verified ? 'yes' : 'not yet'}</li>
          {status.model && <li>Model: {status.model}</li>}
        </ul>
      )}
      {status?.setupGuidance && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{status.setupGuidance}</p>}
      <Button variant="accept" disabled={loading || !status?.configured} onClick={testConnection}>
        {loading ? 'Testing…' : 'Test connection'}
      </Button>
      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}
