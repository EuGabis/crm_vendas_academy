import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Search, UserMinus, Users2, Flame, CheckCircle2, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import {
  getDailyLeads,
  getFunnelMetrics,
  getSellerCards,
  getStageCount,
} from '@/data/queries';
import { formatInt, formatPercent, formatPercentFromRatio } from '@/lib/utils';

const CHART_PALETTE = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export function FunilVendas() {
  const { year, month, sellerId } = useFilters();
  const [search, setSearch] = useState('');
  const ds = useDashboardDatasets();
  const filter = { year, month, sellerId };

  const funnel = useMemo(() => getFunnelMetrics(ds, filter), [ds, filter]);
  const sellerCards = useMemo(() => getSellerCards(ds, filter), [ds, filter]);
  const dailyLeads = useMemo(() => getDailyLeads(ds, filter), [ds, filter]);

  const noShows = getStageCount(ds, filter, 'NO_SHOW');
  const realizadas = funnel.realizadas;
  const taxaResgate = realizadas + noShows ? realizadas / (realizadas + noShows) : 0;
  const topNoShow = [...sellerCards].sort((a, b) => b.noShows - a.noShows).slice(0, 3);

  const filteredSellers = sellerCards.filter((c) =>
    c.seller.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const funnelData = [
    { name: 'Leads', value: funnel.total, fill: '#8b5cf6' },
    { name: 'MQLs', value: funnel.mqls, fill: '#a78bfa' },
    { name: 'SQLs', value: funnel.sqls, fill: '#c4b5fd' },
    { name: 'Vendas', value: funnel.vendas, fill: '#ddd6fe' },
  ];

  const stageData = [
    { stage: 'Leads', count: funnel.total },
    { stage: 'MQLs', count: funnel.mqls },
    { stage: 'SQLs', count: funnel.sqls },
    { stage: 'Agendadas', count: funnel.agendadas },
    { stage: 'Realizadas', count: funnel.realizadas },
    { stage: 'Vendas', count: funnel.vendas },
  ];

  const hasData = ds.leads.length > 0 || ds.sellers.length > 0;

  return (
    <>
      <Header title="Funil de Vendas" subtitle="Conversão do funil comercial no mês" />
      <div className="p-8 space-y-6">
        {ds.isLoading ? (
          <LoadingState />
        ) : ds.error ? (
          <ErrorState message={ds.error.message} />
        ) : !hasData ? (
          <EmptyState
            title="Nenhum dado no funil ainda"
            description="Cadastre vendedores e registre leads para começar a ver as métricas do funil aqui."
            actionLabel="Cadastrar vendedores"
            actionTo="/admin/vendedores"
            icon={Users2}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Leads recebidos"
                value={formatInt(funnel.total)}
                icon={<Users2 className="h-4 w-4" />}
                hint="No período selecionado"
                accent="info"
              />
              <KpiCard
                label="MQLs"
                value={formatInt(funnel.mqls)}
                icon={<Flame className="h-4 w-4" />}
                hint={`Conversão ${formatPercentFromRatio(funnel.mqls, funnel.total)}`}
                accent="brand"
              />
              <KpiCard
                label="SQLs"
                value={formatInt(funnel.sqls)}
                icon={<CheckCircle2 className="h-4 w-4" />}
                hint={`Conversão ${formatPercentFromRatio(funnel.sqls, funnel.mqls)}`}
                accent="warning"
              />
              <KpiCard
                label="Vendas fechadas"
                value={formatInt(funnel.vendas)}
                icon={<Calendar className="h-4 w-4" />}
                hint={`Conversão ${formatPercentFromRatio(funnel.vendas, funnel.sqls)}`}
                accent="success"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Volume diário de leads</h3>
                    <p className="text-xs text-zinc-500">
                      Evolução do mês — total: {formatInt(funnel.total)}
                    </p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyLeads}>
                      <defs>
                        <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
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
                      <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#09090b',
                          border: '1px solid #27272a',
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: '#a1a1aa' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        fill="url(#leadsFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      <UserMinus className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">No-Shows</h3>
                      <p className="text-xs text-zinc-500">Reuniões não realizadas</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-4xl font-bold text-amber-400 tabular-nums">{noShows}</div>
                    <div className="text-xs text-zinc-500 mt-1">Total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                      {formatPercent(taxaResgate)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Taxa Resgate</div>
                  </div>
                </div>
                {topNoShow.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-zinc-800/80">
                    <p className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500 mb-3">
                      Top Vendedores
                    </p>
                    <ul className="space-y-2">
                      {topNoShow.map((c) => (
                        <li
                          key={c.seller.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 text-[10px]">
                              <AvatarFallback style={{ background: c.seller.avatarColor }}>
                                {c.seller.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-zinc-200 truncate max-w-[140px]">
                              {c.seller.fullName.split(' ').slice(0, 2).join(' ')}
                            </span>
                          </div>
                          <span className="text-zinc-400 tabular-nums">{c.noShows}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </div>

            <Card>
              <Tabs defaultValue="por-vendedor">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Breakdown do funil</h3>
                    <p className="text-xs text-zinc-500">Visão por vendedor ou por etapa</p>
                  </div>
                  <TabsList>
                    <TabsTrigger value="por-vendedor">
                      <Users2 className="h-3.5 w-3.5" /> Por Vendedor
                    </TabsTrigger>
                    <TabsTrigger value="por-etapa">
                      <Flame className="h-3.5 w-3.5" /> Por Etapa
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="por-vendedor">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar vendedor..."
                      className="pl-9 max-w-sm"
                    />
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                          <th className="text-right font-semibold px-4 py-3">Leads</th>
                          <th className="text-right font-semibold px-4 py-3">MQL</th>
                          <th className="text-right font-semibold px-4 py-3">SQL</th>
                          <th className="text-right font-semibold px-4 py-3">Agendadas</th>
                          <th className="text-right font-semibold px-4 py-3">Realizadas</th>
                          <th className="text-right font-semibold px-4 py-3">No-Show</th>
                          <th className="text-right font-semibold px-4 py-3">Vendas</th>
                          <th className="text-right font-semibold px-4 py-3">Conv.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {filteredSellers.map((row) => (
                          <tr
                            key={row.seller.id}
                            className="hover:bg-zinc-900/40 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-7 w-7 text-[10px]">
                                  <AvatarFallback style={{ background: row.seller.avatarColor }}>
                                    {row.seller.fullName
                                      .split(' ')
                                      .slice(0, 2)
                                      .map((p) => p[0])
                                      .join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="leading-tight">
                                  <div className="text-zinc-100 font-medium">
                                    {row.seller.fullName}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {row.seller.team}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="text-right tabular-nums text-zinc-200">
                              {formatInt(row.leadsCount)}
                            </td>
                            <td className="text-right tabular-nums text-zinc-300">{row.mqls}</td>
                            <td className="text-right tabular-nums text-zinc-300">{row.sqls}</td>
                            <td className="text-right tabular-nums text-zinc-300">
                              {row.agendadas}
                            </td>
                            <td className="text-right tabular-nums text-zinc-300">
                              {row.realizadas}
                            </td>
                            <td className="text-right tabular-nums text-amber-300">
                              {row.noShows}
                            </td>
                            <td className="text-right tabular-nums text-emerald-400 font-semibold">
                              {row.vendas}
                            </td>
                            <td className="text-right tabular-nums text-zinc-300">
                              {formatPercent(row.conversion)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="por-etapa">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <Tooltip
                            contentStyle={{
                              background: '#09090b',
                              border: '1px solid #27272a',
                              borderRadius: 12,
                              fontSize: 12,
                            }}
                          />
                          <Funnel dataKey="value" data={funnelData} isAnimationActive>
                            <LabelList
                              position="right"
                              fill="#a1a1aa"
                              stroke="none"
                              dataKey="name"
                            />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stageData} layout="vertical">
                          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" stroke="#52525b" fontSize={11} />
                          <YAxis
                            type="category"
                            dataKey="stage"
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
                          />
                          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                            {stageData.map((_, i) => (
                              <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
