import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Repeat,
  ArrowRight,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/ui/empty-state';
import { useGuruTransactionsAll } from '@/hooks/useGuru';
import {
  today,
  daysAgo,
  startOfMonth,
  startOfPrevMonth,
  endOfPrevMonth,
  isoDate,
} from '@/lib/guru';
import {
  normalizeStatus,
  txStatus,
  STATUS_LABELS,
  STATUS_VARIANT,
  txDate,
  txProductName,
  txValue,
} from '@/types/guru';
import { formatCompactCurrency, formatCurrency, formatInt } from '@/lib/utils';

type PeriodKey = 'today' | '7d' | '30d' | 'this_month' | '90d';

interface PeriodDef {
  key: PeriodKey;
  label: string;
  ini: () => string;
  end: () => string;
  /** Período anterior pra comparação (mesma duração, deslocado). */
  prev: () => { ini: string; end: string };
}

const PERIODS: PeriodDef[] = [
  {
    key: 'today',
    label: 'Hoje',
    ini: () => today(),
    end: () => today(),
    prev: () => ({ ini: daysAgo(1), end: daysAgo(1) }),
  },
  {
    key: '7d',
    label: '7 dias',
    ini: () => daysAgo(6),
    end: () => today(),
    prev: () => ({ ini: daysAgo(13), end: daysAgo(7) }),
  },
  {
    key: '30d',
    label: '30 dias',
    ini: () => daysAgo(29),
    end: () => today(),
    prev: () => ({ ini: daysAgo(59), end: daysAgo(30) }),
  },
  {
    key: 'this_month',
    label: 'Mês atual',
    ini: () => startOfMonth(),
    end: () => today(),
    prev: () => ({ ini: startOfPrevMonth(), end: endOfPrevMonth() }),
  },
  {
    key: '90d',
    label: '90 dias',
    ini: () => daysAgo(89),
    end: () => today(),
    prev: () => ({ ini: daysAgo(179), end: daysAgo(90) }),
  },
];

function diffPct(now: number, prev: number): number | null {
  if (prev === 0) return now > 0 ? null : 0;
  return ((now - prev) / prev) * 100;
}

function fmtTrend(pct: number | null): string {
  if (pct == null) return '—';
  const s = pct >= 0 ? '+' : '';
  return `${s}${pct.toFixed(0)}%`;
}

