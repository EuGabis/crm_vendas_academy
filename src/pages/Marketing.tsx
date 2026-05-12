import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Megaphone,
  Users2,
  DollarSign,
  Target,
  Percent,
  AlertTriangle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import {
  getMarketingMetrics,
  getMonthTrafficSpend,
  getSpendByDay,
} from '@/data/queries';
import { formatCompactCurrency, formatCurrency, formatPercent } from '@/lib/utils';

const CHANNEL_COLOR: Record<string, string> = {
  'Meta Ads': '#8b5cf6',
  'Google Ads': '#3b82f6',
  'TikTok Ads': '#ec4899',
  'YouTube Ads': '#ef4444',
  Outros: '#a1a1aa',
};

export function Marketing() {
  const { year, month } = useFilters();
  const ds = useDashboardDatasets();
  const filter = { year, month };

  const metrics = useMemo(() => getMarketingMetrics(ds, filter), [ds, filter]);
  const dailySpend = useMemo(() => getSpendByDay(ds, filter), [ds, filter]);
  const monthSpend = useMemo(() => getMonthTrafficSpend(ds, filter), [ds, filter]);

  const byChannel = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of monthSpend) map[t.channel] = (map[t.channel] ?? 0) + t.amount;
    return Object.entries(map)
      .map(([channel, amount]) => ({ channel, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthSpend]);

  const cacWarning = metrics.ticketMedio > 0 && metrics.cac > 0.3 * metrics.ticketMedio;
  const hasData = ds.traffic.length > 0 || ds.sales.length > 0;

  return (
    <>
      <Header
        title="Marketing — Tráfego e CAC"
        subtitle="Investimento, custo de aquisição e retorno do mês"
      />
      <div className="p-8 space-y-6">
        {ds.isLoading ? (
          <LoadingState />
        ) : ds.error ? (
          <ErrorState message={ds.error.message} />
        ) : !hasData ? (
          <EmptyState
            title="Sem dados de tráfego ou vendas"
            description="Registre os gastos de tráfego e as vendas do mês para visualizar CAC, ROI e CPL."
            actionLabel="Registrar gastos de tráfego"
            actionTo="/admin/trafego"
            icon={Megaphone}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard
                label="Investimento"
                value={formatCompactCurrency(metrics.investment)}
                icon={<Megaphone className="h-4 w-4" />}
                accent="brand"
              />
              <KpiCard
                label="Receita gerada"
                value={formatCompactCurrency(metrics.revenue)}
                icon={<DollarSign className="h-4 w-4" />}
                accent="success"
              />
              <KpiCard
                label="ROI"
                value={metrics.investment ? formatPercent(metrics.roi, 0) : '—'}
                icon={metrics.roi >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                hint={metrics.roi >= 1 ? '> 100% retorno' : 'Abaixo do ideal'}
                accent={metrics.roi >= 1 ? 'success' : 'warning'}
              />
              <KpiCard
                label="CAC"
                value={metrics.cac ? formatCurrency(metrics.cac) : '—'}
                icon={<Target className="h-4 w-4" />}
                hint={cacWarning ? 'Alto vs ticket' : 'Saudável'}
                accent={cacWarning ? 'danger' : 'success'}
              />
              <KpiCard
                label="CPL"
                value={metrics.cpl ? formatCurrency(metrics.cpl) : '—'}
                icon={<Users2 className="h-4 w-4" />}
                hint="Custo por lead"
                accent="info"
              />
              <KpiCard
                label="Ticket médio"
                value={metrics.ticketMedio ? formatCurrency(metrics.ticketMedio) : '—'}
                icon={<Percent className="h-4 w-4" />}
                accent="info"
              />
            </div>

            {cacWarning && (
              <Card className="!bg-amber-500/5 border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">
                      Atenção: CAC está acima de 30% do ticket médio
                    </p>
                    <p className="text-xs text-amber-200/70 mt-1">
                      CAC atual {formatCurrency(metrics.cac)} representa{' '}
                      {formatPercent(metrics.cac / metrics.ticketMedio)} do ticket médio. Revise
                      campanhas ou aumente o ticket.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Investimento diário</h3>
                    <p className="text-xs text-zinc-500">Soma de todos os canais por dia</p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySpend}>
                      <defs>
                        <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={(v: number) => formatCompactCurrency(v).replace('R$ ', '')}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#09090b',
                          border: '1px solid #27272a',
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatCurrency(v)}
                        labelFormatter={(l) => `Dia ${l}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        fill="url(#spendFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-white mb-1">Por canal</h3>
                <p className="text-xs text-zinc-500 mb-4">
                  Investimento total: {formatCompactCurrency(metrics.investment)}
                </p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byChannel} layout="vertical">
                      <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="#52525b"
                        fontSize={10}
                        tickFormatter={(v) => formatCompactCurrency(v).replace('R$ ', '')}
                      />
                      <YAxis
                        type="category"
                        dataKey="channel"
                        stroke="#52525b"
                        fontSize={11}
                        width={80}
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
                      <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                        {byChannel.map((c, i) => (
                          <Cell key={i} fill={CHANNEL_COLOR[c.channel] ?? '#8b5cf6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-4">Custo por etapa do funil</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <p className="section-title mb-2">Custo por Lead (CPL)</p>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {metrics.cpl ? formatCurrency(metrics.cpl) : '—'}
                  </p>
                  <Badge variant="info" className="mt-2">Topo do funil</Badge>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <p className="section-title mb-2">Custo por MQL</p>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {metrics.cpm ? formatCurrency(metrics.cpm) : '—'}
                  </p>
                  <Badge variant="warning" className="mt-2">Meio do funil</Badge>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <p className="section-title mb-2">Custo por SQL</p>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {metrics.cps ? formatCurrency(metrics.cps) : '—'}
                  </p>
                  <Badge variant="success" className="mt-2">Fundo do funil</Badge>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
