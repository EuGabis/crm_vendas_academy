import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Receipt } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState, ErrorState } from '@/components/ui/empty-state';
import { useGuruTransaction } from '@/hooks/useGuru';
import {
  normalizeStatus,
  txStatus,
  txDate,
  txValue,
  txNetValue,
  txProductName,
  txPaymentLabel,
  STATUS_LABELS,
  STATUS_VARIANT,
} from '@/types/guru';
import { formatCurrency } from '@/lib/utils';

export function FinanceiroVendaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tx, isLoading, error } = useGuruTransaction(id);

  return (
    <>
      <Header title="Venda" subtitle={id ?? ''} />
      <div className="page">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {isLoading ? (
          <LoadingState />
        ) : error || !tx ? (
          <ErrorState message={(error as Error)?.message ?? 'Venda não encontrada'} />
        ) : (
          <>
            {/* Cabeçalho */}
            <Card>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Produto
                  </p>
                  <h2 className="text-lg font-semibold text-white">{txProductName(tx)}</h2>
                  <code className="text-[11px] text-zinc-500">{tx.id}</code>
                </div>
                <div className="text-right">
                  <Badge variant={STATUS_VARIANT[normalizeStatus(txStatus(tx))]} className="mb-2">
                    {STATUS_LABELS[normalizeStatus(txStatus(tx))]}
                  </Badge>
                  <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(txValue(tx))}
                  </p>
                  {txNetValue(tx) !== txValue(tx) && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Líquido: {formatCurrency(txNetValue(tx))}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Tabs defaultValue="detalhe">
              <TabsList>
                <TabsTrigger value="detalhe">Detalhe</TabsTrigger>
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
                {(tx.affiliations?.length ?? 0) > 0 && (
                  <TabsTrigger value="afiliacoes">
                    Afiliações ({tx.affiliations?.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="detalhe" className="mt-4 space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-white mb-3">Pagamento</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <KV label="Forma" value={txPaymentLabel(tx)} />
                    {tx.installments != null && (
                      <KV label="Parcelas" value={`${tx.installments}x`} />
                    )}
                    <KV label="Valor bruto" value={formatCurrency(txValue(tx))} />
                    <KV label="Valor líquido" value={formatCurrency(txNetValue(tx))} />
                  </div>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-white mb-3">Datas</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {txDate(tx) && (
                      <KV
                        label="Confirmada em"
                        value={new Date(txDate(tx)!).toLocaleString('pt-BR')}
                      />
                    )}
                    {tx.ordered_at && (
                      <KV
                        label="Ordenada em"
                        value={new Date(tx.ordered_at).toLocaleString('pt-BR')}
                      />
                    )}
                    {tx.created_at && (
                      <KV
                        label="Criada em"
                        value={new Date(tx.created_at).toLocaleString('pt-BR')}
                      />
                    )}
                    {tx.cancelled_at && (
                      <KV
                        label="Cancelada em"
                        value={new Date(tx.cancelled_at).toLocaleString('pt-BR')}
                      />
                    )}
                  </div>
                </Card>

                {(tx.checkout_url || tx.checkout_invoice_url) && (
                  <Card>
                    <h3 className="text-sm font-semibold text-white mb-3">Links</h3>
                    <div className="space-y-2">
                      {tx.checkout_url && (
                        <a
                          href={tx.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-brand-400 hover:underline break-all"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          Checkout: {tx.checkout_url}
                        </a>
                      )}
                      {tx.checkout_invoice_url && (
                        <a
                          href={tx.checkout_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-brand-400 hover:underline break-all"
                        >
                          <Receipt className="h-3 w-3 shrink-0" />
                          Fatura: {tx.checkout_invoice_url}
                        </a>
                      )}
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="cliente" className="mt-4">
                <Card>
                  {tx.contact ? (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-white">{tx.contact.name ?? '—'}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <KV label="Email" value={tx.contact.email ?? '—'} />
                        <KV label="Telefone" value={tx.contact.phone_number ?? '—'} />
                        <KV label="Documento" value={tx.contact.doc ?? '—'} />
                        {tx.contact.company_name && (
                          <KV label="Empresa" value={tx.contact.company_name} />
                        )}
                      </div>
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <Link to="/financeiro/contatos">Ver contato completo</Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Sem dados de cliente.</p>
                  )}
                </Card>
              </TabsContent>

              {(tx.affiliations?.length ?? 0) > 0 && (
                <TabsContent value="afiliacoes" className="mt-4">
                  <Card className="!p-0 overflow-hidden">
                    <div className="divide-y divide-zinc-900">
                      {tx.affiliations!.map((a) => (
                        <div key={a.id} className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-100">{a.name ?? '—'}</div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {a.contact_email ?? ''}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-emerald-400 tabular-nums">
                              {formatCurrency(a.value ?? 0)}
                            </div>
                            {a.net_value != null && (
                              <div className="text-[10px] text-zinc-500">
                                Líq: {formatCurrency(a.net_value)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              )}
            </Tabs>

            {/* JSON bruto pra debug - copia daqui pra eu mapear campos */}
            <details className="rounded-lg bg-zinc-900/40 border border-zinc-800 p-3 mt-4">
              <summary className="text-xs text-zinc-500 cursor-pointer">
                JSON bruto da Guru (debug)
              </summary>
              <pre className="text-[10px] text-zinc-400 mt-2 overflow-x-auto max-h-96">
                {JSON.stringify(tx, null, 2)}
              </pre>
            </details>
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
