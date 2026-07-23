import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import { getSellerCards, getGoalForSeller, getGoalsForMonth } from '@/data/queries';
import { formatInt, formatPercent } from '@/lib/utils';
import { Target, Pencil } from 'lucide-react';

function pts(n: number): string {
  return `${formatInt(Math.round(n * 10) / 10)} pts`;
}

export function MetasTimes() {
  const { year, month } = useFilters();
  const ds = useDashboardDatasets();
  const cards = useMemo(() => getSellerCards(ds, { year, month }), [ds, year, month]);

  const totalPointsGoal = getGoalsForMonth(ds, year, month)
    .reduce((a, b) => a + (b.pointsGoal ?? 0), 0);
  const totalPoints = cards.reduce((a, c) => a + c.points, 0);

  return (
    <>
      <Header title="Metas de Times" subtitle="Visão consolidada das metas mensais" />
      <div className="page">
        {ds.isLoading ? (
          <LoadingState />
        ) : ds.error ? (
          <ErrorState message={ds.error.message} />
        ) : ds.sellers.length === 0 ? (
          <EmptyState
            title="Sem vendedores cadastrados"
            description="Cadastre vendedores antes de definir metas."
            actionLabel="Cadastrar vendedores"
            actionTo="/admin/vendedores"
            icon={Target}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="section-title">Meta total do time</p>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                  {pts(totalPointsGoal)}
                </p>
                {totalPointsGoal === 0 && (
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link to="/admin/metas">
                      <Pencil className="h-3.5 w-3.5" /> Definir metas
                    </Link>
                  </Button>
                )}
              </Card>
              <Card>
                <p className="section-title">Realizado no mês</p>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                  {pts(totalPoints)}
                </p>
              </Card>
              <Card>
                <p className="section-title">% Atingimento</p>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                  {totalPointsGoal ? formatPercent(totalPoints / totalPointsGoal) : '—'}
                </p>
              </Card>
            </div>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Metas por vendedor</h3>
                  <p className="text-xs text-zinc-500">
                    Para editar, acesse <Link to="/admin/metas" className="text-brand-400 hover:underline">Administração → Metas Mensais</Link>
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/metas">
                    <Pencil className="h-3.5 w-3.5" /> Editar metas
                  </Link>
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                      <th className="text-right font-semibold px-4 py-3">Meta pontos</th>
                      <th className="text-right font-semibold px-4 py-3">Meta cursos</th>
                      <th className="text-right font-semibold px-4 py-3">Dias úteis</th>
                      <th className="text-right font-semibold px-4 py-3">Meta diária</th>
                      <th className="text-right font-semibold px-4 py-3">Realizado</th>
                      <th className="text-right font-semibold px-4 py-3">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {ds.sellers.map((seller) => {
                      const goal = getGoalForSeller(ds, year, month, seller.id);
                      const card = cards.find((c) => c.seller.id === seller.id);
                      const realized = card?.points ?? 0;
                      const pointsGoal = goal?.pointsGoal ?? 0;
                      const pct = pointsGoal ? realized / pointsGoal : 0;
                      const businessDays = goal?.businessDays ?? 21;
                      const dailyGoal = pointsGoal / businessDays;
                      return (
                        <tr key={seller.id} className="hover:bg-zinc-900/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 text-[10px]">
                                <AvatarFallback style={{ background: seller.avatarColor }}>
                                  {seller.fullName
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((p) => p[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-zinc-100">{seller.fullName}</span>
                            </div>
                          </td>
                          <td className="text-right tabular-nums text-zinc-100 font-semibold px-4 py-3">
                            {pointsGoal ? pts(pointsGoal) : '—'}
                          </td>
                          <td className="text-right tabular-nums text-zinc-300 px-4 py-3">
                            {goal?.coursesGoal ?? '—'}
                          </td>
                          <td className="text-right tabular-nums text-zinc-300 px-4 py-3">
                            {goal?.businessDays ?? '—'}
                          </td>
                          <td className="text-right tabular-nums text-zinc-300 px-4 py-3">
                            {pointsGoal ? pts(dailyGoal) : '—'}
                          </td>
                          <td className="text-right tabular-nums text-zinc-100 px-4 py-3">
                            {pts(realized)}
                          </td>
                          <td className="text-right px-4 py-3">
                            {pointsGoal ? (
                              <Badge
                                variant={pct >= 1 ? 'success' : pct >= 0.7 ? 'warning' : 'danger'}
                              >
                                {formatPercent(pct)}
                              </Badge>
                            ) : (
                              <span className="text-zinc-600 text-xs">sem meta</span>
                            )}
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
