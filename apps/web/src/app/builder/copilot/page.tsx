'use client';

import Link from 'next/link';
import { useState } from 'react';
import { answerBuilderQuestion, assistProviderStatus, extractBuilderEnquiry } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass } from '@/features/builder/format';

const EXAMPLES = [
  'Aaj kitne new leads aaye?',
  'Kaunse leads assign nahi hue?',
  'Dwarka project ke liye kaunse dealers compatible hain?',
  'A-301 kis dealers ko recommend kar sakte hain?',
  'Is week visits kitni hui?',
  'Kaunsa inventory slow move kar raha hai?',
  '3BHK demand ₹1.2Cr–₹1.5Cr mein kitni hai?',
  'Project ke liye dealer assignment rules batao.',
];

export default function BuilderCopilotPage() {
  const { workspace, mode } = useBuilderWorkspace();
  const [question, setQuestion] = useState(EXAMPLES[1]);
  const [enquiry, setEnquiry] = useState('Looking for a 3BHK in Dwarka, budget 1.2 to 1.5 cr');
  const [asked, setAsked] = useState(false);
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const answer = asked ? answerBuilderQuestion(workspace, question) : null;
  const extracted = extractBuilderEnquiry(enquiry);
  const assist = assistProviderStatus();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Builder copilot</h2>
        <p className="text-sm text-muted-foreground">{assist.label} {mode === 'demo' ? 'DEMO DATA.' : ''}</p>
      </div>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); setAsked(true); }}>
        <label className="text-sm" htmlFor="copilot-question">Question</label>
        <textarea id="copilot-question" className={`${fieldClass} min-h-20`} value={question} onChange={(event) => setQuestion(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => { setQuestion(example); setAsked(true); }}>{example}</button>
          ))}
        </div>
        <Button type="submit">Ask from records</Button>
      </form>
      {answer && (
        <article className="space-y-2 rounded-xl border p-4 text-sm">
          <p className="font-medium">{answer.label}</p>
          <p>{answer.text}</p>
          {answer.notices.map((notice) => <p key={notice} className="text-muted-foreground">{notice}</p>)}
          <ul>
            {answer.records.map((record) => <li key={record.id}><Link href={record.href}>{record.label}</Link></li>)}
          </ul>
        </article>
      )}
      <section className="space-y-2 rounded-xl border p-4">
        <h3 className="font-medium">Enquiry text</h3>
        <textarea className={`${fieldClass} min-h-20`} aria-label="Enquiry text" value={enquiry} onChange={(event) => setEnquiry(event.target.value)} />
        <p className="text-sm">{extracted.label}</p>
        <p className="text-sm">{extracted.configuration ?? 'Configuration missing'} · {extracted.locality ?? 'Locality missing'} · {extracted.budgetMin ?? '—'}–{extracted.budgetMax ?? '—'}</p>
        {extracted.missing.length > 0 && <p className="text-sm text-muted-foreground">Still missing: {extracted.missing.join(', ')}</p>}
      </section>
    </div>
  );
}
