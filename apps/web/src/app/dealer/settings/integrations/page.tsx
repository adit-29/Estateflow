'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMode } from '@/components/use-live-mode';
import { ApiError, api, type InboxStatus, type SystemSetup } from '@/lib/api-client';

const cards = [
  {
    key: 'whatsapp' as const,
    name: 'WhatsApp Business',
    body: 'Official WhatsApp Business Platform (Cloud API) only. Requires a business phone number, access token, webhook verify token, and app secret on the API server. Free-form replies work within 24 hours of the buyer’s last message; outside that, Meta requires approved templates, which are not set up yet.',
  },
  {
    key: 'facebook_messenger' as const,
    name: 'Facebook Messenger',
    body: 'Page-level Messenger only. Webhooks are verified and recorded, but messages are not processed yet. Personal inboxes are not supported.',
  },
  {
    key: 'instagram' as const,
    name: 'Instagram',
    body: 'Professional Instagram accounts linked through Meta. Webhooks are verified and recorded, but messages are not processed yet. Personal inboxes are not available.',
  },
];

export default function IntegrationsPage() {
  const mode = useLiveMode();
  const [status, setStatus] = useState<InboxStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [confirmLink, setConfirmLink] = useState(false);

  useEffect(() => {
    if (mode !== 'live') return;
    api
      .inboxStatus()
      .then(setStatus)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load integration status.'));
  }, [mode]);

  async function link() {
    setLinking(true);
    setError(null);
    try {
      setStatus(await api.connectWhatsApp());
      setConfirmLink(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not link WhatsApp.');
    } finally {
      setLinking(false);
    }
  }

  if (mode === 'loading') return <p className="text-sm text-muted-foreground">Loading workspace…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'demo'
            ? 'Demo workspace: the inbox uses simulated conversations stored in this browser. No channel is connected.'
            : 'A channel shows Connected only after the API has credentials and has received a signature-verified webhook for your agency.'}
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {cards.map((card) => {
        const live = mode === 'live' ? status?.[card.key] : undefined;
        const wa = card.key === 'whatsapp' ? status?.whatsapp : undefined;
        return (
          <section key={card.name} className="space-y-3 rounded-xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{card.name}</h3>
              <Badge variant="outline">{mode === 'demo' ? 'Not connected' : live?.label ?? 'Checking…'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{card.body}</p>
            {wa && (
              <p className="text-xs text-muted-foreground">
                Last verified webhook: {wa.lastVerifiedWebhookAt ? new Date(wa.lastVerifiedWebhookAt).toLocaleString('en-IN') : 'none'}
              </p>
            )}
            {wa?.state === 'setup_required' &&
              (confirmLink ? (
                <div className="space-y-2 rounded-md border p-3 text-sm">
                  <p>Link the WhatsApp number configured on this server to your agency? Incoming messages to that number will appear in your inbox. Only owners and admins can do this.</p>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={linking} onClick={link}>
                      {linking ? 'Linking…' : 'Confirm link'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmLink(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setConfirmLink(true)}>
                  Link to this agency
                </Button>
              ))}
            {wa?.state === 'awaiting_webhook' && (
              <p className="text-xs">Linked. Send a message to the business number from any phone; the status changes once Meta’s signed webhook arrives.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Credentials are set as server environment variables (see `.env.example` and docs/whatsapp.md). Tokens are never stored in the browser.
            </p>
          </section>
        );
      })}
      {mode === 'live' ? <ServerSetup /> : null}
    </div>
  );
}

const SETUP_LABEL: Record<string, string> = {
  not_configured: 'Not configured',
  configured_unverified: 'Configured · not verified',
  not_implemented: 'Not implemented',
  local_only: 'Local only',
  ready: 'Ready',
};

function ServerSetup() {
  const [setup, setSetup] = useState<SystemSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.systemSetup().then(setSetup).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load server setup.'));
  }, []);
  return (
    <section className="space-y-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Server setup</h3>
        {setup ? <Badge variant="outline">Environment: {setup.env}</Badge> : null}
      </div>
      <p className="text-sm text-muted-foreground">Which server-side integrations have configuration present. Values are never sent to the browser, and presence is not a connection check.</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {setup ? (
        <ul className="divide-y text-sm">
          {setup.integrations.map((i) => (
            <li key={i.key} className="space-y-1 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{i.name}</span>
                <Badge variant={i.state === 'ready' ? 'default' : 'outline'}>{SETUP_LABEL[i.state] ?? i.state}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{i.label}. {i.note}</p>
              {i.requiredEnv.length > 0 && i.state !== 'ready' ? <p className="text-xs text-muted-foreground">Server variables: {i.requiredEnv.join(', ')}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
