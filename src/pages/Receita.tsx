import { useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import {
  getCoursesSold,
  getMarketingMetrics,
  getProjection,
  getRevenueSum,
} from '@/data/queries';
import { formatCompactCurrency, formatCurrency, formatInt } from '@/lib/utils';
import { CircleDollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react';

export function Receita() {
  const { year, month, sellerId } = useFilters();
  const ds = useDashboardDatasets();
  const filter = { year, month, sellerId };

  const data = useMemo(() => {
    return {
      revenue: getRevenueSum(ds, filter),
      courses: getCoursesSold(ds, filter),
      mk: getMarketingMetrics(ds, filter),
      projection: getProjection(ds, filter),
    };
  }, [ds, filter]);

  const hasData = ds.sales.length > 0;

  return (
    <>
      <Header title="Receita" subtitle="Visão consolidada do mês" />
      <div className="page">
        {ds.isLoading ? (
          <LoadingState />
        ) : ds.error ? (
          <ErrorState message={ds.error.message} />
        ) : !hasData ? (
          <EmptyState
            title="Nenhuma venda registrada"
            description="Registre vendas no painel administrativo para acompanhar a receita por aqui."
            actionLabel="Registrar venda"
            actionTo="/admin/vendas"
            icon={CircleDollarSign}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Receita do mês"
                value={formatCompactCurrency(data.revenue)}
                icon={<CircleDollarSign className="h-4 w-4" />}
                accent="brand"
              />
              <KpiCard
                label="Ticket médio"
                value={data.mk.ticketMedio ? formatCurrency(data.mk.ticketMedio) : '—'}
                icon={<Receipt className="h-4 w-4" />}
                accent="info"
              />
              <KpiCard
                label="Cursos vendidos"
                value={formatInt(data.courses)}
                icon={<Wallet className="h-4 w-4" />}
                accent="success"
              />
              <KpiCard
                label="Projeção fim do mês"
                value={formatCompactCurrency(data.projection)}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="warning"
              />
            </div>
            <Card>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Atalhos rápidos</h3>
              <p className="text-sm text-zinc-500">
                Acesse <span className="text-zinc-300">Vendas → Dashboard Times</span> para a visão
                operacional detalhada por vendedor.
              </p>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
