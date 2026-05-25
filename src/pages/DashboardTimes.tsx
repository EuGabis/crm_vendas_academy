import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CreditCard,
  Wallet,
  Receipt,
  Banknote,
  Target,
  TrendingUp,
  Trophy,
  Calendar,
  AlertCircle,
  Users2,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import {
  getAccumulatedGoalToToday,
  getAccumulatedVsGoal,
  getConsolidatedGoal,
  getCoursesSold,
  getPaymentMethodBreakdown,
  getProjection,
  getRevenueSum,
  getSellerCards,
} from '@/data/queries';
import {
  cn,
  formatCompactCurrency,
  formatCurrency,
  formatInt,
  formatPercent,
} from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/domain';

const METHOD_ICON: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  AVISTA: Wallet,
  CARTAO_PARCELADO: CreditCard,
  CARTAO_RECORRENCIA: Receipt,
  BOLETO: Banknote,
  PIX: Banknote,
};

const METHOD_ACCENT: Record<PaymentMethod, string> = {
  AVISTA: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
  CARTAO_PARCELADO: 'text-blue-300 bg-blue-500/10 ring-blue-500/20',
  CARTAO_RECORRENCIA: 'text-violet-300 bg-violet-500/10 ring-violet-500/20',
  BOLETO: 'text-amber-300 bg-amber-500/10 ring-amber-500/20',
  PIX: 'text-rose-300 bg-rose-500/10 ring-rose-500/20',
};

