import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Users2, Search, ChevronLeft, ChevronRight, Mail, Phone, IdCard } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/empty-state';
import { useGuruContacts, useGuruTransactions } from '@/hooks/useGuru';
import { daysAgo, today } from '@/lib/guru';
import {
  normalizeStatus,
  txStatus,
  STATUS_LABELS,
  STATUS_VARIANT,
  txDate,
  txProductName,
  txValue,
  type GuruContact,
} from '@/types/guru';
import { formatCurrency } from '@/lib/utils';

export function FinanceiroContatos() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<GuruContact | null>(null);

  const debounced = useDebouncedValue(search, 400);

  const { data, isLoading, error } = useGuruContacts({
    per_page: 50,
    page,
    search: debounced || undefined,
  });

  const contacts = data?.data ?? [];
  const meta = data?.meta ?? {};

  return (
    <>
      <Header title="Contatos" subtitle="Base de contatos da Guru com histórico de compras" />
      <div className="page">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, email, CPF ou telefone..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={(error as Error).message} />
        ) : contacts.length === 0 ? (
          <EmptyState
            title="Nenhum contato"
            description={search ? `Sem resultados para "${search}".` : 'Sem contatos.'}
            icon={Users2}
          />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-zinc-900">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-900/40 transition-colors text-left"
                >
                  <Avatar className="h-9 w-9 text-xs shrink-0">
                    <AvatarFallback className="bg-zinc-800 text-zinc-200">
                      {(c.name ?? '?')
                        .split(' ')
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">
                      {c.name ?? 'Sem nome'}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {c.email ?? ''}
                      {c.phone_number ? ` · ${c.phone_number}` : ''}
                    </div>
                  </div>
                  {c.doc && (
                    <Badge variant="muted" className="text-[9px] shrink-0 hidden sm:inline-flex">
                      {c.doc}
                    </Badge>
                  )}
                </button>
              ))}
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

      <ContactDetail contact={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function ContactDetail({
  contact,
  onClose,
}: {
  contact: GuruContact | null;
  onClose: () => void;
}) {
  // Quando abrir contato, puxa as transações dele (últimos 365 dias)
  const { data: txData, isLoading } = useGuruTransactions(
    contact
      ? {
          contact_id: contact.id,
          ordered_at_ini: daysAgo(365),
          ordered_at_end: today(),
          per_page: 50,
        }
      : undefined,
  );

  const txs = txData?.data ?? [];
  const stats = useMemo(() => {
    const paid = txs.filter((t) => normalizeStatus(txStatus(t)) === 'paid');
    const total = paid.reduce((a, t) => a + txValue(t), 0);
    return { count: paid.length, total };
  }, [txs]);

  return (
    <Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {contact && (
          <>
            <DialogHeader>
              <DialogTitle>{contact.name ?? 'Contato'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-zinc-300 truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-zinc-300">{contact.phone_number}</span>
                  </div>
                )}
                {contact.doc && (
                  <div className="flex items-center gap-2">
                    <IdCard className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-zinc-300 tabular-nums">{contact.doc}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Compras pagas
                  </p>
                  <p className="text-2xl font-bold text-zinc-100 tabular-nums">{stats.count}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Total gasto
                  </p>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(stats.total)}
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Histórico de compras (1 ano)
                </h4>
                {isLoading ? (
                  <p className="text-xs text-zinc-500">Carregando...</p>
                ) : txs.length === 0 ? (
                  <p className="text-xs text-zinc-500">Nenhuma transação no período.</p>
                ) : (
                  <div className="space-y-1.5">
                    {txs.map((t) => {
                      const ns = normalizeStatus(txStatus(t));
                      const d = txDate(t)?.slice(0, 10);
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg bg-zinc-900/50 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-zinc-200 truncate">{txProductName(t)}</div>
                            <div className="text-zinc-500 tabular-nums">
                              {d ? new Date(d).toLocaleDateString('pt-BR') : '—'}
                            </div>
                          </div>
                          <Badge variant={STATUS_VARIANT[ns]} className="text-[9px]">
                            {STATUS_LABELS[ns]}
                          </Badge>
                          <div className="text-zinc-100 font-semibold tabular-nums w-24 text-right">
                            {formatCurrency(txValue(t))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
