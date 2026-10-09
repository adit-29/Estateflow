'use client';

import Link from 'next/link';
import type {
  CopilotAnswer,
  CopilotActionProposal,
  CopilotBlock,
  CopilotRecord,
  CopilotToolActivity,
  LiveCopilotAnswer,
} from '@estateflow/shared';
import { DEMO_PROMPT_GROUPS } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export { DEMO_PROMPT_GROUPS };

export const COPILOT_PROMPTS = Object.values(DEMO_PROMPT_GROUPS).flat();

interface DemoTurn {
  role: 'user' | 'assistant';
  text: string;
  answer?: CopilotAnswer;
}

interface LiveTurn {
  question: string;
  answer?: LiveCopilotAnswer;
  error?: string;
}

function fieldText(value: string | number | boolean | null) {
  if (value === null) return 'not recorded';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

function RecordCard({ record }: { record: CopilotRecord }) {
  const buyerHref = typeof record.fields.buyerHref === 'string' ? record.fields.buyerHref : null;
  const match = typeof record.fields.matchPercent === 'number' ? record.fields.matchPercent : null;
  return (
    <div className="rounded-xl border bg-background p-3 text-meta">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="font-medium text-primary" href={record.href}>{record.label}</Link>
        <span className="text-muted-foreground">{match != null ? `${match}% match` : record.type}</span>
      </div>
      {typeof record.fields.priceInr === 'number' && (
        <p className="mt-1 text-muted-foreground">
          {fieldText(record.fields.locality as string | null)} · ₹{Number(record.fields.priceInr).toLocaleString('en-IN')}
          {record.fields.bedrooms != null ? ` · ${record.fields.bedrooms} BHK` : ''}
        </p>
      )}
      {buyerHref && <Link className="mt-1 inline-block text-primary" href={buyerHref}>Open buyer</Link>}
    </div>
  );
}

function BlockCard({ block, onPrompt }: { block: CopilotBlock; onPrompt?: (prompt: string) => void }) {
  const tone =
    block.tone === 'critical' ? 'border-red-300 bg-red-50' : block.tone === 'warn' ? 'border-amber-300 bg-amber-50' : 'border bg-background';
  const mark = block.tone === 'critical' ? '🔴' : block.tone === 'warn' ? '🟠' : block.matchPercent != null ? `${block.matchPercent}%` : '';
  return (
    <div className={`rounded-xl p-3 text-meta ${tone}`}>
      <p className="font-semibold text-foreground">
        {mark ? `${mark} ` : ''}
        {block.title}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-foreground">{block.body}</p>
      {block.meta?.map((line) => (
        <p key={line} className="text-muted-foreground">{line}</p>
      ))}
      {block.matchWhy?.length ? (
        <p className="mt-1 text-muted-foreground">{block.matchWhy.join(' · ')}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {block.href && (
          <Button asChild size="sm" variant="outline">
            <Link href={block.href}>Open</Link>
          </Button>
        )}
        {block.actions?.map((action) =>
          action.href ? (
            <Button key={action.label} asChild size="sm" variant="outline">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : action.prompt && onPrompt ? (
            <Button key={action.label} size="sm" variant="outline" type="button" onClick={() => onPrompt(action.prompt!)}>
              {action.label}
            </Button>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function CopilotComposer({
  input,
  onChange,
  onSend,
  loading,
  placeholder,
}: {
  input: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  placeholder: string;
}) {
  return (
    <form
      className="flex items-end gap-2 border-t bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <textarea
        className="min-h-[52px] max-h-40 flex-1 resize-y rounded-2xl border px-4 py-3 text-body shadow-sm"
        value={input}
        maxLength={1000}
        placeholder={placeholder}
        aria-label="Copilot message"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
      />
      <Button type="submit" variant="accept" disabled={loading || !input.trim()} aria-label="Send">
        {loading ? '…' : '↑'}
      </Button>
    </form>
  );
}

export function ToolStatus({ loading, activities }: { loading: boolean; activities?: CopilotToolActivity[] }) {
  if (loading && !activities?.length) {
    return <p className="text-body text-muted-foreground">EstateFlow is checking your CRM...</p>;
  }
  if (!activities?.length) return null;
  return (
    <ul className="space-y-1 text-meta text-muted-foreground">
      {activities.map((item) => (
        <li key={`${item.tool}-${item.label}`}>{item.label}</li>
      ))}
    </ul>
  );
}

export function DemoCopilotThread({
  turns,
  loading,
  pending,
  error,
  onRetry,
  onConfirm,
  onCopy,
  onPrompt,
}: {
  turns: DemoTurn[];
  loading: boolean;
  pending: string;
  error: string | null;
  onRetry: () => void;
  onConfirm: (answer: CopilotAnswer) => void;
  onCopy: (text: string) => void;
  onPrompt?: (prompt: string) => void;
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {turns.map((turn, index) => (
        <div key={index} className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-body ${turn.role === 'user' ? 'bg-blue-600 text-white' : 'border bg-muted/50'}`}>
            {turn.role === 'assistant' && <p className="mb-1 text-helper uppercase tracking-wide text-muted-foreground">DEMO AI</p>}
            <p className="whitespace-pre-wrap">{turn.text}</p>
            {turn.answer?.toolActivity?.length ? <div className="mt-2"><ToolStatus loading={false} activities={turn.answer.toolActivity} /></div> : null}
            {turn.answer?.draft && (
              <div className="mt-3 rounded-xl border bg-background p-3 text-foreground">
                <p className="text-meta font-semibold">Suggested message · AI-generated draft</p>
                <p className="mt-1 whitespace-pre-wrap">{turn.answer.draft}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" type="button" onClick={() => onCopy(turn.answer!.draft!)}>Copy</Button>
                </div>
              </div>
            )}
            {turn.answer?.blocks?.length
              ? turn.answer.blocks.map((block) => <div key={block.title + block.body} className="mt-2"><BlockCard block={block} onPrompt={onPrompt} /></div>)
              : turn.answer?.cards.map((card) => (
                  <a key={card.title + card.detail} href={card.href} className="mt-2 block rounded-xl border bg-background p-2 text-meta text-foreground">
                    <span className="font-medium">{card.title}</span>
                    <span className="mt-1 block text-muted-foreground">{card.detail}</span>
                  </a>
                ))}
            {turn.answer?.proposal && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="accept" type="button" onClick={() => onConfirm(turn.answer!)}>
                  Confirm: {turn.answer.proposal.label}
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="space-y-1">
          <ToolStatus loading activities={undefined} />
          {pending && <p className="text-meta text-muted-foreground">“{pending}”</p>}
        </div>
      )}
      {error && (
        <div className="space-y-2">
          <p className="text-body text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
        </div>
      )}
    </div>
  );
}

export function LiveCopilotThread({
  turns,
  loading,
  pendingProposal,
  confirming,
  confirmResult,
  onRetry,
  onReview,
  onConfirm,
  onCancel,
  onCopy,
  onPrompt,
}: {
  turns: LiveTurn[];
  loading: boolean;
  pendingProposal: CopilotActionProposal | null;
  confirming: boolean;
  confirmResult: string | null;
  onRetry: (question: string) => void;
  onReview: (proposal: CopilotActionProposal) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onCopy: (text: string) => void;
  onPrompt?: (prompt: string) => void;
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {turns.map((turn, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl bg-blue-600 px-4 py-3 text-body text-white">{turn.question}</p>
          </div>
          {turn.error ? (
            <div className="mr-8 rounded-2xl border border-destructive/40 p-3 text-body text-destructive">
              <p>{turn.error}</p>
              <Button className="mt-2" size="sm" variant="outline" onClick={() => onRetry(turn.question)}>Retry</Button>
            </div>
          ) : turn.answer ? (
            <div className="max-w-[85%] space-y-2 rounded-2xl border bg-muted/50 p-4 text-body">
              <p className="text-helper uppercase tracking-wide text-muted-foreground">{turn.answer.label}</p>
              <ToolStatus loading={false} activities={turn.answer.toolActivity} />
              <p className="whitespace-pre-wrap">{turn.answer.text}</p>
              {turn.answer.draft && (
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-meta font-semibold">Suggested message · AI-generated draft</p>
                  <p className="mt-1 whitespace-pre-wrap">{turn.answer.draft}</p>
                  <Button className="mt-2" size="sm" variant="outline" onClick={() => onCopy(turn.answer!.draft!)}>Copy</Button>
                </div>
              )}
              {turn.answer.blocks?.map((block) => (
                <BlockCard key={block.title + block.body} block={block} onPrompt={onPrompt} />
              ))}
              {turn.answer.proposal && (
                turn.answer.proposal.kind === 'open_page' && turn.answer.proposal.href ? (
                  <Button size="sm" variant="accept" asChild>
                    <Link href={turn.answer.proposal.href}>{turn.answer.proposal.label}</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="accept" onClick={() => onReview(turn.answer!.proposal!)}>
                    Review: {turn.answer.proposal.label}
                  </Button>
                )
              )}
              {turn.answer.records.length > 0 && (
                <details className="text-meta">
                  <summary className="cursor-pointer font-medium">Based on your CRM ({turn.answer.records.length})</summary>
                  <div className="mt-2 space-y-2">{turn.answer.records.map((record) => <RecordCard key={record.id} record={record} />)}</div>
                </details>
              )}
            </div>
          ) : null}
        </div>
      ))}
      {loading && <ToolStatus loading />}
      {pendingProposal && (
        <div role="dialog" aria-label="Confirm action" className="space-y-2 rounded-xl border-2 border-blue-600 p-4">
          <p className="font-semibold">{pendingProposal.label}</p>
          {pendingProposal.leadName && <p className="text-meta">Buyer: {pendingProposal.leadName}</p>}
          {pendingProposal.propertyTitle && <p className="text-meta">Property: {pendingProposal.propertyTitle}</p>}
          {pendingProposal.dueAt && <p className="text-meta">When: {pendingProposal.dueAt}</p>}
          <div className="flex flex-wrap gap-2">
            {pendingProposal.kind === 'site_visit' && !pendingProposal.propertyId ? (
              <Button size="sm" variant="accept" asChild><Link href={pendingProposal.href ?? '/dealer/site-visits/new'}>Open site visit form</Link></Button>
            ) : pendingProposal.kind === 'open_page' && pendingProposal.href ? (
              <Button size="sm" variant="accept" asChild><Link href={pendingProposal.href}>{pendingProposal.label}</Link></Button>
            ) : (
              <Button size="sm" variant="accept" disabled={confirming} onClick={onConfirm}>{confirming ? 'Saving…' : 'Confirm and save'}</Button>
            )}
            <Button size="sm" variant="destructive" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      )}
      {confirmResult && <p className="text-body">{confirmResult}</p>}
    </div>
  );
}

export function CopilotEmpty({
  onPick,
  hint,
  greeting,
}: {
  onPick: (prompt: string) => void;
  hint: string;
  greeting?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      {greeting && <p className="text-body text-muted-foreground">{greeting}</p>}
      <h2 className="text-3xl font-semibold tracking-tight">Aaj kya karna hai?</h2>
      <p className="max-w-lg text-body text-muted-foreground">{hint}</p>
      <div className="grid w-full max-w-3xl gap-4 text-left sm:grid-cols-2">
        {Object.entries(DEMO_PROMPT_GROUPS).map(([group, prompts]) => (
          <div key={group} className="rounded-2xl border bg-background p-3">
            <p className="mb-2 text-helper font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
            <div className="flex flex-col gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-xl border px-3 py-2 text-left text-meta hover:bg-muted"
                  onClick={() => onPick(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CopilotFrame({
  badge,
  notice,
  children,
  onNewChat,
  onOpenHistory,
  onOpenSearch,
  settingsHref = '/dealer/settings/ai',
  compact,
}: {
  badge: string;
  notice?: string;
  children: React.ReactNode;
  onNewChat?: () => void;
  onOpenHistory?: () => void;
  onOpenSearch?: () => void;
  settingsHref?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'flex h-full min-h-0 flex-col' : 'flex min-h-[calc(100vh-8rem)] flex-col'}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-page">AI Dealer Copilot</h2>
          <p className="text-meta text-muted-foreground">Aap business sambhaliye. EstateFlow routine kaam handle kare.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{badge}</Badge>
          {onNewChat && <Button size="sm" variant="outline" type="button" onClick={onNewChat}>New chat</Button>}
          {onOpenSearch && <Button size="sm" variant="outline" type="button" onClick={onOpenSearch}>Search</Button>}
          {onOpenHistory && <Button size="sm" variant="outline" type="button" onClick={onOpenHistory}>Chat history</Button>}
          <Button size="sm" variant="outline" asChild><Link href={settingsHref}>Settings</Link></Button>
        </div>
      </div>
      {notice && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-meta text-amber-950">{notice}</p>}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        {children}
      </section>
    </div>
  );
}

export function pageContextFromPath(pathname: string): { type?: string; id?: string; prompts: string[] } {
  const lead = pathname.match(/^\/dealer\/leads\/([^/]+)/);
  if (lead) return { type: 'lead', id: lead[1], prompts: ['Is buyer ke liye 3 best properties batao', 'Is buyer ke liye kya next karna chahiye?'] };
  const buyer = pathname.match(/^\/dealer\/buyers\/([^/]+)/);
  if (buyer) return { type: 'buyer', id: buyer[1], prompts: ['Is buyer ke liye 3 best properties batao'] };
  const property = pathname.match(/^\/dealer\/inventory\/([^/]+)/);
  if (property) return { type: 'property', id: property[1], prompts: ['Is property ke liye buyers dhoondo'] };
  const deal = pathname.match(/^\/dealer\/deals\/([^/]+)/);
  if (deal && !pathname.includes('commissions')) return { type: 'deal', id: deal[1], prompts: ['Ye deal stuck kyun hai?'] };
  if (pathname.startsWith('/dealer/site-visits')) return { type: 'visit', prompts: ['Visit se pehle mujhe kya pata hona chahiye?'] };
  if (pathname.startsWith('/dealer/deals/commissions')) return { type: 'commission', prompts: ['Ye commission pending kyun hai?'] };
  if (pathname.startsWith('/dealer/builder-leads')) return { type: 'builder_lead', prompts: ['Is lead ko accept karne ka reason kya hai?'] };
  if (pathname.startsWith('/dealer/analytics') || pathname.startsWith('/dealer/performance')) {
    return { type: 'analytics', prompts: ['Meri conversion kaha gir rahi hai?'] };
  }
  return { prompts: ['Aaj kya karna hai?', 'Kisko pehle call karun?'] };
}
