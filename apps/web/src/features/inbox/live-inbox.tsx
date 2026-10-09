'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatInr } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, api, type InboxStatus, type LiveConversation, type LiveExtraction, type LiveMessage } from '@/lib/api-client';

type Field = 'localities' | 'budget' | 'bedrooms' | 'financing' | 'timeline';

interface ReviewForm {
  localities: string;
  budgetInr: string;
  bedrooms: string;
  financing: string;
  timeline: string;
  include: Record<Field, boolean>;
  overwrite: Record<Field, boolean>;
}

const CONFIDENCE: Record<string, string> = { high: 'High confidence', low: 'Low confidence — check', unknown: 'Not found in message' };

function formFrom(ex: LiveExtraction): ReviewForm | null {
  const d = ex.draft;
  if (!d) return null;
  return {
    localities: d.localities.value?.join(', ') ?? '',
    budgetInr: d.budgetInr.value != null ? String(d.budgetInr.value) : '',
    bedrooms: d.bedrooms.value != null ? String(d.bedrooms.value) : '',
    financing: d.financing.value ?? '',
    timeline: d.timeline.value ?? '',
    include: {
      localities: d.localities.value != null,
      budget: d.budgetInr.value != null,
      bedrooms: d.bedrooms.value != null,
      financing: d.financing.value != null,
      timeline: d.timeline.value != null,
    },
    overwrite: { localities: false, budget: false, bedrooms: false, financing: false, timeline: false },
  };
}

