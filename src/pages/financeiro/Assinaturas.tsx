import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/empty-state';
import { useGuruSubscriptions } from '@/hooks/useGuru';
import { formatCurrency } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  paused: 'Pausada',
  pending: 'Pendente',
};

function statusVariant(s?: string): 'success' | 'warning' | 'danger' | 'muted' {
  switch (s?.toLowerCase()) {
    case 'active':
      return 'success';
    case 'pending':
    case 'paused':
      return 'warning';
    case 'cancelled':
    case 'expired':
      return 'danger';
    default:
      return 'muted';
  }
}

export function FinanceiroAssinaturas() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useGuruSubscriptions({
    per_page: 50,
    page,
    status: status === 'all' ? undefined : status,
  });

  const subs = data?.data ?? [];
  const meta = data?.meta ?? {};

  return (
    <>
      <Header title="Assinaturas" subtitle="Recorrências ativas e canceladas" />
      <div className="page">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-zinc-500">
            {subs.length} assinatura(s) {meta.total ? `de ${meta.total}` : ''}
          </p>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={(error as Error).message} />
        ) : subs.length === 0 ? (
          <EmptyState
            title="Sem assinaturas"
            description="Nenhuma assinatura encontrada com esse filtro."
            icon={Repeat}
          />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Cliente</th>
                    <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">
                      Produto
                    </th>
                    <th className="text-center font-semibold px-4 py-3">Status</th>
                    <th className="text-center font-semibold px-4 py-3 hidden lg:table-cell">
                      Cobranças
                    </th>
                    <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">
                      Próxima
                    </th>
                    <th className="text-right font-semibold px-4 py-3">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {subs.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/financeiro/assinaturas/${s.id}`)}
                      className="hover:bg-zinc-900/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-zinc-100">{s.contact?.name ?? '—'}</div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                          {s.contact?.email ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 hidden md:table-cell truncate max-w-[220px]">
                        {s.product?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusVariant(s.status)}>
                          {STATUS_LABELS[s.status?.toLowerCase() ?? ''] ?? s.status ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-300 hidden lg:table-cell">
                        {s.charges_made ?? '—'}
                        {s.charges_count ? ` / ${s.charges_count}` : ''}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell tabular-nums">
                        {s.next_charge_at
                          ? new Date(s.next_charge_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-400">
                        {formatCurrency(s.charge_value ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {meta.last_page && meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Página {meta.current_page ?? page} de {meta.last_page}
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
