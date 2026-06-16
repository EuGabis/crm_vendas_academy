import { useMemo } from 'react';
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
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/empty-state';
import { useGuruTransactions } from '@/hooks/useGuru';
import { today, daysAgo, startOfMonth } from '@/lib/guru';
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

export function FinanceiroDashboard() {
  // Últimos 30 dias (cobre dia + mês + gráfico)
  // Conservador: 14 dias × 50 por página pra ficar dentro do limite Hobby
  const { data, isLoading, error } = useGuruTransactions({
    ordered_at_ini: daysAgo(14),
    ordered_at_end: today(),
    per_page: 50,
  });

  const transactions = data?.data ?? [];

  const stats = useMemo(() => {
    const todayStr = today();
    const monthStart = startOfMonth();

    const onlyPaid = transactions.filter((t) => normalizeStatus(txStatus(t)) === 'paid');

    const todayTxs = onlyPaid.filter((t) => {
      const d = txDate(t);
      return d?.slice(0, 10) === todayStr;
    });

    const monthTxs = onlyPaid.filter((t) => {
      const d = txDate(t);
      return d && d.slice(0, 10) >= monthStart;
    });

    const revenueToday = todayTxs.reduce((acc, t) => acc + txValue(t), 0);
    const revenueMonth = monthTxs.reduce((acc, t) => acc + txValue(t), 0);
    const revenueAvg = monthTxs.length ? revenueMonth / monthTxs.length : 0;

    // Receita diária últimos 30d
    const byDay = new Map<string, number>();
    for (const t of onlyPaid) {
      const d = txDate(t)?.slice(0, 10);
      if (!d) continue;
      byDay.set(d, (byDay.get(d) ?? 0) + txValue(t));
    }
    const dailySeries: { date: string; label: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = daysAgo(i);
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

    return {
      revenueToday,
      revenueMonth,
      revenueAvg,
      countToday: todayTxs.length,
      countMonth: monthTxs.length,
      total: transactions.length,
      dailySeries,
      byStatus,
    };
  }, [transactions]);

  return (
    <>
      <Header title="Financeiro" subtitle="Vendas e receita da Guru — últimos 14 dias" />
      <div className="page">
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
                label="Receita hoje"
                value={formatCompactCurrency(stats.revenueToday)}
                icon={<DollarSign className="h-4 w-4" />}
                accent="success"
              />
              <KpiCard
                label="Receita mês"
                value={formatCompactCurrency(stats.revenueMonth)}
                hint={`${formatInt(stats.countMonth)} vendas`}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="info"
              />
              <KpiCard
                label="Ticket médio"
                value={formatCurrency(stats.revenueAvg)}
                icon={<Receipt className="h-4 w-4" />}
                accent="warning"
              />
              <KpiCard
                label="Total no período"
                value={formatInt(stats.total)}
                hint="todas (pagas + pendentes)"
                icon={<Repeat className="h-4 w-4" />}
                accent="info"
              />
            </div>

            {/* Gráfico diário */}
            <Card>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Receita diária — últimos 14 dias</h3>
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
                    <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
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

            {/* Breakdown por status + últimas vendas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Status das transações</h3>
                <div className="space-y-2">
                  {Object.entries(stats.byStatus)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => {
                      const ns = status as keyof typeof STATUS_LABELS;
                      const total = stats.total || 1;
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
                    Nenhuma venda nos últimos 30 dias
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-900 max-h-72 overflow-y-auto">
                    {transactions.slice(0, 8).map((t) => {
                      const ns = normalizeStatus(txStatus(t));
                      return (
                        <div
                          key={t.id}
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
