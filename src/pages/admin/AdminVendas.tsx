import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSales,
  useUpsertSale,
  useDeleteSale,
  useSellers,
  useCourses,
} from '@/hooks/useSupabaseData';
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type Sale } from '@/types/domain';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_METHODS: PaymentMethod[] = [
  'AVISTA',
  'CARTAO_PARCELADO',
  'CARTAO_RECORRENCIA',
  'BOLETO',
  'PIX',
];

interface DraftSale {
  id?: string;
  sellerId: string;
  courseId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  installments: number;
  soldAt: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminVendas() {
  const { data: sales = [], isLoading, error } = useSales();
  const { data: sellers = [] } = useSellers();
  const { data: courses = [] } = useCourses();
  const upsert = useUpsertSale();
  const del = useDeleteSale();

  const sellersById = useMemo(
    () => Object.fromEntries(sellers.map((s) => [s.id, s])),
    [sellers],
  );
  const coursesById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c])),
    [courses],
  );

  const [open, setOpen] = useState(false);
  const defaultDraft: DraftSale = {
    sellerId: sellers[0]?.id ?? '',
    courseId: courses[0]?.id ?? '',
    amount: courses[0]?.price ?? 0,
    paymentMethod: 'AVISTA',
    installments: 1,
    soldAt: todayISO(),
  };
  const [draft, setDraft] = useState<DraftSale>(defaultDraft);

  function openCreate() {
    setDraft({ ...defaultDraft });
    setOpen(true);
  }

  function openEdit(s: Sale) {
    setDraft({
      id: s.id,
      sellerId: s.sellerId,
      courseId: s.courseId,
      amount: s.amount,
      paymentMethod: s.paymentMethod,
      installments: s.installments,
      soldAt: s.soldAt.slice(0, 10),
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.sellerId || !draft.courseId) {
      toast.error('Selecione vendedor e curso');
      return;
    }
    try {
      await upsert.mutateAsync({
        id: draft.id,
        sellerId: draft.sellerId,
        courseId: draft.courseId,
        amount: Number(draft.amount),
        paymentMethod: draft.paymentMethod,
        installments: Number(draft.installments),
        soldAt: new Date(draft.soldAt).toISOString(),
      });
      toast.success(draft.id ? 'Venda atualizada' : 'Venda registrada');
      setOpen(false);
    } catch (err) {
      toast.error('Falha ao salvar: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta venda?')) return;
    try {
      await del.mutateAsync(id);
      toast.success('Venda removida');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  const canRegister = sellers.length > 0 && courses.length > 0;

  return (
    <>
      <Header title="Registrar Vendas" subtitle="Histórico de vendas e cadastro manual" />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{sales.length} venda(s) registrada(s)</p>
          <Button onClick={openCreate} disabled={!canRegister}>
            <Plus className="h-4 w-4" /> Nova venda
          </Button>
        </div>

        {!canRegister && (
          <Card className="!bg-amber-500/5 border-amber-500/20">
            <p className="text-sm text-amber-300">
              Antes de registrar vendas, cadastre pelo menos 1 vendedor e 1 curso.
            </p>
          </Card>
        )}

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : sales.length === 0 ? (
          <EmptyState
            title="Sem vendas registradas"
            description="Use 'Nova venda' acima pra começar a registrar."
            icon={Receipt}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Data</th>
                    <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                    <th className="text-left font-semibold px-4 py-3">Curso</th>
                    <th className="text-left font-semibold px-4 py-3">Pagamento</th>
                    <th className="text-right font-semibold px-4 py-3">Valor</th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {sales.slice(0, 100).map((s) => {
                    const seller = sellersById[s.sellerId];
                    const course = coursesById[s.courseId];
                    return (
                      <tr key={s.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 text-zinc-400 tabular-nums">
                          {new Date(s.soldAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          {seller ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 text-[10px]">
                                <AvatarFallback style={{ background: seller.avatarColor }}>
                                  {seller.fullName
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((p) => p[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-zinc-100">{seller.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs">vendedor removido</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {course?.name ?? 'curso removido'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="muted">
                            {PAYMENT_METHOD_LABELS[s.paymentMethod]}
                            {s.installments > 1 ? ` ${s.installments}x` : ''}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-400 font-semibold">
                          {formatCurrency(s.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(s.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sales.length > 100 && (
              <p className="text-xs text-zinc-500 mt-3 text-center">
                Exibindo as 100 vendas mais recentes de {sales.length} total.
              </p>
            )}
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Editar venda' : 'Nova venda'}</DialogTitle>
            <DialogDescription>
              Registre uma venda manualmente. Os dashboards atualizam imediatamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Vendedor</label>
                <Select
                  value={draft.sellerId}
                  onValueChange={(v) => setDraft((d) => ({ ...d, sellerId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Curso</label>
                <Select
                  value={draft.courseId}
                  onValueChange={(v) => {
                    const course = coursesById[v];
                    setDraft((d) => ({ ...d, courseId: v, amount: course?.price ?? d.amount }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Valor (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.amount}
                  onChange={(e) => setDraft((d) => ({ ...d, amount: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Data da venda
                </label>
                <Input
                  type="date"
                  value={draft.soldAt}
                  onChange={(e) => setDraft((d) => ({ ...d, soldAt: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Forma de pagamento
                </label>
                <Select
                  value={draft.paymentMethod}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, paymentMethod: v as PaymentMethod }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Parcelas</label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={draft.installments}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, installments: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar alterações' : 'Registrar venda'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
