import Link from 'next/link';
import { createDemoBuilderWorkspace } from '@estateflow/shared';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCr } from '@/lib/marketplace-stats';

export default function AgentsPage() {
  const workspace = createDemoBuilderWorkspace(new Date('2026-10-01T10:00:00+05:30'));
  const dealers = workspace.dealers.filter((dealer) => dealer.active && !dealer.suspended);

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-amber-700">For agents</p>
            <h1 className="text-3xl font-semibold">Find an agent</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Active demo agencies from the builder workspace. This is not a live broker directory. To list inventory or receive leads, open Dealer Connect.
            </p>
          </div>
          <Button asChild className="bg-amber-400 text-black hover:bg-amber-300">
            <Link href="/auth/sign-in?role=dealer">List property / Dealer Connect</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {dealers.map((dealer) => (
            <article key={dealer.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{dealer.name}</h2>
                  <p className="text-sm text-muted-foreground">{dealer.agencyName}</p>
                </div>
                <Badge variant="info">Demo</Badge>
              </div>
              <p className="mt-3 text-sm">{dealer.localities.join(', ') || 'Locality not recorded'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {dealer.configurations.join(', ')}
                {dealer.budgetMin != null && dealer.budgetMax != null ? ` · ${formatCr(dealer.budgetMin)}–${formatCr(dealer.budgetMax)}` : ''}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {dealer.responsesInWindow}/{dealer.assignmentsInWindow} responses in the demo window · {dealer.capacity} capacity
              </p>
            </article>
          ))}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
