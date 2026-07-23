import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const BRL_FULL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const INT = new Intl.NumberFormat('pt-BR');

const PCT = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number, opts?: { full?: boolean }) {
  if (!Number.isFinite(value)) return 'R$ 0';
  return opts?.full ? BRL_FULL.format(value) : BRL.format(value);
}

export function formatCompactCurrency(value: number) {
  if (!Number.isFinite(value)) return 'R$ 0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return BRL.format(value);
}

export function formatInt(value: number) {
  if (!Number.isFinite(value)) return '0';
  return INT.format(Math.round(value));
}

export function formatPercent(value: number, decimals = 1) {
  if (!Number.isFinite(value)) return '0%';
  const fmt = new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return fmt.format(value);
}

export function formatPercentFromRatio(numerator: number, denominator: number) {
  if (!denominator) return '0,0%';
  return PCT.format(numerator / denominator);
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function rangeDays(start: Date, end: Date) {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function businessDaysInMonth(year: number, monthIndex: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const day = new Date(year, monthIndex, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function businessDaysElapsed(year: number, monthIndex: number, asOf: Date) {
  const limit =
    asOf.getFullYear() === year && asOf.getMonth() === monthIndex
      ? asOf.getDate()
      : new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= limit; d++) {
    const day = new Date(year, monthIndex, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function monthLabelPt(date: Date) {
  return date
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase());
}

export function dayLabelPt(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
