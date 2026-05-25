import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import { getSellerCards } from '@/data/queries';
import { formatCompactCurrency, formatCurrency, formatPercent } from '@/lib/utils';
import { Gift, TrendingUp } from 'lucide-react';

interface Tier {
  threshold: number;
  bonusPct: number;
  label: string;
  color: string;
}

const DEFAULT_TIERS: Tier[] = [
  { threshold: 1.2, bonusPct: 0.05, label: 'Super Star', color: 'success' },
  { threshold: 1.0, bonusPct: 0.03, label: 'Bateu meta', color: 'default' },
  { threshold: 0.8, bonusPct: 0.015, label: 'Quase lá', color: 'warning' },
  { threshold: 0, bonusPct: 0, label: 'Abaixo', color: 'danger' },
];

export function Bonus() {
  const { year, month } = useFilters();
  const ds = useDashboardDatasets();
  const cards = useMemo(
    () => [...getSellerCards(ds, { year, month })].sort((a, b) => b.revenue - a.revenue),
    [ds, year, month],
  );
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);

  function getTier(pct: number): Tier {
    return tiers.find((t) => pct >= t.threshold) ?? tiers[tiers.length - 1];
  }

  const totalBonus = cards.reduce((acc, c) => {
    const pct = c.goal ? c.revenue / c.goal : 0;
    return acc + c.revenue * getTier(pct).bonusPct;
  }, 0);

  return (
    <>
      <Header title="Bônus Comercial" subtitle="Cálculo de bônus por atingimento de meta" />
      <div className="page">
        {ds.isLoading ? (
          <LoadingState />
        ) : ds.error ? (
          <ErrorState message={ds.error.message} />
        ) : cards.length === 0 ? (
          <EmptyState
            title="Sem dados pra calcular bônus"
            description="Cadastre vendedores, defina metas e registre vendas para visualizar o cálculo de bônus."
            actionLabel="Cadastrar vendedores"
            actionTo="/admin/vendedores"
            icon={Gift}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Gift className="h-4 w-4" />
                  </div>
                  <p className="section-title">Bônus total do time</p>
                </div>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                  {formatCurrency(totalBonus)}
                </p>
              </Card>
              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="section-title">Vendedores acima da meta</p>
                </div>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                  {cards.filter((c) => (c.goal ? c.revenue / c.goal : 0) >= 1).length} de {cards.length}
                </p>
              </Card>
              <Card>
                <p className="section-title">Configurar regras</p>
                <p className="text-sm text-zinc-400 mt-2">
                  Edite as faixas abaixo. Ajustes refletem em tempo real no cálculo.
                </p>
              </Card>
            </div>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-4">Faixas de bônus</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {tiers.map((tier, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <Badge variant={tier.color as 'success' | 'warning' | 'danger' | 'default'}>
                      {tier.label}
                    </Badge>
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500">
                          Atinge a partir de
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tier.threshold}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setTiers((t) =>
                              t.map((tt, idx) => (idx === i ? { ...tt, threshold: v } : tt)),
                            );
                          }}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500">
                          % de bônus
                        </label>
                        <Input
                          type="number"
                          step="0.005"
                          value={tier.bonusPct}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setTiers((t) =>
                              t.map((tt, idx) => (idx === i ? { ...tt, bonusPct: v } : tt)),
                            );
                          }}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-4">Bônus por vendedor</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                      <th className="text-right font-semibold px-4 py-3">Receita</th>
                      <th className="text-right font-semibold px-4 py-3">% Meta</th>
                      <th className="text-center font-semibold px-4 py-3">Faixa</th>
                      <th className="text-right font-semibold px-4 py-3">% Bônus</th>
                      <th className="text-right font-semibold px-4 py-3">Bônus R$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {cards.map((row) => {
                      const pct = row.goal ? row.revenue / row.goal : 0;
                      const tier = getTier(pct);
                      const bonus = row.revenue * tier.bonusPct;
                      return (
                        <tr key={row.seller.id} className="hover:bg-zinc-900/40">
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
                              <span className="text-zinc-100">{row.seller.fullName}</span>
                            </div>
                          </td>
                          <td className="text-right tabular-nums text-zinc-100">
                            {formatCompactCurrency(row.revenue)}
                          </td>
                          <td className="text-right tabular-nums text-zinc-300">
                            {formatPercent(pct)}
                          </td>
                          <td className="text-center">
                            <Badge
                              variant={tier.color as 'success' | 'warning' | 'danger' | 'default'}
                            >
                              {tier.label}
                            </Badge>
                          </td>
                          <td className="text-right tabular-nums text-zinc-300">
                            {formatPercent(tier.bonusPct, 1)}
                          </td>
                          <td className="text-right tabular-nums text-emerald-400 font-semibold">
                            {formatCurrency(bonus)}
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
