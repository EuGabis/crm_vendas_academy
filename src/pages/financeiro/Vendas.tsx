import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Filter, Receipt } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/empty-state';
import { useGuruTransactions } from '@/hooks/useGuru';
import { daysAgo, today } from '@/lib/guru';
import {
  normalizeStatus,
  txStatus,
  STATUS_LABELS,
  STATUS_VARIANT,
  txDate,
  txProductName,
  txValue,
  txPaymentLabel,
  type NormalizedStatus,
} from '@/types/guru';
import { formatCurrency } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { label: 'Hoje', days: 0 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

export function FinanceiroVendas() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(30);
  const [statusFilter, setStatusFilter] = useState<NormalizedStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useGuruTransactions({
    ordered_at_ini: daysAgo(period),
    ordered_at_end: today(),
    per_page: 50,
    page,
  });

  const all = data?.data ?? [];
  const meta = data?.meta ?? {};

  const filtered = useMemo(() => {
    let list = all;
    if (statusFilter !== 'all') {
      list = list.filter((t) => normalizeStatus(txStatus(t)) === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.contact?.name?.toLowerCase().includes(q) ||
          t.contact?.email?.toLowerCase().includes(q) ||
          t.contact?.doc?.includes(q.replace(/\D/g, '')) ||
          txProductName(t).toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [all, statusFilter, search]);

  return (
    <>
      <Header title="Vendas" subtitle="Histórico de transações da Guru" />
      <div className="page">
        <Card className="!p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Buscar por nome, email, CPF, produto, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <Select
                value={String(period)}
                onValueChange={(v) => {
                  setPeriod(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.days} value={String(o.days)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as NormalizedStatus | 'all')}
              >
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="paid">Pagas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="refused">Recusadas</SelectItem>
                  <SelectItem value="refunded">Estornadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={(error as Error).message} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma venda no período"
            description="Tente ajustar o período ou os filtros."
            icon={Receipt}
          />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Data</th>
                    <th className="text-left font-semibold px-4 py-3">Cliente</th>
                    <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">
                      Produto
                    </th>
                    <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">
                      Pagamento
                    </th>
                    <th className="text-center font-semibold px-4 py-3">Status</th>
                    <th className="text-right font-semibold px-4 py-3">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filtered.map((t) => {
                    const ns = normalizeStatus(txStatus(t));
                    const d = txDate(t)?.slice(0, 10);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/financeiro/vendas/${t.id}`)}
                        className="hover:bg-zinc-900/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-zinc-400 tabular-nums text-xs">
                          {d ? new Date(d).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-100">{t.contact?.name ?? '—'}</div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                            {t.contact?.email ?? ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 hidden md:table-cell truncate max-w-[220px]">
                          {txProductName(t)}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell">
                          {txPaymentLabel(t)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STATUS_VARIANT[ns]}>{STATUS_LABELS[ns]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-400">
                          {formatCurrency(txValue(t))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {meta.last_page && meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Página {meta.current_page ?? page} de {meta.last_page} ·{' '}
              {meta.total ?? '—'} total
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={page >= (meta.last_page ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