export function FinanceiroDashboard() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('30d');
  const period = PERIODS.find((p) => p.key === periodKey)!;

  const ini = period.ini();
  const end = period.end();
  const prev = period.prev();

  const { data, isLoading, error } = useGuruTransactionsAll({
    ordered_at_ini: ini,
    ordered_at_end: end,
    per_page: 100,
    maxPages: 5,
  });

  // Período anterior pra comparação (limita a 3 páginas pra economizar)
  const { data: prevData } = useGuruTransactionsAll({
    ordered_at_ini: prev.ini,
    ordered_at_end: prev.end,
    per_page: 100,
    maxPages: 3,
  });

  const transactions = data?.data ?? [];
  const prevTransactions = prevData?.data ?? [];
  const meta = (data?.meta ?? {}) as {
    total?: number;
    truncated?: boolean;
    fetched_pages?: number;
  };
  const totalAvailable =
    typeof meta.total === 'number' ? meta.total : transactions.length;
  const truncated = meta.truncated === true;
  const fetchedPages = meta.fetched_pages ?? 1;

  const stats = useMemo(() => {
    const todayStr = today();
    const onlyPaid = transactions.filter(
      (t) => normalizeStatus(txStatus(t)) === 'paid',
    );

    const revenueTotal = onlyPaid.reduce((a, t) => a + txValue(t), 0);
    const revenueAvg = onlyPaid.length ? revenueTotal / onlyPaid.length : 0;

    const todayTxs = onlyPaid.filter(
      (t) => txDate(t)?.slice(0, 10) === todayStr,
    );
    const revenueToday = todayTxs.reduce((a, t) => a + txValue(t), 0);

    // Receita diária — quantos dias mostrar no gráfico depende do período
    const days =
      periodKey === 'today'
        ? 1
        : periodKey === '7d'
          ? 7
          : periodKey === '90d'
            ? 90
            : 30;
    const byDay = new Map<string, number>();
    for (const t of onlyPaid) {
      const d = txDate(t)?.slice(0, 10);
      if (!d) continue;
      byDay.set(d, (byDay.get(d) ?? 0) + txValue(t));
    }
    const dailySeries: { date: string; label: string; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = isoDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
      dailySeries.push({
        date: d,
        label: d.slice(5),
        revenue: byDay.get(d) ?? 0,
      });
    }

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const t of transactions) {
      const s = normalizeStatus(txStatus(t));
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    // Top produtos (paid only)
    const byProduct = new Map<string, { count: number; revenue: number }>();
    for (const t of onlyPaid) {
      const name = txProductName(t);
      const cur = byProduct.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += txValue(t);
      byProduct.set(name, cur);
    }
    const topProducts = Array.from(byProduct.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      revenueTotal,
      revenueAvg,
      revenueToday,
      countTotal: onlyPaid.length,
      countToday: todayTxs.length,
      totalInPeriod: transactions.length,
      dailySeries,
      byStatus,
      topProducts,
    };
  }, [transactions, periodKey]);

  const prevStats = useMemo(() => {
    const paid = prevTransactions.filter(
      (t) => normalizeStatus(txStatus(t)) === 'paid',
    );
    const revenue = paid.reduce((a, t) => a + txValue(t), 0);
    return {
      revenue,
      count: paid.length,
      avg: paid.length ? revenue / paid.length : 0,
    };
  }, [prevTransactions]);

  const trendRevenue = diffPct(stats.revenueTotal, prevStats.revenue);
  const trendCount = diffPct(stats.countTotal, prevStats.count);
  const trendAvg = diffPct(stats.revenueAvg, prevStats.avg);

  return (
    <>
      <Header title="Financeiro" subtitle={`Período: ${period.label}`} />
      <div className="page">
        {/* Filtro de período */}
        <Card className="!p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="text-xs text-zinc-500 mr-1">Período:</span>
            <Select value={periodKey} onValueChange={(v) => setPeriodKey(v as PeriodKey)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-zinc-500 ml-auto tabular-nums">
              {ini === end ? ini : `${ini} → ${end}`}
            </span>
          </div>
          {transactions.length > 0 && (
            <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-2">
              <span>
                {transactions.length} de {totalAvailable} transações ·{' '}
                {fetchedPages} {fetchedPages === 1 ? 'página' : 'páginas'} buscadas
              </span>
              {truncated && (
                <span className="text-amber-500">
                  ⚠ período tem mais dados — aumente o limite ou estreite o filtro
                </span>
              )}
            </div>
          )}
        </Card>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={(error as Error).message} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <KpiCard
                label="Vendas hoje"
                value={formatInt(stats.countToday)}
                hint={formatCompactCurrency(stats.revenueToday)}
                icon={<ShoppingCart className="h-4 w-4" />}
                accent="brand"
              />
              <KpiCard
                label={`Receita ${period.label.toLowerCase()}`}
                value={formatCompactCurrency(stats.revenueTotal)}
                hint={`${fmtTrend(trendRevenue)} vs período anterior`}
                icon={<DollarSign className="h-4 w-4" />}
                accent="success"
              />
              <KpiCard
                label="Vendas pagas"
                value={formatInt(stats.countTotal)}
                hint={`${fmtTrend(trendCount)} vs anterior`}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="info"
              />
              <KpiCard
                label="Ticket médio"
                value={formatCurrency(stats.revenueAvg)}
                hint={`${fmtTrend(trendAvg)} vs anterior`}
                icon={<Receipt className="h-4 w-4" />}
                accent="warning"
              />
              <KpiCard
                label="Total no período"
                value={formatInt(stats.totalInPeriod)}
                hint="todas (pagas + pendentes)"
                icon={<Repeat className="h-4 w-4" />}
                accent="info"
              />
            </div>

            {/* Gráfico diário */}
            <Card>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Receita diária — {period.label.toLowerCase()}
                  </h3>
                  <p className="text-xs text-zinc-500">Apenas vendas com status pago</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailySeries}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#52525b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#52525b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v).replace('R$ ', '')}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      fill="url(#revFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Status breakdown + Top produtos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Status das transações</h3>
                <div className="space-y-2">
                  {Object.entries(stats.byStatus)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => {
                      const ns = status as keyof typeof STATUS_LABELS;
                      const total = stats.totalInPeriod || 1;
                      const pct = count / total;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-32 shrink-0">
                            <Badge variant={STATUS_VARIANT[ns]}>{STATUS_LABELS[ns]}</Badge>
                          </div>
                          <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-brand-gradient"
                              style={{ width: `${pct * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-400 tabular-nums w-16 text-right">
                            {count} ({Math.round(pct * 100)}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Top produtos (pagas)</h3>
                {stats.topProducts.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6">
                    Sem vendas pagas no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stats.topProducts.map((p) => {
                      const max = stats.topProducts[0].revenue || 1;
                      const pct = p.revenue / max;
                      return (
                        <div key={p.name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-200 truncate flex-1 mr-2">{p.name}</span>
                            <span className="text-emerald-400 tabular-nums font-semibold">
                              {formatCompactCurrency(p.revenue)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full bg-brand-gradient"
                                style={{ width: `${pct * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-500 tabular-nums w-12 text-right">
                              {p.count} vd
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Últimas vendas */}
            <Card className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-white">Últimas vendas</h3>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/financeiro/vendas">
                    Ver todas <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                  <AlertCircle className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                  Nenhuma venda no período
                </div>
              ) : (
                <div className="divide-y divide-zinc-900 max-h-96 overflow-y-auto">
                  {transactions.slice(0, 10).map((t) => {
                    const ns = normalizeStatus(txStatus(t));
                    return (
                      <Link
                        key={t.id}
                        to={`/financeiro/vendas/${t.id}`}
                        className="flex items-center justify-between p-3 hover:bg-zinc-900/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-100 truncate">
                              {t.contact?.name ?? 'Cliente sem nome'}
                            </span>
                            <Badge variant={STATUS_VARIANT[ns]} className="text-[9px] shrink-0">
                              {STATUS_LABELS[ns]}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate">
                            {txProductName(t)}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-sm font-bold text-emerald-400 tabular-nums">
                            {formatCurrency(txValue(t))}
                          </div>
                          <div className="text-[10px] text-zinc-600">
                            {txDate(t)?.slice(0, 10) ?? '—'}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
