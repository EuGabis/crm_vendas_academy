import { type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './card';

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  delta?: number;
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const ACCENT_BG: Record<NonNullable<KpiCardProps['accent']>, string> = {
  brand: 'bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/20',
  success: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
  danger: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20',
  info: 'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20',
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  delta,
  accent = 'brand',
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between">
        <span className="section-title">{label}</span>
        {icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', ACCENT_BG[accent])}>
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value text-white">{value}</div>
      <div className="flex items-center justify-between min-h-[20px]">
        <span className="text-xs text-zinc-500">{hint}</span>
        {typeof delta === 'number' && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold',
              delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400',
            )}
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : delta < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </Card>
  );
}
