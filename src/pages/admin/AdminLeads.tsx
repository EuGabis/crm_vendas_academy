import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
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
  useLeads,
  useUpsertLead,
  useDeleteLead,
  useSellers,
} from '@/hooks/useSupabaseData';
import { STAGE_LABELS, type Lead, type LeadStage } from '@/types/domain';

const STAGES: LeadStage[] = [
  'LEAD',
  'MQL',
  'SQL',
  'AGENDADA',
  'REALIZADA',
  'NO_SHOW',
  'VENDA',
  'PERDA',
];

const STAGE_VARIANT: Record<LeadStage, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  LEAD: 'info',
  MQL: 'default',
  SQL: 'default',
  AGENDADA: 'warning',
  REALIZADA: 'success',
  NO_SHOW: 'danger',
  VENDA: 'success',
  PERDA: 'muted',
};

const SOURCES = ['Meta Ads', 'Google Ads', 'Orgânico', 'Indicação', 'YouTube', 'Webinar', 'Manual'];

interface DraftLead {
  id?: string;
  sellerId: string;
  source: string;
  stage: LeadStage;
  createdAt: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminLeads() {
  const { data: leads = [], isLoading, error } = useLeads();
  const { data: sellers = [] } = useSellers();
  const upsert = useUpsertLead();
  const del = useDeleteLead();

  const sellersById = useMemo(
    () => Object.fromEntries(sellers.map((s) => [s.id, s])),
    [sellers],
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftLead>({
    sellerId: '',
    source: 'Manual',
    stage: 'LEAD',
    createdAt: todayISO(),
  });

  function openCreate() {
    setDraft({
      sellerId: sellers[0]?.id ?? '',
      source: 'Manual',
      stage: 'LEAD',
      createdAt: todayISO(),
    });
    setOpen(true);
  }

  function openEdit(l: Lead) {
    setDraft({
      id: l.id,
      sellerId: l.sellerId,
      source: l.source,
      stage: l.stage,
      createdAt: l.createdAt.slice(0, 10),
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.sellerId) {
      toast.error('Selecione um vendedor');
      return;
    }
    try {
      await upsert.mutateAsync({
        id: draft.id,
        sellerId: draft.sellerId,
        source: draft.source,
        stage: draft.stage,
        createdAt: new Date(draft.createdAt).toISOString(),
        stageChangedAt: new Date().toISOString(),
      });
      toast.success(draft.id ? 'Lead atualizado' : 'Lead criado');
      setOpen(false);
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este lead?')) return;
    try {
      await del.mutateAsync(id);
      toast.success('Lead removido');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <>
      <Header title="Leads" subtitle="Registre e gerencie os leads que entram no funil" />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{leads.length} lead(s)</p>
          <Button onClick={openCreate} disabled={sellers.length === 0}>
            <Plus className="h-4 w-4" /> Novo lead
          </Button>
        </div>

        {sellers.length === 0 && (
          <Card className="!bg-amber-500/5 border-amber-500/20">
            <p className="text-sm text-amber-300">
              Cadastre vendedores antes de registrar leads.
            </p>
          </Card>
        )}

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : leads.length === 0 ? (
          <EmptyState
            title="Sem leads registrados"
            description="Registre leads manualmente ou conecte uma integração com Meta Ads/Google Ads na próxima sprint."
            icon={ShoppingBag}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Data</th>
                    <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                    <th className="text-left font-semibold px-4 py-3">Origem</th>
                    <th className="text-center font-semibold px-4 py-3">Etapa</th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {leads.slice(0, 100).map((l) => {
                    const seller = sellersById[l.sellerId];
                    return (
                      <tr key={l.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 text-zinc-400 tabular-nums">
                          {new Date(l.createdAt).toLocaleDateString('pt-BR')}
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
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{l.source}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STAGE_VARIANT[l.stage]}>{STAGE_LABELS[l.stage]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(l)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(l.id)}
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
            {leads.length > 100 && (
              <p className="text-xs text-zinc-500 mt-3 text-center">
                Exibindo os 100 leads mais recentes de {leads.length} total.
              </p>
            )}
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Editar lead' : 'Novo lead'}</DialogTitle>
            <DialogDescription>
              Mova o lead pela etapa do funil para atualizar as métricas.
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
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Origem</label>
                <Select
                  value={draft.source}
                  onValueChange={(v) => setDraft((d) => ({ ...d, source: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Etapa atual
                </label>
                <Select
                  value={draft.stage}
                  onValueChange={(v) => setDraft((d) => ({ ...d, stage: v as LeadStage }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Data de entrada
                </label>
                <Input
                  type="date"
                  value={draft.createdAt}
                  onChange={(e) => setDraft((d) => ({ ...d, createdAt: e.target.value }))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar' : 'Criar lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
