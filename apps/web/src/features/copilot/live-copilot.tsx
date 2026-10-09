'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { CopilotActionProposal, LiveCopilotAnswer } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { ApiError, api, type AiStatus } from '@/lib/api-client';
import {
  CopilotComposer,
  CopilotEmpty,
  CopilotFrame,
  LiveCopilotThread,
  pageContextFromPath,
} from '@/features/copilot/copilot-chat';

interface Turn {
  question: string;
  answer?: LiveCopilotAnswer;
  error?: string;
}

export function LiveCopilot({
  compact,
  pagePath,
}: {
  compact?: boolean;
  pagePath?: string;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening Copilot…</p>}>
      <LiveCopilotInner compact={compact} pagePath={pagePath} />
    </Suspense>
  );
}

function LiveCopilotInner({ compact, pagePath }: { compact?: boolean; pagePath?: string }) {
  const params = useSearchParams();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<CopilotActionProposal | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const asked = useRef(false);
  const askRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const context = pageContextFromPath(pagePath ?? '');

  useEffect(() => {
    api
      .copilotStatus()
      .then(setStatus)
      .catch((e) => setStatusError(e instanceof ApiError ? e.message : 'Could not load AI status.'));
  }, []);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setLoading(true);
    setInput('');
    setConfirmResult(null);
    try {
      const answer = await api.copilotChat(question, {
        conversationId,
        pageContext: context.type && context.id ? { type: context.type, id: context.id } : undefined,
      });
      setConversationId(answer.conversationId);
      setTurns((cur) => [...cur, { question, answer }]);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Copilot is unavailable.';
      setTurns((cur) => [...cur, { question, error: message }]);
      setInput(question);
    } finally {
      setLoading(false);
    }
  }
  askRef.current = ask;

  useEffect(() => {
    if (!status?.configured) return;
    const q = params.get('q')?.trim();
    if (!q || asked.current) return;
    asked.current = true;
    void askRef.current(q);
  }, [status?.configured, params]);

  async function confirm() {
    if (!pending || pending.kind === 'open_page') return;
    if (pending.kind === 'site_visit' && !pending.propertyId) return;
    setConfirming(true);
    try {
      const out = await api.copilotConfirm(pending);
      setConfirmResult(
        out.alreadyApplied
          ? 'Already saved — duplicate confirm did not create another record.'
          : pending.kind === 'site_visit'
            ? `✅ Visit scheduled.`
            : `✅ Follow-up created for ${pending.leadName}.`,
      );
      setPending(null);
    } catch (e) {
      setConfirmResult(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setConfirming(false);
    }
  }

  if (statusError) return <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{statusError}</p>;
  if (!status) return <p className="text-sm text-muted-foreground">Checking AI provider…</p>;

  if (!status.configured) {
    const queued = params.get('q')?.trim();
    return (
      <CopilotFrame badge="LIVE AI" notice="Live AI is not configured yet." compact={compact}>
        <div className="space-y-3 p-6 text-body">
          <p>Real account par fake answers nahi dikhte. Local Ollama: AI_PROVIDER=ollama, AI_MODEL=qwen3:8b.</p>
          {queued && (
            <p className="rounded-lg border bg-muted/40 px-3 py-2">
              Pending prompt (model configured nahi hai, isliye send nahi hua): {queued}
            </p>
          )}
          <Button asChild variant="accept"><Link href="/dealer/settings/ai">Open AI provider settings</Link></Button>
        </div>
      </CopilotFrame>
    );
  }

  return (
    <CopilotFrame
      badge="LIVE AI"
      compact={compact}
      onNewChat={() => {
        setTurns([]);
        setConversationId(undefined);
        setPending(null);
        setConfirmResult(null);
      }}
    >
      {turns.length === 0 && !loading ? (
        <CopilotEmpty
          onPick={(prompt) => void ask(prompt)}
          hint="Buyer, property, follow-up ya deal ke baare mein kuch bhi pooch sakte hain. Live Copilot sirf aapke authorized CRM records use karta hai."
        />
      ) : (
        <LiveCopilotThread
          turns={turns}
          loading={loading}
          pendingProposal={pending}
          confirming={confirming}
          confirmResult={confirmResult}
          onRetry={(question) => void ask(question)}
          onReview={setPending}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
          onCopy={(text) => navigator.clipboard?.writeText(text)}
          onPrompt={(prompt) => void ask(prompt)}
        />
      )}
      <CopilotComposer
        input={input}
        onChange={setInput}
        onSend={() => void ask(input)}
        loading={loading}
        placeholder="EstateFlow se kuch bhi poochiye..."
      />
    </CopilotFrame>
  );
}
