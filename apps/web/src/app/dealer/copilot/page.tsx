'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  answerDemoCopilot,
  applyDemoVisitProposal,
  dealerLeadViews,
  emptyAgentMemory,
  type AgentMemory,
  type CopilotAnswer,
  type CopilotSnapshot,
} from '@estateflow/shared';
import { getDemoSession } from '@/lib/demo-auth';
import { getDemoStore, saveDemoStore } from '@/lib/demo-data';
import { demoNetwork } from '@/lib/demo-seed';
import { loadDemoBuilderWorkspace } from '@/lib/builder-workspace';
import { useLiveMode } from '@/components/use-live-mode';
import { LiveCopilot } from '@/features/copilot/live-copilot';
import {
  CopilotComposer,
  CopilotEmpty,
  CopilotFrame,
  DemoCopilotThread,
} from '@/features/copilot/copilot-chat';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  answer?: CopilotAnswer;
}

interface CopilotActivity {
  at: string;
  question: string;
  tools: string[];
  proposal?: string;
  outcome?: string;
}

const HISTORY_KEY = 'ef_copilot_history_v1';
const ACTIVITY_KEY = 'ef_copilot_activity_v1';

function snapshotFromStore(): CopilotSnapshot {
  const store = getDemoStore();
  const ws = loadDemoBuilderWorkspace();
  const dealer = ws.dealers.find((row) => row.id === 'd-raj') ?? ws.dealers[0];
  const builderLeads = dealer
    ? dealerLeadViews(ws, dealer).map((row) => ({
        assignmentId: row.assignmentId,
        configuration: row.configuration,
        locality: row.locality,
        projectName: row.projectName,
        requirementNote: row.requirementNote,
        status: row.status,
      }))
    : [];
  return {
    leads: store.dealer.leads,
    properties: store.dealer.properties.map((row) => ({ ...row, beds: row.beds ?? undefined })),
    visits: store.dealer.visits,
    deals: store.dealer.deals,
    commissions: store.dealer.commissions ?? [],
    builderLeads,
    network: demoNetwork,
  };
}

export default function CopilotPage() {
  const mode = useLiveMode();
  if (mode === 'loading') return <p className="text-sm text-muted-foreground">Loading workspace…</p>;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening Copilot…</p>}>
      {mode === 'live' ? <LiveCopilot /> : <DemoCopilot />}
    </Suspense>
  );
}

