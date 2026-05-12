import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCourses, useUpsertCourse, useDeleteCourse } from '@/hooks/useSupabaseData';
import type { Course } from '@/types/domain';
import { formatCurrency } from '@/lib/utils';

interface DraftCourse {
  id?: string;
  name: string;
  price: number;
}

export function AdminCursos() {
  const { data: courses = [], isLoading, error } = useCourses();
  const upsert = useUpsertCourse();
  const del = useDeleteCourse();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftCourse>({ name: '', price: 0 });

  function openCreate() {
    setDraft({ name: '', price: 0 });
    setOpen(true);
  }
  function openEdit(c: Course) {
    setDraft({ id: c.id, name: c.name, price: c.price });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        id: draft.id,
        name: draft.name.trim(),
        price: Number(draft.price),
      });
      toast.success(draft.id ? 'Curso atualizado' : 'Curso criado');
      setOpen(false);
    } catch (err) {
      toast.error('Falha ao salvar: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover curso "${name}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('Curso removido');
    } catch (err) {
      toast.error('Falha ao remover: ' + (err as Error).message);
    }
  }

  return (
    <>
      <Header title="Cursos" subtitle="Catálogo de produtos vendidos pela academia" />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{courses.length} curso(s)</p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo curso
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : courses.length === 0 ? (
          <EmptyState
            title="Nenhum curso cadastrado"
            description="Cadastre os produtos vendidos pela academia para associar às vendas."
            icon={BookOpen}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Nome</th>
                    <th className="text-right font-semibold px-4 py-3">Preço base</th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3 text-zinc-100 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                        {formatCurrency(c.price, { full: true })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(c.id, c.name)}
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
            <DialogTitle>{draft.id ? 'Editar curso' : 'Novo curso'}</DialogTitle>
            <DialogDescription>
              O preço informado é o valor base/referência. Cada venda pode ter valor individual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Nome</label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ex: Lito Master"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Preço (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar alterações' : 'Criar curso'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