export function DashboardTimes() {
  const { year, month, sellerId } = useFilters();
  const ds = useDashboardDatasets();
  const filter = { year, month, sellerId };
  const isIndividual = sellerId !== 'all';

  const data = useMemo(() => {
    const goal = getConsolidatedGoal(ds, filter);
    const revenue = getRevenueSum(ds, filter);
    const courses = getCoursesSold(ds, filter);
    const accumulatedGoal = getAccumulatedGoalToToday(ds, filter);
    const projection = getProjection(ds, filter);
    const accVsGoal = getAccumulatedVsGoal(ds, filter);
    const breakdown = getPaymentMethodBreakdown(ds, filter);
    const cards = getSellerCards(ds, filter);
    const ranking = [...cards].sort((a, b) => b.revenue - a.revenue);
    return {
      goal,
      revenue,
      courses,
      accumulatedGoal,
      projection,
      accVsGoal,
      breakdown,
      ranking,
    };
  }, [ds, filter]);

  const pace = data.accumulatedGoal ? data.revenue / data.accumulatedGoal : 0;
  const paceAccent = pace >= 1 ? 'success' : pace >= 0.85 ? 'warning' : 'danger';
  const goalProgress = data.goal.revenueGoal ? data.revenue / data.goal.revenueGoal : 0;
  const ticketMedio = data.courses ? data.revenue / data.courses : 0;
  const sellerInfo = isIndividual ? ds.sellers.find((s) => s.id === sellerId) : null;
  const myRanking = isIndividual
    ? data.ranking.findIndex((r) => r.seller.id === sellerId) + 1
    : null;

  const hasSellers = ds.sellers.length > 0;
  const hasAnyData = hasSellers && (ds.sales.length > 0 || ds.goals.length > 0);

  return (
    <>
      <Header
        title={isIndividual && sellerInfo ? `Dashboard — ${sellerInfo.fullName}` : 'Dashboard Times'}
        subtitle={
          isIndividual
            ? 'Visão individual do vendedor no mês'
            : 'Visão consolidada do time comercial'
        }
      />

      <div className="page">
        {ds.isLoading ? (
          <LoadingState />
        ) : ds.error ? (
          <ErrorState message={ds.error.message} />
        ) : !hasSellers ? (
          <EmptyState
            title="Nenhum vendedor cadastrado"
            description="Para começar, cadastre seus vendedores no painel administrativo."
            actionLabel="Cadastrar vendedores"
            actionTo="/admin/vendedores"
            icon={Users2}
          />
        ) : !hasAnyData ? (
          <EmptyState
            title="Sem vendas ou metas registradas"
            description="Defina as metas mensais dos vendedores e registre vendas para visualizar o dashboard."
            actionLabel="Definir metas"
            actionTo="/admin/metas"
            icon={Target}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard
                label="Meta do mês"
                value={formatCompactCurrency(data.goal.revenueGoal)}
                icon={<Target className="h-4 w-4" />}
                hint={`${data.goal.businessDays} dias úteis`}
                accent="brand"
              />
              <KpiCard
                label="Vendido no mês"
                value={formatCompactCurrency(data.revenue)}
                icon={<TrendingUp className="h-4 w-4" />}
                hint={`${formatPercent(goalProgress)} da meta`}
                accent="info"
              />
              <KpiCard
                label="Meta acumulada"
                value={formatCompactCurrency(data.accumulatedGoal)}
                icon={<Calendar className="h-4 w-4" />}
                hint={`Pace ${formatPercent(pace)}`}
                accent={paceAccent}
              />
              <KpiCard
                label="Cursos vendidos"
                value={formatInt(data.courses)}
                icon={<Wallet className="h-4 w-4" />}
                hint={`Meta ${formatInt(data.goal.coursesGoal)}`}
                accent="success"
              />
              <KpiCard
                label="Ticket médio"
                value={formatCurrency(ticketMedio)}
                icon={<Receipt className="h-4 w-4" />}
                accent="info"
              />
              <KpiCard
                label="Projeção"
                value={formatCompactCurrency(data.projection)}
                icon={<TrendingUp className="h-4 w-4" />}
                hint="Ritmo atual × dias úteis"
                accent={data.projection >= data.goal.revenueGoal ? 'success' : 'warning'}
              />
            </div>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">Progresso da meta mensal</p>
                  <p className="text-xs text-zinc-500">
                    {formatCurrency(data.revenue, { full: true })} de{' '}
                    {formatCurrency(data.goal.revenueGoal, { full: true })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{formatPercent(goalProgress)}</div>
                  {isIndividual && myRanking ? (
                    <Badge variant="default" className="mt-1">
                      <Trophy className="h-3 w-3 mr-1" /> #{myRanking} no ranking
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Progress value={Math.min(100, goalProgress * 100)} />
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-zinc-500">
                  Acumulado de hoje: {formatCurrency(data.accumulatedGoal)}
                </span>
                {pace < 1 && data.accumulatedGoal > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    Faltam {formatCurrency(data.accumulatedGoal - data.revenue)} para o pace ideal
                  </span>
                )}
                {pace >= 1 && data.accumulatedGoal > 0 && (
                  <span className="text-emerald-400">Acima do pace ideal ✓</span>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Vendido vs Meta — acumulado</h3>
                  <p className="text-xs text-zinc-500">Curva diária do mês</p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.accVsGoal}>
                    <defs>
                      <linearGradient id="vendidoLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#a78bfa" />
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
                    <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                    <Line
                      type="monotone"
                      dataKey="meta"
                      name="Meta acumulada"
                      stroke="#52525b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendido"
                      name="Vendido acumulado"
                      stroke="url(#vendidoLine)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#a78bfa' }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Formas de pagamento</h3>
                <span className="text-xs text-zinc-500">
                  {formatInt(data.courses)} vendas no mês
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {data.breakdown.map((b) => {
                  const Icon = METHOD_ICON[b.method];
                  return (
                    <Card key={b.method} className="!p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-xl ring-1',
                            METHOD_ACCENT[b.method],
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <Badge variant="muted">{formatPercent(b.share, 1)}</Badge>
                      </div>
                      <p className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500 mb-1">
                        {PAYMENT_METHOD_LABELS[b.method]}
                      </p>
                      <p className="text-xl font-bold text-white tabular-nums">
                        {formatCompactCurrency(b.amount)}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">{formatInt(b.count)} vendas</p>
                    </Card>
                  );
                })}
              </div>
            </div>

            {!isIndividual && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Vendedores</h3>
                  <span className="text-xs text-zinc-500">Performance no mês</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.ranking.map((row, idx) => {
                    const pct = row.goal ? row.revenue / row.goal : 0;
                    const accent =
                      pct >= 1 ? 'text-emerald-400' : pct >= 0.7 ? 'text-amber-400' : 'text-red-400';
                    return (
                      <Card key={row.seller.id} className="!p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback style={{ background: row.seller.avatarColor }}>
                                {row.seller.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-white leading-tight">
                                {row.seller.fullName}
                              </p>
                              <p className="text-[11px] text-zinc-500">{row.seller.team}</p>
                            </div>
                          </div>
                          <Badge variant={idx === 0 ? 'success' : idx <= 2 ? 'default' : 'muted'}>
                            #{idx + 1}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-zinc-500">Vendido</span>
                            <span className="text-base font-bold text-white tabular-nums">
                              {formatCompactCurrency(row.revenue)}
                            </span>
                          </div>
                          <Progress value={Math.min(100, pct * 100)} />
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-500">
                              Meta {formatCompactCurrency(row.goal)}
                            </span>
                            <span className={cn('font-semibold tabular-nums', accent)}>
                              {formatPercent(pct)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                              Cursos
                            </p>
                            <p className="text-sm font-semibold text-zinc-200">
                              {row.coursesSold}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                              Leads
                            </p>
                            <p className="text-sm font-semibold text-zinc-200">{row.leadsCount}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                              Conv.
                            </p>
                            <p className="text-sm font-semibold text-zinc-200">
                              {formatPercent(row.conversion)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