function DemoCopilot() {
  const demo = getDemoSession();
  const params = useSearchParams();
  const [input, setInput] = useState('');
  const [pending, setPending] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [memory, setMemory] = useState<AgentMemory>(emptyAgentMemory());
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activity, setActivity] = useState<CopilotActivity[]>([]);
  const asked = useRef(false);
  const askRef = useRef<(text: string) => void>(() => undefined);

  const [history, setHistory] = useState<{ title: string; at: string }[]>([]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(ACTIVITY_KEY);
      if (raw) setActivity(JSON.parse(raw) as CopilotActivity[]);
      const hist = window.sessionStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist) as { title: string; at: string }[]);
    } catch {
      /* ignore */
    }
  }, []);

  function logActivity(entry: CopilotActivity) {
    setActivity((cur) => {
      const next = [entry, ...cur].slice(0, 40);
      window.sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
      return next;
    });
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setError(null);
    setLoading(true);
    setPending(question);
    setInput('');
    window.setTimeout(() => {
      try {
        const answer = answerDemoCopilot(question, snapshotFromStore(), memory);
        setMemory(answer.memory ?? memory);
        setTurns((cur) => [...cur, { role: 'user', text: question }, { role: 'assistant', text: answer.text, answer }]);
        setPending('');
        logActivity({
          at: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
          question,
          tools: (answer.toolActivity ?? []).map((row) => row.tool),
          proposal: answer.proposal?.label,
        });
        const historyRows = JSON.parse(window.sessionStorage.getItem(HISTORY_KEY) || '[]') as { title: string; at: string }[];
        const nextHistory = [{ title: question, at: new Date().toISOString() }, ...historyRows].slice(0, 20);
        window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
        setHistory(nextHistory);
      } catch {
        setError('Could not build a demo answer. Your question is still in the box.');
        setInput(question);
      } finally {
        setLoading(false);
      }
    }, 180);
  }
  askRef.current = ask;

  useEffect(() => {
    const q = params.get('q')?.trim();
    if (!q || asked.current) return;
    asked.current = true;
    askRef.current(q);
  }, [params]);

  function confirmProposal(answer: CopilotAnswer) {
    if (!answer.proposal) return;
    const store = getDemoStore();
    if (answer.proposal.kind === 'site_visit') {
      const lead = store.dealer.leads.find((item) => item.id === answer.proposal?.leadId);
      store.dealer.visits = applyDemoVisitProposal(store.dealer.visits, {
        leadName: lead?.name ?? 'Buyer',
        propertyTitle: answer.actionProposal?.propertyTitle,
        when: answer.actionProposal?.dueAt ?? 'Tomorrow 5:00 PM',
      });
      saveDemoStore(store);
      setTurns((cur) => [...cur, { role: 'assistant', text: `✅ Site visit proposed for ${lead?.name ?? 'buyer'}. WhatsApp send nahi hua.` }]);
      logActivity({ at: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }), question: 'Confirm visit', tools: ['propose_site_visit'], outcome: 'Created demo visit' });
      return;
    }
    store.dealer.leads = store.dealer.leads.map((lead) =>
      lead.id === answer.proposal?.leadId
        ? { ...lead, followUp: answer.actionProposal?.dueAt ?? 'Scheduled' }
        : lead,
    );
    saveDemoStore(store);
    setTurns((cur) => [...cur, { role: 'assistant', text: `✅ Follow-up created for ${answer.actionProposal?.dueAt ?? 'the proposed time'}.` }]);
    logActivity({ at: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }), question: 'Confirm follow-up', tools: ['propose_follow_up'], outcome: `Updated ${answer.proposal.leadId}` });
  }

  return (
    <CopilotFrame
      badge="DEMO AI"
      notice={`Fictional demo workspace. ${demo ? `Signed in as ${demo.name}. ` : ''}No live model API is called.`}
      onNewChat={() => {
        setTurns([]);
        setMemory(emptyAgentMemory());
        setError(null);
      }}
      onOpenHistory={() => setHistoryOpen((v) => !v)}
      onOpenSearch={() => setSearchOpen((v) => !v)}
    >
      {searchOpen && (
        <input
          className="m-3 rounded-xl border px-3 py-2 text-body"
          placeholder="Search this chat…"
          onChange={(event) => {
            const q = event.target.value.toLowerCase();
            document.querySelectorAll('[data-copilot-turn]').forEach((node) => {
              node.classList.toggle('hidden', q.length > 0 && !node.textContent?.toLowerCase().includes(q));
            });
          }}
        />
      )}
      {historyOpen && (
        <div className="border-b p-3 text-meta">
          <p className="font-semibold">Chat history</p>
          {history.length ? history.map((row) => (
            <button key={row.at} type="button" className="mt-1 block text-left text-primary" onClick={() => ask(row.title)}>{row.title}</button>
          )) : <p className="text-muted-foreground">No saved chats in this session.</p>}
          <p className="mt-3 font-semibold">Copilot activity</p>
          {activity.slice(0, 8).map((row) => (
            <p key={row.at + row.question} className="mt-1 text-muted-foreground">{row.at} · {row.question} · {row.tools.join(', ') || 'no tool'}{row.outcome ? ` · ${row.outcome}` : ''}</p>
          ))}
        </div>
      )}
      {turns.length === 0 && !loading ? (
        <CopilotEmpty
          onPick={ask}
          greeting={demo ? `Good afternoon, ${demo.name.split(' ')[0]}` : undefined}
          hint="Buyer, property, follow-up ya deal ke baare mein kuch bhi pooch sakte hain."
        />
      ) : (
        <DemoCopilotThread
          turns={turns}
          loading={loading}
          pending={pending}
          error={error}
          onRetry={() => ask(input || pending)}
          onConfirm={confirmProposal}
          onCopy={(text) => navigator.clipboard?.writeText(text)}
          onPrompt={ask}
        />
      )}
      <CopilotComposer
        input={input}
        onChange={setInput}
        onSend={() => ask(input)}
        loading={loading}
        placeholder="EstateFlow se kuch bhi poochiye..."
      />
    </CopilotFrame>
  );
}
