'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { useLiveMode } from '@/components/use-live-mode';
import { Button } from '@/components/ui/button';
import { LiveCopilot } from '@/features/copilot/live-copilot';
import { pageContextFromPath } from '@/features/copilot/copilot-chat';
import CopilotPage from '@/app/dealer/copilot/page';

export function CopilotLauncher() {
  const pathname = usePathname();
  const mode = useLiveMode();
  const [open, setOpen] = useState(false);
  if (mode === 'loading' || pathname.startsWith('/dealer/copilot') || pathname.startsWith('/dealer/onboarding')) return null;
  const context = pageContextFromPath(pathname);

  return (
    <>
      <button
        type="button"
        className="fixed bottom-20 right-4 z-40 rounded-full bg-blue-600 px-4 py-3 text-meta font-medium text-white shadow-lg lg:bottom-6"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2"><Bot className="h-4 w-4" /> Ask EstateFlow</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 lg:bg-transparent">
          <div className="flex h-full w-full flex-col bg-background shadow-2xl lg:w-[28rem] lg:border-l">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="font-semibold">Ask EstateFlow</p>
                {context.prompts[0] && <p className="text-meta text-muted-foreground">{context.prompts[0]}</p>}
              </div>
              <Button size="sm" variant="outline" type="button" onClick={() => setOpen(false)} aria-label="Close Copilot">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-3">
              {mode === 'live' ? <LiveCopilot compact pagePath={pathname} /> : <CopilotPage />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
