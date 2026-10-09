'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function PageHeader({
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>}
        <h2 className="mt-1 text-page">{title}</h2>
        {description && <p className="mt-1 text-body text-muted-foreground">{description}</p>}
      </div>
      {(primary || secondary) && (
        <div className="flex flex-wrap gap-2">
          {secondary && <Button asChild variant="outline"><Link href={secondary.href}>{secondary.label}</Link></Button>}
          {primary && <Button asChild variant="accept"><Link href={primary.href}>{primary.label}</Link></Button>}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-white to-teal-50/70 px-5 py-8">
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">{body}</p>
      {action && <Button asChild variant="accept" className="mt-4"><Link href={action.href}>{action.label}</Link></Button>}
    </div>
  );
}

export function IntentMeter({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const tone = score >= 7 ? 'from-rose-500 to-orange-400' : score >= 4 ? 'from-amber-400 to-yellow-300' : 'from-sky-400 to-teal-400';
  return (
    <div className="space-y-1.5">
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full bg-gradient-to-r', tone)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-helper tabular-nums text-muted-foreground">{score.toFixed(1)} / {max}</p>
    </div>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

const AVATAR_TONES = [
  'from-teal-500 to-emerald-600',
  'from-sky-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-fuchsia-600',
];

export function avatarTone(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n += seed.charCodeAt(i);
  return AVATAR_TONES[n % AVATAR_TONES.length];
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-6">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {onRetry && <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

const METRIC_TONE: Record<string, string> = {
  teal: 'border-teal-200 bg-gradient-to-br from-teal-50 to-white',
  sky: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',
  amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
  rose: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white',
  violet: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white',
  indigo: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white',
  orange: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white',
};

export function MetricCard({
  label,
  value,
  definition,
  href,
  tone = 'teal',
}: {
  label: string;
  value: string | number;
  definition: string;
  href?: string;
  tone?: keyof typeof METRIC_TONE;
}) {
  const inner = (
    <>
      <p className="text-meta text-muted-foreground">{label}</p>
      <p className="mt-2 text-kpi tabular-nums">{value}</p>
      <p className="mt-2 text-helper text-muted-foreground">{definition}</p>
    </>
  );
  const className = cn('rounded-2xl border p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5', METRIC_TONE[tone] ?? METRIC_TONE.teal);
  if (href) return <Link href={href} className={className}>{inner}</Link>;
  return <div className={className}>{inner}</div>;
}

export function AccentCard({
  children,
  tone = 'teal',
  className,
}: {
  children: React.ReactNode;
  tone?: 'teal' | 'sky' | 'amber' | 'rose' | 'violet' | 'indigo' | 'orange';
  className?: string;
}) {
  const bar =
    tone === 'sky' ? 'bg-sky-500' :
    tone === 'amber' ? 'bg-amber-500' :
    tone === 'rose' ? 'bg-rose-500' :
    tone === 'violet' ? 'bg-violet-500' :
    tone === 'indigo' ? 'bg-indigo-500' :
    tone === 'orange' ? 'bg-orange-500' : 'bg-teal-500';
  return (
    <section className={cn('relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm', className)}>
      <span className={cn('absolute inset-y-0 left-0 w-1.5', bar)} />
      <div className="pl-3">{children}</div>
    </section>
  );
}

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span className="px-1.5">/</span>}
          {item.href ? <Link href={item.href} className="hover:text-foreground">{item.label}</Link> : item.label}
        </span>
      ))}
    </nav>
  );
}

export function SectionNav({
  groups,
}: {
  groups: { label: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] }[];
}) {
  return (
    <div className="space-y-4 p-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{group.label}</p>
        </div>
      ))}
    </div>
  );
}

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500', className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function StatusDot({ tone }: { tone: 'critical' | 'warn' | 'info' | 'ok' }) {
  const color =
    tone === 'critical' ? 'bg-red-500' : tone === 'warn' ? 'bg-amber-500' : tone === 'ok' ? 'bg-emerald-500' : 'bg-sky-500';
  return <span className={cn('inline-block h-2 w-2 rounded-full', color)} aria-hidden />;
}