function newKey() {
  const c: Crypto = crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function LiveInbox() {
  const [status, setStatus] = useState<InboxStatus | null>(null);
  const [convos, setConvos] = useState<LiveConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [active, setActive] = useState<LiveConversation | null>(null);
  const [extraction, setExtraction] = useState<LiveExtraction | null>(null);
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState<{ text: string; key: string } | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.inboxStatus(), api.inboxConversations()])
      .then(([s, c]) => {
        setStatus(s);
        setConvos(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Inbox could not be loaded.'));
  }, []);

  const open = useCallback(async (id: string) => {
    setActiveId(id);
    setSaveResult(null);
    setSendResult(null);
    setPreview(null);
    try {
      const [thread, ex] = await Promise.all([api.inboxThread(id), api.inboxExtraction(id)]);
      setActive(thread.conversation);
      setMessages(thread.messages);
      setExtraction(ex);
      setForm(formFrom(ex));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Conversation could not be loaded.');
    }
  }, []);

  async function save() {
    if (!activeId || !form) return;
    setBusy(true);
    setSaveResult(null);
    const fields: Record<string, unknown> = {};
    if (form.include.localities && form.localities.trim()) fields.localities = form.localities.split(',').map((s) => s.trim()).filter(Boolean);
    if (form.include.budget && Number(form.budgetInr) > 0) fields.budgetInr = Math.round(Number(form.budgetInr));
    if (form.include.bedrooms && form.bedrooms !== '') fields.bedrooms = Number(form.bedrooms);
    if (form.include.financing && form.financing.trim()) fields.financing = form.financing.trim();
    if (form.include.timeline && form.timeline.trim()) fields.timeline = form.timeline.trim();
    const overwrite = (Object.keys(form.overwrite) as Field[]).filter((f) => form.overwrite[f]);
    try {
      const out = await api.inboxSaveExtraction(activeId, { fields, overwrite });
      setSaveResult(
        `${out.created ? 'Lead created' : 'Lead updated'}: ${out.updated.join(', ') || 'no fields'} saved${out.skipped.length ? `; kept existing ${out.skipped.join(', ')}` : ''}.`,
      );
      await open(activeId);
    } catch (e) {
      setSaveResult(e instanceof ApiError ? e.message : 'Could not save. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!activeId || !preview) return;
    setBusy(true);
    try {
      const out = await api.inboxSend(activeId, preview.text, preview.key);
      setSendResult(`Sent to WhatsApp. Status: ${out.deliveryStatus}. Delivery updates arrive by webhook.`);
      setDraft('');
      setPreview(null);
      await open(activeId);
    } catch (e) {
      setSendResult(e instanceof ApiError ? e.message : 'Not sent.');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>;
  if (!status || !convos) return <p className="text-sm text-muted-foreground">Loading inbox…</p>;

  const wa = status.whatsapp;
  const canSend = wa.state === 'connected' && active && !active.optOut;
  const conflictFor = (f: Field) => extraction?.conflicts.find((c) => c.field === f);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Inbox</h2>
        <div className="flex gap-2">
          <Badge variant="outline">WhatsApp: {wa.label}</Badge>
          <Badge variant="outline">Real account</Badge>
        </div>
      </div>
      {wa.state !== 'connected' && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          WhatsApp is {wa.label.toLowerCase()}. Nothing can be sent from here until it is connected.{' '}
          <Link className="underline" href="/dealer/settings/integrations">
            Integration settings
          </Link>
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <ul className="space-y-1 rounded-xl border p-2">
          {convos.length === 0 && <li className="p-3 text-sm text-muted-foreground">No conversations yet. Messages appear here after a verified WhatsApp webhook.</li>}
          {convos.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`w-full rounded-md p-2 text-left text-sm ${activeId === c.id ? 'bg-muted' : 'hover:bg-muted/60'}`}
                onClick={() => open(c.id)}
              >
                <span className="font-medium">{c.contactName}</span>
                {c.unread && <span className="ml-2 text-xs text-primary">new</span>}
                {c.optOut && <span className="ml-2 text-xs text-destructive">opted out</span>}
                <span className="block truncate text-xs text-muted-foreground">{c.lastMessage?.text ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>

        <section className="flex min-h-[24rem] flex-col rounded-xl border">
          {!active ? (
            <p className="p-4 text-sm text-muted-foreground">Select a conversation.</p>
          ) : (
            <>
              <div className="border-b p-3 text-sm font-medium">
                {active.contactName}
                {active.leadId && (
                  <Link className="ml-2 text-xs text-primary" href={`/dealer/leads/${active.leadId}`}>
                    Open lead
                  </Link>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded-lg border p-2 text-sm ${m.direction === 'outbound' ? 'ml-auto bg-primary/10' : 'bg-muted/40'}`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(m.eventAt).toLocaleString('en-IN')}
                      {m.direction === 'outbound' ? ` · ${m.deliveryStatus ?? 'unknown'}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t p-3">
                {active.optOut && <p className="text-xs text-destructive">This contact opted out. Sending is blocked.</p>}
                {preview ? (
                  <div className="space-y-2 rounded-md border-2 border-primary p-2 text-sm">
                    <p className="font-medium">Send this WhatsApp message to {active.contactName}?</p>
                    <p className="whitespace-pre-wrap rounded bg-muted p-2">{preview.text}</p>
                    <p className="text-xs text-muted-foreground">Free-form messages only work within 24 hours of the buyer’s last message.</p>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy} onClick={send}>
                        {busy ? 'Sending…' : 'Confirm and send'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPreview(null)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input value={draft} maxLength={1000} placeholder={canSend ? 'Write a reply' : 'Sending unavailable'} disabled={!canSend} onChange={(e) => setDraft(e.target.value)} />
                    <Button size="sm" disabled={!canSend || !draft.trim()} onClick={() => setPreview({ text: draft.trim(), key: newKey() })}>
                      Preview
                    </Button>
                  </div>
                )}
                {sendResult && <p className="text-xs">{sendResult}</p>}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-3 rounded-xl border p-3 text-sm">
          <h3 className="font-medium">Lead details from chat</h3>
          {!active ? (
            <p className="text-xs text-muted-foreground">Open a conversation to review extracted details.</p>
          ) : !form || !extraction?.draft ? (
            <p className="text-xs text-muted-foreground">No inbound text message to extract from.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {extraction.draft.note} Overall: {extraction.draft.overallConfidence}. Nothing is saved until you press Review and save.
              </p>
              {(
                [
                  ['localities', 'Localities', form.localities, extraction.draft.localities.confidence, 'localities'],
                  ['budget', 'Budget (₹)', form.budgetInr, extraction.draft.budgetInr.confidence, 'budgetInr'],
                  ['bedrooms', 'Bedrooms', form.bedrooms, extraction.draft.bedrooms.confidence, 'bedrooms'],
                  ['financing', 'Financing', form.financing, extraction.draft.financing.confidence, 'financing'],
                  ['timeline', 'Timeline', form.timeline, extraction.draft.timeline.confidence, 'timeline'],
                ] as [Field, string, string, string, keyof ReviewForm][]
              ).map(([field, label, value, confidence, key]) => {
                const conflict = conflictFor(field);
                return (
                  <div key={field} className="space-y-1 rounded-md border p-2">
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={form.include[field]}
                        onChange={(e) => setForm({ ...form, include: { ...form.include, [field]: e.target.checked } })}
                      />
                      {label}
                      <span className="font-normal text-muted-foreground">· {CONFIDENCE[confidence] ?? confidence}</span>
                    </label>
                    <Input value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    {field === 'budget' && Number(form.budgetInr) > 0 && <p className="text-[11px] text-muted-foreground">{formatInr(Number(form.budgetInr))}</p>}
                    {conflict && (
                      <label className="flex items-center gap-2 text-[11px] text-amber-900">
                        <input
                          type="checkbox"
                          checked={form.overwrite[field]}
                          onChange={(e) => setForm({ ...form, overwrite: { ...form.overwrite, [field]: e.target.checked } })}
                        />
                        Saved value is “{conflict.saved}”. Replace it?
                      </label>
                    )}
                  </div>
                );
              })}
              {extraction.draft.missing.length > 0 && <p className="text-xs text-muted-foreground">Still missing: {extraction.draft.missing.join(', ')}.</p>}
              <Button size="sm" disabled={busy} onClick={save}>
                {extraction.lead ? `Review and save to ${extraction.lead.name}` : 'Review and save as new lead'}
              </Button>
              {saveResult && <p className="text-xs">{saveResult}</p>}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
