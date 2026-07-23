import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Users2, Loader2 } from 'lucide-react';
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
  useSellers,
  useUpsertSeller,
  useDeleteSeller,
} from '@/hooks/useSupabaseData';
import type { Seller } from '@/types/domain';

const AVATAR_COLORS = [
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

const TEAMS = ['Closer Premium', 'Closer Plus', 'Closer Trainee', 'SDR'];

interface DraftSeller {
  id?: string;
  fullName: string;
  email: string;
  team: string;
  avatarColor: string;
  active: boolean;
}

const EMPTY_DRAFT: DraftSeller = {
  fullName: '',
  email: '',
  team: 'Closer Premium',
  avatarColor: AVATAR_COLORS[0],
  active: true,
};

export function AdminVendedores() {
  const { data: sellers = [], isLoading, error } = useSellers();
  const upsert = useUpsertSeller();
  const del = useDeleteSeller();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftSeller>(EMPTY_DRAFT);

  function openCreate() {
    setDraft({ ...EMPTY_DRAFT, avatarColor: AVATAR_COLORS[sellers.length % AVATAR_COLORS.length] });
    setOpen(true);
  }

  function openEdit(s: Seller) {
    setDraft({
      id: s.id,
      fullName: s.fullName,
      email: s.email,
      team: s.team,
      avatarColor: s.avatarColor,
      active: s.active,
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        id: draft.id,
        fullName: draft.fullName.trim(),
        email: draft.email.trim().toLowerCase(),
        team: draft.team,
        avatarColor: draft.avatarColor,
        active: draft.active,
      });
      toast.success(draft.id ? 'Vendedor atualizado' : 'Vendedor criado');
      setOpen(false);
    } catch (err) {
      toast.error('Falha ao salvar: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover vendedor "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('Vendedor removido');
    } catch (err) {
      toast.error('Falha ao remover: ' + (err as Error).message);
    }
  }

  return (
    <>
      <Header
        title="Vendedores"
        subtitle="Cadastre e gerencie os vendedores da equipe comercial"
      />
      <div className="page">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{sellers.length} vendedor(es) cadastrado(s)</p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo vendedor
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : sellers.length === 0 ? (
          <EmptyState
            title="Nenhum vendedor cadastrado"
            description="Clique em 'Novo vendedor' acima para começar."
            icon={Users2}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                    <th className="text-left font-semibold px-4 py-3">Email</th>
                    <th className="text-left font-semibold px-4 py-3">Time</th>
                    <th className="text-center font-semibold px-4 py-3">Status</th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {sellers.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 text-xs">
                            <AvatarFallback style={{ background: s.avatarColor }}>
                              {s.fullName
                                .split(' ')
                                .slice(0, 2)
                                .map((p) => p[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-zinc-100 font-medium">{s.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{s.email}</td>
                      <td className="px-4 py-3 text-zinc-300">{s.team}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={s.active ? 'success' : 'muted'}>
                          {s.active ? 'Ativo' : 'Inativo'}
                        </Badge>
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
                            onClick={() => handleDelete(s.id, s.fullName)}
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
            <DialogTitle>{draft.id ? 'Editar vendedor' : 'Novo vendedor'}</DialogTitle>
            <DialogDescription>
              Os dados ficam disponíveis no dashboard imediatamente após salvar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Nome completo
              </label>
              <Input
                value={draft.fullName}
                onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                placeholder="Ex: Helena Martins Silva"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="helena@litoacademy.com"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Time</label>
                <Select
                  value={draft.team}
                  onValueChange={(v) => setDraft((d) => ({ ...d, team: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAMS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Status</label>
                <Select
                  value={draft.active ? 'active' : 'inactive'}
                  onValueChange={(v) => setDraft((d) => ({ ...d, active: v === 'active' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Cor do avatar
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setDraft((d) => ({ ...d, avatarColor: c }))}
                    className={`h-8 w-8 rounded-lg ring-2 transition-transform ${
                      draft.avatarColor === c
                        ? 'ring-white scale-110'
                        : 'ring-transparent hover:scale-105'
                    }`}
                    style={{ background: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar alterações' : 'Criar vendedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
