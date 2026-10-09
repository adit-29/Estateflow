'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getDemoStore, type DemoVisit } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError, type SiteVisitRow } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ux';
import { prettyStatus, VISIT_STATUS_LABEL } from '@/features/dealer/labels';

export default function SiteVisitsPage() {
  const [visits, setVisits] = useState<DemoVisit[]>([]);
  const [live, setLive] = useState<SiteVisitRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleWhen, setRescheduleWhen] = useState('');
  const [interest, setInterest] = useState('Interested');
  const [nextAction, setNextAction] = useState('Follow-up');
  const mode = useLiveMode();
  const { notify } = useToast();

  const loadLive = useCallback(() => {
    setError(null);
    api.listSiteVisits({ pageSize: 50 })
      .then((page) => setLive(page.items))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'We could not load site visits.'));
  }, []);

  useEffect(() => {
    if (mode === 'demo') setVisits(getDemoStore().dealer.visits);
    if (mode === 'live') loadLive();
  }, [mode, loadLive]);

  async function reschedule(id: string) {
    if (!rescheduleWhen) {
      notify('Choose a new date and time.');
      return;
    }
    try {
      await api.updateSiteVisit(id, { scheduledAt: new Date(rescheduleWhen).toISOString() });
      notify('Visit rescheduled. The buyer is not messaged automatically.');
      setRescheduleId(null);
      loadLive();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not reschedule the visit.');
    }
  }

  async function setStatus(id: string, status: string, extra?: Record<string, string>) {
    try {
      await api.updateVisitFeedback(id, { status, ...extra });
      notify(`Visit ${status.replace(/_/g, ' ')}`);
      setCompleteId(null);
      loadLive();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not update the visit.');
    }
  }

  if (mode === 'loading') return <PageSkeleton />;
  if (error) return <ErrorState title="Visits unavailable" body={error} onRetry={loadLive} />;
  if (mode === 'live' && live === null) return <PageSkeleton />;

  const rows = mode === 'live'
    ? (live ?? []).map((v) => ({
      id: v.id,
      property: v.property?.title ?? v.meetingPoint,
      buyer: v.buyerRequirement?.contactName ?? 'Buyer not linked',
      when: new Date(v.scheduledAt).toLocaleString('en-IN'),
      status: v.status,
      maps: v.property?.locality ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.property.title} ${v.property.locality}`)}` : null,
    }))
    : visits.map((v) => ({
      id: v.id,
      property: v.propertyTitle,
      buyer: v.buyerName,
      when: v.when,
      status: v.status,
      maps: null as string | null,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site visits"
        description={mode === 'live' ? 'Agency calendar. Confirming here does not message the buyer.' : 'Upcoming visits from the demo store. Recording an outcome here does not message the buyer.'}
        primary={{ href: '/dealer/site-visits/new', label: 'Schedule visit' }}
      />
      {rows.length === 0 ? (
        <EmptyState title="No visits scheduled" body="Schedule a visit against a buyer and a property you already have on file." action={{ href: '/dealer/site-visits/new', label: 'Schedule visit' }} />
      ) : (
        <ul className="space-y-3">
          {rows.map((v) => (
            <li key={v.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{v.property}</p>
                  <p className="text-sm text-muted-foreground">{v.buyer} · {v.when}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/propos|pending/i.test(v.status) && <Badge variant="outline">Confirmation pending</Badge>}
                  <Badge variant="outline">{prettyStatus(v.status, VISIT_STATUS_LABEL)}</Badge>
                </div>
              </div>
              {mode === 'live' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {v.status === 'proposed' && <Button size="sm" onClick={() => setStatus(v.id, 'confirmed')}>Confirm</Button>}
                  {v.status !== 'completed' && v.status !== 'cancelled' && v.status !== 'no_show' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setRescheduleId(v.id); setCompleteId(null); }}>Reschedule</Button>
                      <Button size="sm" variant="outline" onClick={() => setCompleteId(v.id)}>Complete</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(v.id, 'cancelled')}>Cancel</Button>
                    </>
                  )}
                  {v.maps && <Button asChild size="sm" variant="outline"><a href={v.maps} target="_blank" rel="noreferrer">Navigate</a></Button>}
                  <Button asChild size="sm" variant="outline"><Link href="/dealer/coach">Notes</Link></Button>
                </div>
              )}
              {rescheduleId === v.id && (
                <form
                  className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border p-3 text-sm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void reschedule(v.id);
                  }}
                >
                  <label className="block">
                    New time
                    <input
                      type="datetime-local"
                      className="mt-1 h-9 rounded-md border px-2"
                      value={rescheduleWhen}
                      onChange={(e) => setRescheduleWhen(e.target.value)}
                      required
                    />
                  </label>
                  <Button size="sm" type="submit">Save time</Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => setRescheduleId(null)}>Cancel</Button>
                </form>
              )}
              {completeId === v.id && (
                <form
                  className="mt-3 space-y-2 rounded-lg border p-3 text-sm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void setStatus(v.id, 'completed', { buyerFeedback: interest, nextAction });
                  }}
                >
                  <label className="block">
                    Interest level
                    <select className="mt-1 h-9 w-full rounded-md border px-2" value={interest} onChange={(e) => setInterest(e.target.value)}>
                      {['Very Interested', 'Interested', 'Neutral', 'Not Interested'].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    Next action
                    <select className="mt-1 h-9 w-full rounded-md border px-2" value={nextAction} onChange={(e) => setNextAction(e.target.value)}>
                      {['Follow-up', 'Negotiation', 'Another Visit', 'Lost'].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" type="submit">Save outcome</Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => setCompleteId(null)}>Cancel</Button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
