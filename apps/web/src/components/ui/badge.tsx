import { cn } from '@/lib/utils';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'muted' | 'outline' | 'hot' | 'warm' | 'cold' | 'success' | 'warning' | 'info' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        variant === 'outline' && 'border text-foreground',
        variant === 'hot' && 'bg-rose-100 text-rose-700',
        variant === 'warm' && 'bg-amber-100 text-amber-800',
        variant === 'cold' && 'bg-sky-100 text-sky-800',
        variant === 'success' && 'bg-emerald-100 text-emerald-800',
        variant === 'warning' && 'bg-orange-100 text-orange-800',
        variant === 'info' && 'bg-indigo-100 text-indigo-800',
        className,
      )}
      {...props}
    />
  );
}
