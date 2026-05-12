import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Megaphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  useTrafficSpend,
  useUpsertTrafficSpend,
  useDeleteTrafficSpend,
} from '@/hooks/useSupabaseData';
import type { TrafficSpend } from '@/types/domain';
import { formatCurrency } from '@/lib/utils';

const CHANNELS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'YouTube Ads', 'Outros'];

interface DraftSpend {
  id?: string;
  spendDate: string;
  channel: string;
  amount: number;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminTrafego() {
  const { data: spend = [], isLoading, error } = useTrafficSpend();
  const upsert = useUpsertTrafficSpend();
  const del = useDeleteTrafficSpend();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftSpend>({
    spendDate: todayISO(),
    channel: 'Meta Ads',
    amount: 0,
  });

  function openCreate() {
    setDraft({ spendDate: todayISO(), channel: 'Meta Ads', amount: 0 });
    setOpen(true);
  }

  function openEdit(t: TrafficSpend) {
    setDraft({
      id: t.id,
      spendDate: t.spendDate.slice(0, 10),
      channel: t.channel,
      amount: t.amount,
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        id: draft.id,
        spendDate: draft.spendDate,
        channel: draft.channel,
        amount: Number(draft.amount),
      });
      toast.success(draft.id ? 'Gasto atualizado' : 'Gasto registrado');
      setOpen(false);
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este registro de tráfego?')) return;
    try {
      await del.mutateAsync(id);
      toast.success('Registro removido');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <>
      <Header
        title="Gastos de Tráfego"
        subtitle="Registre o investimento diário em mídia paga"
      />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{spend.length} registro(s)</p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo gasto
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : spend.length === 0 ? (
          <EmptyState
            title="Sem gastos registrados"
            description="Cadastre os gastos diários por canal (Meta Ads, Google Ads, etc.) para calcular CAC, CPL e ROI."
            icon={Megaphone}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Data</th>
                    <th className="text-left font-semibold px-4 py-3">Canal</th>
                    <th className="text-right font-semibold px-4 py-3">Valor</th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {spend.slice(0, 100).map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3 text-zinc-300 tabular-nums">
                        {new Date(t.spendDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default">{t.channel}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-100 font-semibold">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Editar gasto' : 'Novo gasto de tráfego'}</DialogTitle>
            <DialogDescription>
              Lance o valor investido em mídia paga em um dia específico.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Data</label>
                <Input
                  type="date"
                  value={draft.spendDate}
                  onChange={(e) => setDraft((d) => ({ ...d, spendDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Canal</label>
                <Select
                  value={draft.channel}
                  onValueChange={(v) => setDraft((d) => ({ ...d, channel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: Number(e.target.value) }))}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
