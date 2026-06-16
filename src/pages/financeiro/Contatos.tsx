import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Users2, Search, ChevronLeft, ChevronRight, Mail, Phone, IdCard, ChevronRight as Chev } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/empty-state';
import { useGuruContacts, useGuruTransactions, useGuruSubscriptions } from '@/hooks/useGuru';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const navigate = useNavigate();
  const { data: txData, isLoading: loadingTxs } = useGuruTransactions(
    contact
      ? {
          contact_id: contact.id,
          ordered_at_ini: daysAgo(180),
          ordered_at_end: today(),
          per_page: 50,
        }
      : undefined,
  );
  const { data: subData, isLoading: loadingSubs } = useGuruSubscriptions(
    contact ? { contact_id: contact.id, per_page: 50 } : undefined,
  );

  const txs = txData?.data ?? [];
  const subs = subData?.data ?? [];
  const stats = useMemo(() => {
    const paid = txs.filter((t) => normalizeStatus(txStatus(t)) === 'paid');
    const total = paid.reduce((a, t) => a + txValue(t), 0);
    return { count: paid.length, total };
  }, [txs]);

  return (
    <Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        {contact && (
          <>
            <DialogHeader>
              <DialogTitle>{contact.name ?? 'Contato'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Stats topo */}
              <div className="grid grid-cols-3 gap-3 pb-3 border-b border-zinc-800">
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
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Assinaturas
                  </p>
                  <p className="text-2xl font-bold text-blue-400 tabular-nums">{subs.length}</p>
                </div>
              </div>

              <Tabs defaultValue="detalhe">
                <TabsList className="w-full">
                  <TabsTrigger value="detalhe" className="flex-1">
                    Detalhe
                  </TabsTrigger>
                  <TabsTrigger value="vendas" className="flex-1">
                    Vendas ({txs.length})
                  </TabsTrigger>
                  <TabsTrigger value="assinaturas" className="flex-1">
                    Assinaturas ({subs.length})
                  </TabsTrigger>
                </TabsList>

                {/* ABA DETALHE */}
                <TabsContent value="detalhe" className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Dados pessoais
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <KV label="Nome" value={contact.name ?? '—'} />
                    <KV label="Email" value={contact.email ?? '—'} icon={<Mail className="h-3 w-3" />} />
                    <KV label="Documento" value={contact.doc ?? '—'} icon={<IdCard className="h-3 w-3" />} />
                    <KV
                      label="Telefone"
                      value={contact.phone_number ?? '—'}
                      icon={<Phone className="h-3 w-3" />}
                    />
                    {contact.company_name && (
                      <KV label="Empresa" value={contact.company_name} />
                    )}
                  </div>

                  {(contact.city || contact.state || contact.country) && (
                    <>
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pt-3 border-t border-zinc-800">
                        Endereço
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {contact.city && <KV label="Cidade" value={contact.city} />}
                        {contact.state && <KV label="Estado" value={contact.state} />}
                        {contact.country && <KV label="País" value={contact.country} />}
                      </div>
                    </>
                  )}

                  <div className="pt-3 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-600">
                      ID Guru: <code>{contact.id.slice(0, 14)}...</code>
                    </p>
                    {contact.created_at && (
                      <p className="text-[10px] text-zinc-600 mt-1">
                        Cadastrado em {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* ABA VENDAS */}
                <TabsContent value="vendas" className="mt-4">
                  {loadingTxs ? (
                    <p className="text-xs text-zinc-500">Carregando vendas...</p>
                  ) : txs.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-6">
                      Nenhuma transação nos últimos 180 dias.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {txs.map((t) => {
                        const ns = normalizeStatus(txStatus(t));
                        const d = txDate(t);
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              onClose();
                              navigate(`/financeiro/vendas/${t.id}`);
                            }}
                            className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-zinc-100 font-medium truncate text-xs">
                                {txProductName(t)}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-zinc-500 tabular-nums text-[11px]">
                                  {d ? new Date(d).toLocaleDateString('pt-BR') : '—'}
                                </span>
                                <Badge variant={STATUS_VARIANT[ns]} className="text-[9px]">
                                  {STATUS_LABELS[ns]}
                                </Badge>
                                <span className="text-[10px] text-zinc-600">
                                  {txPaymentLabel(t)}
                                </span>
                              </div>
                            </div>
                            <div className="text-emerald-400 font-bold tabular-nums shrink-0 text-sm">
                              {formatCurrency(txValue(t))}
                            </div>
                            <Chev className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ABA ASSINATURAS */}
                <TabsContent value="assinaturas" className="mt-4">
                  {loadingSubs ? (
                    <p className="text-xs text-zinc-500">Carregando assinaturas...</p>
                  ) : subs.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-6">
                      Sem assinaturas neste contato.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {subs.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onClose();
                            navigate(`/financeiro/assinaturas/${s.id}`);
                          }}
                          className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-zinc-100 font-medium truncate text-xs">
                              {s.product?.name ?? '—'}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <Badge
                                variant={
                                  s.status === 'active' || s.status === 'paid'
                                    ? 'success'
                                    : 'muted'
                                }
                                className="text-[9px]"
                              >
                                {s.status ?? '—'}
                              </Badge>
                              {s.cycle && (
                                <span className="text-[10px] text-zinc-600">{s.cycle}</span>
                              )}
                              {s.charges_made != null && (
                                <span className="text-[10px] text-zinc-600">
                                  {s.charges_made} cobr.
                                </span>
                              )}
                            </div>
                          </div>
                          {s.charge_value && (
                            <div className="text-emerald-400 font-bold tabular-nums shrink-0 text-sm">
                              {formatCurrency(s.charge_value)}
                            </div>
                          )}
                          <Chev className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KV({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={mono ? 'text-zinc-300 font-mono text-[11px]' : 'text-zinc-200'}>{value}</p>
    </div>
  );
}
