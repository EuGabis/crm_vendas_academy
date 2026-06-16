import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState, ErrorState } from '@/components/ui/empty-state';
import {
  useGuruSubscription,
  useGuruSubscriptionInvoices,
  useGuruTransactions,
} from '@/hooks/useGuru';
import { formatCurrency } from '@/lib/utils';
import { fmtGuruDate } from '@/lib/guru';
import {
  normalizeStatus,
  txStatus,
  txDate,
  txProductName,
  txValue,
  STATUS_LABELS,
  STATUS_VARIANT,
} from '@/types/guru';

function statusVariant(s?: string): 'success' | 'warning' | 'danger' | 'muted' {
  switch (s?.toLowerCase()) {
    case 'active':
    case 'paid':
      return 'success';
    case 'pending':
    case 'paused':
      return 'warning';
    case 'cancelled':
    case 'canceled':
    case 'expired':
      return 'danger';
    default:
      return 'muted';
  }
}

export function FinanceiroAssinaturaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sub, isLoading, error } = useGuruSubscription(id);

  const { data: invData, isLoading: loadingInv } = useGuruSubscriptionInvoices(id);
  const { data: txData, isLoading: loadingTx } = useGuruTransactions(
    id ? { subscription_id: id, per_page: 50 } : undefined,
  );

  const invoices = (invData?.data as Array<Record<string, unknown>>) ?? [];
  const txs = txData?.data ?? [];

  return (
    <>
      <Header title="Assinatura" subtitle={id ?? ''} />
      <div className="page">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {isLoading ? (
          <LoadingState />
        ) : error || !sub ? (
          <ErrorState message={(error as Error)?.message ?? 'Assinatura não encontrada'} />
        ) : (
          <>
            <Card>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Produto
                  </p>
                  <h2 className="text-lg font-semibold text-white">{sub.product?.name ?? '—'}</h2>
                  <code className="text-[11px] text-zinc-500">{sub.id}</code>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant(sub.status)} className="mb-2">
                    {sub.status ?? '—'}
                  </Badge>
                  {sub.charge_value && (
                    <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(sub.charge_value)}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Tabs defaultValue="detalhe">
              <TabsList>
                <TabsTrigger value="detalhe">Detalhe</TabsTrigger>
                <TabsTrigger value="assinante">Assinante</TabsTrigger>
                <TabsTrigger value="faturas">
                  Faturas{invoices.length ? ` (${invoices.length})` : ''}
                </TabsTrigger>
                <TabsTrigger value="vendas">
                  Vendas{txs.length ? ` (${txs.length})` : ''}
                </TabsTrigger>
              </TabsList>

              {/* DETALHE */}
              <TabsContent value="detalhe" className="mt-4 space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-white mb-3">Configuração</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <KV label="Forma de pagamento" value={sub.payment_method ?? '—'} />
                    <KV label="Ciclo" value={sub.cycle ?? '—'} />
                    {sub.charge_value && (
                      <KV label="Valor de cobrança" value={formatCurrency(sub.charge_value)} />
                    )}
                    {sub.net_value && (
                      <KV label="Valor líquido" value={formatCurrency(sub.net_value)} />
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-white mb-3">Cobranças</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {sub.charges_made != null && (
                      <KV label="Cobranças feitas" value={String(sub.charges_made)} />
                    )}
                    {sub.charges_count != null && (
                      <KV label="Total de cobranças" value={String(sub.charges_count)} />
                    )}
                    {sub.next_charge_at && (
                      <KV
                        label="Próxima cobrança"
                        value={new Date(sub.next_charge_at).toLocaleString('pt-BR')}
                      />
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-white mb-3">Datas</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {sub.started_at && (
                      <KV
                        label="Iniciada em"
                        value={new Date(sub.started_at).toLocaleString('pt-BR')}
                      />
                    )}
                    {sub.cancelled_at && (
                      <KV
                        label="Cancelada em"
                        value={new Date(sub.cancelled_at).toLocaleString('pt-BR')}
                      />
                    )}
                  </div>
                </Card>
              </TabsContent>

              {/* ASSINANTE */}
              <TabsContent value="assinante" className="mt-4">
                <Card>
                  {sub.contact ? (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-white">
                        {sub.contact.name ?? '—'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <KV label="Email" value={sub.contact.email ?? '—'} />
                        <KV label="Telefone" value={sub.contact.phone_number ?? '—'} />
                        <KV label="Documento" value={sub.contact.doc ?? '—'} />
                      </div>
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <Link to="/financeiro/contatos">Ver contato completo</Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Sem dados de assinante.</p>
                  )}
                </Card>
              </TabsContent>

              {/* FATURAS */}
              <TabsContent value="faturas" className="mt-4">
                <Card className="!p-0 overflow-hidden">
                  {loadingInv ? (
                    <div className="p-6">
                      <LoadingState />
                    </div>
                  ) : invoices.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8 px-4">
                      Sem faturas para esta assinatura.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="text-left font-semibold px-4 py-3">Código</th>
                            <th className="text-center font-semibold px-4 py-3">Ciclo</th>
                            <th className="text-left font-semibold px-4 py-3">Cobrado em</th>
                            <th className="text-center font-semibold px-4 py-3">Status</th>
                            <th className="text-right font-semibold px-4 py-3">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {invoices.map((inv) => {
                            const code = String(inv.id ?? inv.code ?? '');
                            const cycle = inv.cycle ?? inv.cycle_number ?? '—';
                            const charged =
                              inv.charged_at ??
                              inv.paid_at ??
                              inv.due_date ??
                              inv.created_at;
                            const status = String(inv.status ?? '—');
                            const value = Number(inv.value ?? inv.amount ?? 0);
                            return (
                              <tr
                                key={code}
                                onClick={() =>
                                  navigate(`/financeiro/faturas/${code}?sub=${id}`)
                                }
                                className="hover:bg-zinc-900/40 cursor-pointer transition-colors"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-zinc-300 truncate max-w-[280px]">
                                  {code}
                                </td>
                                <td className="px-4 py-3 text-center text-zinc-400">
                                  {String(cycle)}
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">
                                  {fmtGuruDate(charged)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant={statusVariant(status)}>{status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-400">
                                  {formatCurrency(value)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* VENDAS */}
              <TabsContent value="vendas" className="mt-4">
                <Card className="!p-0 overflow-hidden">
                  {loadingTx ? (
                    <div className="p-6">
                      <LoadingState />
                    </div>
                  ) : txs.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8 px-4">
                      Sem vendas registradas para esta assinatura.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="text-left font-semibold px-4 py-3">Código</th>
                            <th className="text-left font-semibold px-4 py-3">Produto</th>
                            <th className="text-left font-semibold px-4 py-3">Criada em</th>
                            <th className="text-center font-semibold px-4 py-3">Status</th>
                            <th className="text-right font-semibold px-4 py-3">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {txs.map((t) => {
                            const ns = normalizeStatus(txStatus(t));
                            const d = txDate(t);
                            return (
                              <tr
                                key={t.id}
                                onClick={() => navigate(`/financeiro/vendas/${t.id}`)}
                                className="hover:bg-zinc-900/40 cursor-pointer transition-colors"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-zinc-300 truncate max-w-[180px]">
                                  {t.id}
                                </td>
                                <td className="px-4 py-3 text-zinc-300 truncate max-w-[260px]">
                                  {txProductName(t)}
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">
                                  {d ? new Date(d).toLocaleString('pt-BR') : '—'}
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
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">
        {label}
      </p>
      <p className="text-zinc-200">{value}</p>
    </div>
  );
}
