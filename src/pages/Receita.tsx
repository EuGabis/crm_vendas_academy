import { useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card } from '@/components/ui/card';
import { useFilters } from '@/store/filters';
import {
  getRevenueSum,
  getMarketingMetrics,
  getCoursesSold,
  getProjection,
} from '@/data/queries';
import { formatCompactCurrency, formatCurrency, formatInt } from '@/lib/utils';
import { CircleDollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react';

export function Receita() {
  const { year, month, sellerId } = useFilters();
  const filter = { year, month, sellerId };

  const metrics = useMemo(() => {
    const revenue = getRevenueSum(filter);
    const courses = getCoursesSold(filter);
    const mk = getMarketingMetrics(filter);
    const projection = getProjection(filter);
    return { revenue, courses, mk, projection };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, sellerId]);

  return (
    <>
      <Header title="Receita" subtitle="Visão consolidada do mês" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Receita do mês"
            value={formatCompactCurrency(metrics.revenue)}
            icon={<CircleDollarSign className="h-4 w-4" />}
            accent="brand"
          />
          <KpiCard
            label="Ticket médio"
            value={formatCurrency(metrics.mk.ticketMedio)}
            icon={<Receipt className="h-4 w-4" />}
            accent="info"
          />
          <KpiCard
            label="Cursos vendidos"
            value={formatInt(metrics.courses)}
            icon={<Wallet className="h-4 w-4" />}
            accent="success"
          />
          <KpiCard
            label="Projeção fim do mês"
            value={formatCompactCurrency(metrics.projection)}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="warning"
          />
        </div>
        <Card>
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Atalhos rápidos</h3>
          <p className="text-sm text-zinc-500">
            Acesse <span className="text-zinc-300">Vendas → Dashboard Times</span> para a visão
            operacional do dia.
          </p>
        </Card>
      </div>
    </>
  );
}
