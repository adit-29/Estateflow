'use client';

import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-page">Help</h2>
        <p className="mt-1 text-body text-muted-foreground">
          EstateFlow is the operating system for your daily dealer work. Start on Home, then work the pipeline.
        </p>
      </div>
      <section className="rounded-xl border p-4 text-sm space-y-2">
        <h3 className="font-medium">Suggested order</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Add a buyer on Leads.</li>
          <li>Add a property you can actually offer.</li>
          <li>Match, then schedule a visit.</li>
          <li>Complete follow-ups from the reminder list.</li>
          <li>Move the deal and record commission only when it is agreed.</li>
        </ol>
      </section>
      <section className="rounded-xl border p-4 text-sm space-y-2">
        <h3 className="font-medium">Ask EstateFlow AI</h3>
        <p className="text-muted-foreground">
          Copilot reads authorized records in this workspace. It will not invent leads, prices, visits, or commissions.
          Writes such as scheduling a visit always ask for confirmation.
        </p>
        <Link href="/dealer/copilot" className="text-primary underline">Open Copilot</Link>
      </section>
      <section className="rounded-xl border p-4 text-sm space-y-2">
        <h3 className="font-medium">Call and WhatsApp</h3>
        <p className="text-muted-foreground">
          Call and WhatsApp buttons open your phone or WhatsApp. EstateFlow never sends a message silently.
        </p>
      </section>
    </div>
  );
}
