'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatInr } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMode } from '@/components/use-live-mode';
import { ApiError, api, type SiteVisitRow, type VisitBrief } from '@/lib/api-client';
import { getDemoStore } from '@/lib/demo-data';

export default function CoachPage() {
  const mode = useLiveMode();
  if (mode === 'loading') return <p className="text-sm text-muted-foreground">Loading workspace…</p>;
  return mode === 'live' ? <LiveCoach /> : <DemoCoach />;
}

function DemoCoach() {
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState('');
  const [buyer, setBuyer] = useState('Ananya Sharma');
  const [requirement, setRequirement] = useState('');

  useEffect(() => {
    const lead = getDemoStore().dealer.leads.find((row) => row.name === 'Ananya Sharma');
    setRequirement(lead?.summary ?? 'No requirement stored.');
    setBuyer(lead?.name ?? 'No buyer selected');
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Sales Coach</h2>
        <Badge variant="outline">Demo</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Suggestions use stored demo facts. They are not a read of the buyer’s private thoughts.</p>
      <section className="rounded-xl border p-4 text-sm">
        <h3 className="font-medium">Pre-visit brief</h3>
        <p className="mt-2">Buyer: {buyer}</p>
        <p>Recorded requirement: {requirement}</p>
        <p className="mt-2">Recorded next step: confirm the visit time already stored on the site-visit list. No calendar invite was sent.</p>
      </section>
      <section className="space-y-2 rounded-xl border p-4">
        <h3 className="font-medium">Post-visit note</h3>
        <textarea className="min-h-24 w-full rounded-md border p-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Visit note" />
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => setSummary(note.trim() ? `Structured note for review (demo, no AI): ${note.trim()}` : 'Write a note before generating a summary.')}
        >
          Summarise for review
        </button>
        {summary && <p className="text-sm">{summary}</p>}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      {value === null || value === undefined || value === '' ? <span className="italic text-muted-foreground">not recorded</span> : value}
    </p>
  );
}

function LiveCoach() {
  const [visits, setVisits] = useState<SiteVisitRow[] | null>(null);
  const [visitId, setVisitId] = useState('');
  const [brief, setBrief] = useState<VisitBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<{ text: string; label: string } | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .listSiteVisits()
      .then((r) => setVisits(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Visits could not be loaded.'));
  }, []);

  useEffect(() => {
    if (!visitId) return;
    setBrief(null);
    setSummary(null);
    api
      .visitBrief(visitId)
      .then(setBrief)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Brief could not be loaded.'));
  }, [visitId]);

  async function summarise() {
    setLoading(true);
    setSummaryError(null);
    try {
      const out = await api.visitSummary(visitId, notes);
      setSummary({ text: out.summary, label: out.label });
    } catch (e) {
      setSummaryError(e instanceof ApiError ? e.message : 'Summary unavailable.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold">Sales Coach</h2>
      <p className="text-sm text-muted-foreground">
        Briefs use your saved requirements, interactions, and property facts. No purchase-probability or intent prediction is made.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <label className="block text-sm">
        Site visit
        <select className="mt-1 w-full rounded-md border p-2" value={visitId} onChange={(e) => setVisitId(e.target.value)}>
          <option value="">{visits === null ? 'Loading…' : visits.length ? 'Choose a visit' : 'No visits scheduled'}</option>
          {visits?.map((v) => (
            <option key={v.id} value={v.id}>
              {new Date(v.scheduledAt).toLocaleString('en-IN')} · {v.buyerRequirement?.contactName ?? 'Buyer not linked'} · {v.property?.title ?? 'Property not linked'}
            </option>
          ))}
        </select>
      </label>

      {brief && (
        <section className="space-y-3 rounded-xl border p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">Pre-visit brief</h3>
            <Badge variant="outline">{brief.label}</Badge>
          </div>
          <Row label="When" value={new Date(brief.visit.scheduledAt).toLocaleString('en-IN')} />
          <Row label="Meeting point" value={brief.visit.meetingPoint} />
          {brief.buyer && (
            <div>
              <Link className="font-medium text-primary" href={brief.buyer.href}>
                {brief.buyer.name}
              </Link>
              <Row label="Localities" value={brief.buyer.localities.join(', ')} />
              <Row label="Budget up to" value={brief.buyer.budgetMaxInr != null ? formatInr(brief.buyer.budgetMaxInr) : null} />
              <Row label="Must-haves" value={brief.buyer.mustHave} />
              <Row label="Flexible on" value={brief.buyer.flexible} />
            </div>
          )}
          {brief.lead && (
            <div>
              <Link className="font-medium text-primary" href={brief.lead.href}>
                Lead: {brief.lead.name}
              </Link>
              <Row label="Requirement" value={brief.lead.requirement} />
              <Row label="Budget" value={brief.lead.budgetBand} />
              <Row label="Timeline" value={brief.lead.timeline} />
              <Row label="Financing" value={brief.lead.financing} />
            </div>
          )}
          {brief.property && (
            <div>
              <Link className="font-medium text-primary" href={brief.property.href}>
                {brief.property.title}
              </Link>
              <Row label="Locality" value={brief.property.locality} />
              <Row label="Price" value={brief.property.priceInr != null ? formatInr(brief.property.priceInr) : null} />
              <Row label="Bedrooms" value={brief.property.bedrooms} />
              <Row label="Area" value={brief.property.area} />
              <Row label="Possession" value={brief.property.possession} />
              <Row label="Availability confirmed" value={brief.property.lastConfirmedAt ? new Date(brief.property.lastConfirmedAt).toLocaleDateString('en-IN') : null} />
            </div>
          )}
          <div>
            <p className="font-medium">Recent interactions</p>
            {brief.recentInteractions.length ? (
              <ul className="ml-4 list-disc">
                {brief.recentInteractions.map((a) => (
                  <li key={a.at + a.title}>
                    {new Date(a.at).toLocaleDateString('en-IN')} · {a.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">None recorded.</p>
            )}
          </div>
          {brief.toConfirm.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-950">
              <p className="font-medium">Confirm during or before the visit</p>
              <ul className="ml-4 list-disc">
                {brief.toConfirm.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {visitId && (
        <section className="space-y-2 rounded-xl border p-4">
          <h3 className="font-medium">Post-visit summary</h3>
          <p className="text-xs text-muted-foreground">Summarises only what you write here. The result is shown for review and is not saved automatically.</p>
          <textarea className="min-h-24 w-full rounded-md border p-2 text-sm" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} aria-label="Visit notes" />
          <Button size="sm" variant="outline" disabled={loading || notes.trim().length < 10} onClick={summarise}>
            {loading ? 'Summarising…' : 'Summarise my notes'}
          </Button>
          {summaryError && <p className="text-sm text-destructive">{summaryError}</p>}
          {summary && (
            <div className="rounded-md border bg-muted/40 p-2 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{summary.label}</p>
              <p className="whitespace-pre-wrap">{summary.text}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
