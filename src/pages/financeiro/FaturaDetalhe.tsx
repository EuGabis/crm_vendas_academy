import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/empty-state';
import { useGuruInvoice } from '@/hooks/useGuru';
import { formatCurrency } from '@/lib/utils';
import { fmtGuruDate } from '@/lib/guru';

function statusVariant(s?: string): 'success' | 'warning' | 'danger' | 'muted' {
  switch (s?.toLowerCase()) {
    case 'paid':
    case 'approved':
      return 'success';
    case 'pending':
    case 'waiting':
      return 'warning';
    case 'overdue':
    case 'cancelled':
    case 'canceled':
    case 'refused':
      return 'danger';
    default:
      return 'muted';
  }
}

export function FinanceiroFaturaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subId = params.get('sub') ?? undefined;
  const { data, isLoading, error } = useGuruInvoice(id, subId);

  const inv = data as Record<string, unknown> | undefined;
  const code = (inv?.id ?? inv?.code ?? id ?? '') as string;
  const cycle = inv?.cycle ?? inv?.cycle_number;
  const value = Number(inv?.value ?? inv?.amount ?? 0);
  const status = String(inv?.status ?? '—');
  const chargedAt = inv?.charged_at ?? inv?.paid_at ?? inv?.due_date ?? inv?.created_at;
  const dueDate = inv?.due_date;
  const paidAt = inv?.paid_at;
  const checkoutUrl = (inv?.checkout_url ?? inv?.payment_url ?? inv?.url) as string | undefined;
  const invoiceUrl = inv?.checkout_invoice_url as string | undefined;
  const method = (inv?.payment_method ?? inv?.method) as string | undefined;
  const type = inv?.type as string | undefined;

  return (
    <>
      <Header title="Fatura" subtitle={code} />
      <div className="page">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {isLoading ? (
          <LoadingState />
        ) : error || !inv ? (
          <ErrorState message={(error as Error)?.message ?? 'Fatura não encontrada'} />
        ) : (
          <>
            <Card>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Código
                  </p>
                  <h2 className="text-lg font-mono font-semibold text-white break-all">
                    {code}
                  </h2>
                  {cycle != null && (
                    <p className="text-xs text-zinc-500 mt-1">Ciclo {String(cycle)}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant(status)} className="mb-2">
                    {status}
                  </Badge>
                  <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(value)}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Dados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {cycle != null && <KV label="Ciclo" value={String(cycle)} />}
                {type && <KV label="Tipo" value={String(type)} />}
                {method && <KV label="Forma de pagamento" value={String(method)} />}
                <KV label="Valor" value={formatCurrency(value)} />
                <KV label="Status" value={status} />
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Datas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <KV
                  label="Cobrado em"
                  value={fmtGuruDate(chargedAt, { withTime: true })}
                />
                {dueDate != null && (
                  <KV label="Vencimento" value={fmtGuruDate(dueDate)} />
                )}
                {paidAt != null && (
                  <KV
                    label="Pago em"
                    value={fmtGuruDate(paidAt, { withTime: true })}
                  />
                )}
                {inv?.created_at != null && (
                  <KV
                    label="Criada em"
                    value={fmtGuruDate(inv.created_at, { withTime: true })}
                  />
                )}
              </div>
            </Card>

            {(checkoutUrl || invoiceUrl) && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Links</h3>
                <div className="space-y-2">
                  {checkoutUrl && (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-brand-400 hover:underline break-all"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      Pagamento: {checkoutUrl}
                    </a>
                  )}
                  {invoiceUrl && (
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-brand-400 hover:underline break-all"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      Fatura: {invoiceUrl}
                    </a>
                  )}
                </div>
              </Card>
            )}

            {/* Dump bruto pra inspecao (só campos relevantes que ainda não exibimos) */}
            <details className="rounded-lg bg-zinc-900/40 border border-zinc-800 p-3">
              <summary className="text-xs text-zinc-500 cursor-pointer">
                JSON bruto (debug)
              </summary>
              <pre className="text-[10px] text-zinc-400 mt-2 overflow-x-auto">
                {JSON.stringify(inv, null, 2)}
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
      <p className="text-zinc-200 break-all">{value}</p>
    </div>
  );
}
