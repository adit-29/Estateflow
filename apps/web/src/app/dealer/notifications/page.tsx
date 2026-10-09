'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLiveMode } from '@/components/use-live-mode';
import { ApiError, api, type DeliveryRow, type DeliveryStatusView } from '@/lib/api-client';

interface Item {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt: string | null;
}

export default function NotificationsPage() {
  const mode = useLiveMode();
  const [items, setItems] = useState<Item[] | null>(null);
  const [note, setNote] = useState('Loading…');
  const [delivery, setDelivery] = useState<DeliveryStatusView | null>(null);
  const [failed, setFailed] = useState<DeliveryRow[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDeliveries = useCallback(() => {
    api.deliveryStatus().then(setDelivery).catch(() => setDelivery(null));
    api.deliveries('failed').then(setFailed).catch(() => setFailed([]));
  }, []);

  useEffect(() => {
    if (mode === 'loading') return;
    if (mode === 'demo') {
      setItems([]);
      setNote('Demo workspace does not show API notifications. Demo reminders stay in this browser and are never sent by SMS, WhatsApp, push, or email.');
      return;
    }
    api.listNotifications()
      .then((rows) => {
        setItems(rows);
        setNote(rows.length ? 'Stored notifications for this account.' : 'No notifications are stored yet.');
      })
      .catch(() => {
        setItems([]);
        setNote('Notifications could not be loaded.');
      });
    loadDeliveries();
  }, [mode, loadDeliveries]);

  async function act(id: string, action: 'retry' | 'dismiss') {
    setActionError(null);
    try {
      if (action === 'retry') await api.retryDelivery(id);
      else await api.dismissDelivery(id);
      loadDeliveries();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Action failed.');
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">{note}</p>
        </div>
        {mode === 'live' && items && items.some((item) => !item.readAt) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void api.markAllNotificationsRead().then(() => {
                setItems((rows) => rows?.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })) ?? []);
              });
            }}
          >
            Mark all read
          </Button>
        )}
      </div>
      {delivery && (
        <div className="rounded-xl border p-3 text-xs text-muted-foreground">
          <p>{delivery.summary}</p>
          <p className="mt-1">{delivery.message}</p>
        </div>
      )}
      {failed.length > 0 && (
        <section className="space-y-2 rounded-xl border border-destructive/40 p-3">
          <h3 className="text-sm font-medium">Failed deliveries</h3>
          {actionError && <p className="text-xs text-destructive">{actionError}</p>}
          <ul className="space-y-2">
            {failed.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {d.notification?.title ?? 'Notification'} · {d.channel} · {d.attempts} attempts
                  {d.lastError ? <span className="block text-xs text-muted-foreground">{d.lastError}</span> : null}
                </span>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => act(d.id, 'retry')}>
                    Retry
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => act(d.id, 'dismiss')}>
                    Dismiss
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {items?.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Nothing to show.</p> : null}
      <ul className="space-y-2">
        {items?.map((item) => (
          <li key={item.id} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{item.title}</p>
            <p className="text-muted-foreground">{item.body}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs">{item.readAt ? 'Read' : 'Unread'} · {item.kind.replace(/_/g, ' ')}</p>
              {!item.readAt && mode === 'live' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void api.markNotificationRead(item.id).then(() => {
                      setItems((rows) => rows?.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)) ?? []);
                    });
                  }}
                >
                  Mark read
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
