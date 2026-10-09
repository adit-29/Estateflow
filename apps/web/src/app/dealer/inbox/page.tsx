'use client';

import { useEffect, useMemo, useState } from 'react';
import { extractBuyerRequirement } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/toast';
import { getDemoStore, saveDemoStore } from '@/lib/demo-data';
import { useLiveMode } from '@/components/use-live-mode';
import { LiveInbox } from '@/features/inbox/live-inbox';
import {
  channelLabel,
  loadInbox,
  saveInbox,
  type InboxChannel,
  type InboxConversation,
} from '@/lib/inbox-demo';

type Tab = 'all' | InboxChannel;
type Filter = 'unread' | 'unassigned' | 'followup' | 'linked' | 'unlinked';

export default function InboxPage() {
  const mode = useLiveMode();
  if (mode === 'loading') return <p className="text-sm text-muted-foreground">Loading workspace…</p>;
  return mode === 'live' ? <LiveInbox /> : <DemoInbox />;
}

function DemoInbox() {
  const { notify } = useToast();
  const [items, setItems] = useState<InboxConversation[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [extractOpen, setExtractOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);

  useEffect(() => {
    setItems(loadInbox());
  }, []);

  function commit(next: InboxConversation[]) {
    setItems(next);
    saveInbox(next);
  }

  const visible = useMemo(() => {
    return items.filter((c) => {
      if (tab !== 'all' && c.channel !== tab) return false;
      if (filters.includes('unread') && !c.unread) return false;
      if (filters.includes('unassigned') && c.assignedDealer) return false;
      if (filters.includes('followup') && (!c.followUpDue || c.followUpDone)) return false;
      if (filters.includes('linked') && !c.linkedLeadId) return false;
      if (filters.includes('unlinked') && c.linkedLeadId) return false;
      if (search) {
        const blob = `${c.contactName} ${c.messages.map((m) => m.text).join(' ')}`.toLowerCase();
        if (!blob.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, tab, filters, search]);

  const active = items.find((c) => c.id === activeId) ?? null;
  const latestInbound = active?.messages.filter((m) => m.direction === 'inbound').at(-1);
  const extraction = latestInbound ? extractBuyerRequirement(latestInbound.text) : null;

  function toggleFilter(f: Filter) {
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function open(id: string) {
    setActiveId(id);
    setMobileThread(true);
    setExtractOpen(false);
    setConfirmSend(false);
    const next = items.map((c) => (c.id === id ? { ...c, unread: false } : c));
    commit(next);
  }

  function markUnread() {
    if (!active) return;
    commit(items.map((c) => (c.id === active.id ? { ...c, unread: true } : c)));
    notify('Marked unread');
  }

  function addNote() {
    if (!active || !note.trim()) return;
    commit(
      items.map((c) =>
        c.id === active.id
          ? { ...c, notes: [...c.notes, { id: `n${Date.now()}`, text: note.trim(), at: new Date().toISOString() }] }
          : c,
      ),
    );
    setNote('');
    notify('Internal note added');
  }

  function linkLead(leadId: string, name: string) {
    if (!active) return;
    commit(items.map((c) => (c.id === active.id ? { ...c, linkedLeadId: leadId, linkedLeadName: name } : c)));
    notify('Conversation linked to lead');
  }

  function unlink() {
    if (!active) return;
    commit(items.map((c) => (c.id === active.id ? { ...c, linkedLeadId: null, linkedLeadName: null } : c)));
    notify('Unlinked from CRM');
  }

  function createLead() {
    if (!active) return;
    const store = getDemoStore();
    const id = `l${Date.now()}`;
    store.dealer.leads.unshift({
      id,
      name: active.contactName,
      phone: 'From inbox (demo)',
      source: channelLabel(active.channel),
      status: 'New',
      locality: extraction?.localities.value?.[0] ?? 'Unknown',
      summary: latestInbound?.text,
      followUp: 'Today',
    });
    saveDemoStore(store);
    linkLead(id, active.contactName);
    notify('Lead created from conversation');
  }

  function sendDemo() {
    if (!active || !draft.trim() || active.optOut) return;
    commit(
      items.map((c) =>
        c.id === active.id
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: `m${Date.now()}`,
                  direction: 'outbound' as const,
                  text: draft.trim(),
                  at: new Date().toISOString(),
                  status: 'demo_reply_added' as const,
                },
              ],
            }
          : c,
      ),
    );
    setDraft('');
    setConfirmSend(false);
    notify('Demo reply added — not sent to WhatsApp, Instagram, or Messenger');
  }

  function scheduleFollowUp() {
    if (!active) return;
    const due = new Date();
    due.setDate(due.getDate() + 1);
    commit(items.map((c) => (c.id === active.id ? { ...c, followUpDue: due.toISOString().slice(0, 10), followUpDone: false } : c)));
    notify('Demo follow-up saved in this browser for tomorrow. No SMS, WhatsApp, push, or email reminder is sent.');
  }

  function completeFollowUp() {
    if (!active) return;
    commit(items.map((c) => (c.id === active.id ? { ...c, followUpDone: true } : c)));
    notify('Follow-up marked complete');
  }

  function applyExtraction() {
    if (!active || !extraction) return;
    if (!active.linkedLeadId) {
      notify('Link or create a lead before applying fields');
      return;
    }
    const store = getDemoStore();
    const skipped: string[] = [];
    const isEmpty = (v?: string | null) => !v || v === 'Unknown';
    store.dealer.leads = store.dealer.leads.map((l) => {
      if (l.id !== active.linkedLeadId) return l;
      const nextLocality = extraction.localities.value?.[0];
      if (nextLocality && !isEmpty(l.locality) && l.locality !== nextLocality) skipped.push('locality');
      if (latestInbound?.text && !isEmpty(l.summary) && l.summary !== latestInbound.text) skipped.push('summary');
      return {
        ...l,
        locality: nextLocality && isEmpty(l.locality) ? nextLocality : l.locality,
        summary: latestInbound?.text && isEmpty(l.summary) ? latestInbound.text : l.summary,
      };
    });
    saveDemoStore(store);
    setExtractOpen(false);
    notify(skipped.length ? `Empty fields filled; kept existing ${skipped.join(' and ')}` : 'Confirmed fields written to the linked demo lead');
  }

  const leads = typeof window === 'undefined' ? [] : getDemoStore().dealer.leads;

  const list = (
    <div className="flex h-full min-h-[28rem] flex-col border-r">
      <div className="space-y-3 border-b p-3">
        <div className="flex flex-wrap gap-1">
          {(['all', 'whatsapp', 'instagram', 'facebook_messenger'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`rounded-full px-3 py-1 text-xs ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setTab(t)}
            >
              {t === 'all' ? 'All' : channelLabel(t)}
            </button>
          ))}
        </div>
        <Input placeholder="Search conversations" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search conversations" />
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['unread', 'Unread'],
              ['unassigned', 'Unassigned'],
              ['followup', 'Follow-up due'],
              ['linked', 'Linked'],
              ['unlinked', 'Not linked'],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-md border px-2 py-1 text-[11px] ${filters.includes(id) ? 'border-primary bg-accent' : ''}`}
              onClick={() => toggleFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <li className="p-6 text-sm text-muted-foreground">No conversations match these filters.</li>
        ) : (
          visible.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`w-full border-b px-3 py-3 text-left hover:bg-muted/50 ${activeId === c.id ? 'bg-accent/40' : ''}`}
                onClick={() => open(c.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{c.contactName}</span>
                  {c.unread && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                </div>
                <p className="text-[11px] text-muted-foreground">{channelLabel(c.channel)}</p>
                <p className="truncate text-xs text-muted-foreground">{c.messages.at(-1)?.text}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {c.linkedLeadName ? `Linked: ${c.linkedLeadName}` : 'Not linked'} · {c.assignedDealer ?? 'Unassigned'}
                </p>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  const thread = active ? (
    <div className="flex min-h-[28rem] flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <button type="button" className="text-sm lg:hidden" onClick={() => setMobileThread(false)}>
          ← Back
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{active.contactName}</p>
          <p className="text-xs text-muted-foreground">
            {channelLabel(active.channel)} · Human review required · Demo mode
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={markUnread}>
          Mark unread
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {active.messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-lg border p-3 text-sm ${m.direction === 'outbound' ? 'ml-auto bg-accent' : 'bg-card'}`}>
            <p>{m.text}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {m.direction === 'outbound' ? 'Simulated demo reply · not sent' : 'Inbound (demo)'} · {new Date(m.at).toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t p-3">
        {active.optOut && <p className="text-xs text-destructive">This contact is opted out. Do not send outreach.</p>}
        <p className="text-[11px] text-muted-foreground">
          Replies stay in this browser. Outside a customer-care window, WhatsApp may require an approved template. This demo does not send anything.
        </p>
        <textarea
          className="min-h-[72px] w-full rounded-md border px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Draft a reply"
          aria-label="Reply draft"
        />
        {!confirmSend ? (
          <Button size="sm" disabled={!draft.trim() || active.optOut} onClick={() => setConfirmSend(true)}>
            Review before send
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={sendDemo}>
              Send demo reply
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmSend(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="hidden items-center justify-center p-8 text-sm text-muted-foreground lg:flex">
      Select a conversation
    </div>
  );

  const side = active ? (
    <aside className="space-y-4 border-l p-4 text-sm">
      <div>
        <p className="font-medium">CRM</p>
        <p className="text-muted-foreground">{active.linkedLeadName ?? 'Not linked to a lead'}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={createLead}>
            Create lead
          </Button>
          {active.linkedLeadId && (
            <Button size="sm" variant="outline" onClick={unlink}>
              Unlink
            </Button>
          )}
        </div>
        <label className="mt-3 block text-xs text-muted-foreground">
          Link existing
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value=""
            onChange={(e) => {
              const lead = leads.find((l) => l.id === e.target.value);
              if (lead) linkLead(lead.id, lead.name);
            }}
          >
            <option value="">Choose lead…</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <Button size="sm" variant="outline" onClick={() => setExtractOpen(true)}>
          Extract buyer requirement
        </Button>
        {extractOpen && extraction && (
          <div className="mt-3 space-y-2 rounded-lg border p-3">
            <p className="text-xs">{extraction.note}</p>
            <p>Localities: {extraction.localities.value?.join(', ') ?? 'Needs confirmation'}</p>
            <p>Budget: {extraction.budgetInr.value ? `₹${extraction.budgetInr.value.toLocaleString('en-IN')}` : 'Needs confirmation'}</p>
            <p>Bedrooms: {extraction.bedrooms.value ?? 'Needs confirmation'}</p>
            <p>Financing: {extraction.financing.value ?? 'Needs confirmation'}</p>
            <p>Timeline: {extraction.timeline.value ?? 'Needs confirmation'}</p>
            <p className="text-xs text-muted-foreground">Property type needs confirmation before it is treated as a flat.</p>
            <Button size="sm" onClick={applyExtraction}>
              Confirm and update lead
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <p className="font-medium">Follow-up</p>
        <p className="text-muted-foreground">
          {active.followUpDue ? (active.followUpDone ? 'Completed' : `Due ${active.followUpDue}`) : 'None scheduled'}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={scheduleFollowUp}>
            Schedule
          </Button>
          <Button size="sm" variant="outline" onClick={completeFollowUp} disabled={!active.followUpDue || active.followUpDone}>
            Complete
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-medium">Internal notes</p>
        {active.notes.map((n) => (
          <p key={n.id} className="rounded-md bg-muted px-2 py-1 text-xs">
            {n.text}
          </p>
        ))}
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" aria-label="Internal note" />
        <Button size="sm" variant="outline" onClick={addNote}>
          Add note
        </Button>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={active.optOut}
          onChange={(e) =>
            commit(items.map((c) => (c.id === active.id ? { ...c, optOut: e.target.checked } : c)))
          }
        />
        Opt out of future outreach
      </label>
    </aside>
  ) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-semibold">Inbox</h2>
        <Badge variant="muted">Demo data</Badge>
        <Badge variant="outline">Demo mode</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        WhatsApp, Instagram, and Messenger conversations are local samples. Nothing is connected to Meta.
      </p>
      <div className="overflow-hidden rounded-xl border bg-card lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <div className={mobileThread ? 'hidden lg:block' : 'block'}>{list}</div>
        <div className={mobileThread || active ? 'block' : 'hidden lg:block'}>{thread}</div>
        <div className="hidden lg:block">{side}</div>
      </div>
      {active && mobileThread && <div className="lg:hidden">{side}</div>}
    </div>
  );
}
