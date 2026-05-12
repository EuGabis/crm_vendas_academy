import { useMemo } from 'react';
import { Trophy, Medal, Award, Users2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import { getSellerCards } from '@/data/queries';
import {
  cn,
  formatCompactCurrency,
  formatCurrency,
  formatInt,
  formatPercent,
} from '@/lib/utils';

const PODIUM = [
  { icon: Trophy, color: 'from-amber-400 to-yellow-600', ring: 'ring-amber-400/40' },
  { icon: Medal, color: 'from-zinc-300 to-zinc-500', ring: 'ring-zinc-400/40' },
  { icon: Award, color: 'from-orange-400 to-orange-700', ring: 'ring-orange-400/40' },
];

export function Ranking() {
  const { year, month } = useFilters();
  const ds = useDashboardDatasets();
  const ranking = useMemo(
    () => [...getSellerCards(ds, { year, month })].sort((a, b) => b.revenue - a.revenue),
    [ds, year, month],
  );

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <>
      <Header title="Ranking de Vendedores" subtitle="Performance do mês — ordenado por receita" />
      <div className="p-8 space-y-6">
        {ds.isLoading ? (
          <LoadingState />
        ) : ds.error ? (
          <ErrorState message={ds.error.message} />
        ) : ranking.length === 0 ? (
          <EmptyState
            title="Sem vendedores cadastrados"
            description="O ranking aparece aqui após o cadastro de vendedores e o registro de vendas."
            actionLabel="Cadastrar vendedores"
            actionTo="/admin/vendedores"
            icon={Users2}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {top3.map((row, i) => {
                const meta = PODIUM[i];
                const Icon = meta.icon;
                const pct = row.goal ? row.revenue / row.goal : 0;
                return (
                  <Card key={row.seller.id} className="relative overflow-hidden !p-6">
                    <div
                      className={cn(
                        'absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-3xl',
                        `bg-gradient-to-br ${meta.color}`,
                      )}
                    />
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-2xl ring-2',
                          `bg-gradient-to-br ${meta.color}`,
                          meta.ring,
                        )}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-4xl font-black text-zinc-700">#{i + 1}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback style={{ background: row.seller.avatarColor }}>
                          {row.seller.fullName
                            .split(' ')
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{row.seller.fullName}</p>
                        <p className="text-xs text-zinc-500">{row.seller.team}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-3xl font-bold text-white tabular-nums">
                          {formatCompactCurrency(row.revenue)}
                        </p>
                        <p className="text-xs text-zinc-500">Receita do mês</p>
                      </div>
                      <Progress value={Math.min(100, pct * 100)} />
                      <p className="text-xs text-zinc-400">
                        {formatPercent(pct)} da meta · {row.coursesSold} cursos
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-4">Ranking completo</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">#</th>
                      <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                      <th className="text-right font-semibold px-4 py-3">Receita</th>
                      <th className="text-right font-semibold px-4 py-3">Cursos</th>
                      <th className="text-right font-semibold px-4 py-3">% Meta</th>
                      <th className="text-right font-semibold px-4 py-3">Ticket Médio</th>
                      <th className="text-right font-semibold px-4 py-3">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {rest.map((row, i) => {
                      const pct = row.goal ? row.revenue / row.goal : 0;
                      const ticket = row.coursesSold ? row.revenue / row.coursesSold : 0;
                      return (
                        <tr key={row.seller.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="px-4 py-3 text-zinc-500 font-semibold">{i + 4}</td>
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
                              <span className="text-zinc-100 font-medium">
                                {row.seller.fullName}
                              </span>
                            </div>
                          </td>
                          <td className="text-right tabular-nums text-zinc-100 font-semibold">
                            {formatCurrency(row.revenue)}
                          </td>
                          <td className="text-right tabular-nums text-zinc-300">
                            {formatInt(row.coursesSold)}
                          </td>
                          <td className="text-right tabular-nums">
                            <Badge
                              variant={pct >= 1 ? 'success' : pct >= 0.7 ? 'warning' : 'danger'}
                            >
                              {formatPercent(pct)}
                            </Badge>
                          </td>
                          <td className="text-right tabular-nums text-zinc-300">
                            {formatCurrency(ticket)}
                          </td>
                          <td className="text-right tabular-nums text-zinc-300">
                            {formatPercent(row.conversion)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
