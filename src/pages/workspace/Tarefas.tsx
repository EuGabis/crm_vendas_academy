import { useMemo, useState, type FormEvent } from 'react';
import {
  Plus,
  CheckSquare,
  Trash2,
  Pencil,
  Loader2,
  Filter,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
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
import { useAuth } from '@/lib/auth';
import { useSellers } from '@/hooks/useSupabaseData';
import {
  useTasks,
  useUpsertTask,
  useDeleteTask,
  useToggleTaskStatus,
} from '@/hooks/useWorkspace';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
  type WorkspaceTask,
} from '@/types/domain';
import { cn, dayLabelPt } from '@/lib/utils';

const PRIORITIES: TaskPriority[] = ['baixa', 'media', 'alta', 'urgente'];
const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'done', 'cancelled'];

const PRIORITY_VARIANT: Record<TaskPriority, 'muted' | 'info' | 'warning' | 'danger'> = {
  baixa: 'muted',
  media: 'info',
  alta: 'warning',
  urgente: 'danger',
};

interface Draft {
  id?: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
}

const EMPTY: Draft = {
  title: '',
  description: '',
  assignedTo: '',
  priority: 'media',
  dueDate: '',
  status: 'pending',
};

export function WorkspaceTarefas() {
  const { user, isAdmin, profile } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: sellers = [] } = useSellers();
  const upsert = useUpsertTask();
  const del = useDeleteTask();
  const toggleStatus = useToggleTaskStatus();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [filter, setFilter] = useState<'all' | 'mine' | 'overdue' | TaskStatus>('all');

  const sellersById = useMemo(
    () => Object.fromEntries(sellers.map((s) => [s.id, s])),
    [sellers],
  );

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let list = tasks;
    if (filter === 'mine') list = list.filter((t) => t.assignedTo === profile?.seller_id);
    else if (filter === 'overdue')
      list = list.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done');
    else if (filter !== 'all') list = list.filter((t) => t.status === filter);
    return list;
  }, [tasks, filter, profile?.seller_id]);

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter(
        (t) => t.dueDate && t.dueDate < today && t.status !== 'done',
      ).length,
    };
  }, [tasks]);

  function openCreate() {
    setDraft({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(t: WorkspaceTask) {
    setDraft({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      assignedTo: t.assignedTo ?? '',
      priority: t.priority,
      dueDate: t.dueDate ?? '',
      status: t.status,
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        id: draft.id,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        assignedTo: draft.assignedTo || null,
        priority: draft.priority,
        dueDate: draft.dueDate || null,
        status: draft.status,
        createdBy: !draft.id ? user?.id : undefined,
      });
      toast.success(draft.id ? 'Tarefa atualizada' : 'Tarefa criada');
      setOpen(false);
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Remover tarefa "${title}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('Tarefa removida');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <>
      <Header title="Tarefas" subtitle="Lista de afazeres do time" />
      <div className="page">
        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(
            [
              { key: 'all' as const, label: 'Total', value: counts.all, color: 'text-zinc-200' },
              { key: 'pending' as const, label: 'A fazer', value: counts.pending, color: 'text-blue-400' },
              { key: 'in_progress' as const, label: 'Em andamento', value: counts.in_progress, color: 'text-amber-400' },
              { key: 'done' as const, label: 'Concluídas', value: counts.done, color: 'text-emerald-400' },
              { key: 'overdue' as const, label: 'Atrasadas', value: counts.overdue, color: 'text-red-400' },
            ] as const
          ).map((b) => (
            <button
              key={b.key}
              onClick={() => setFilter(b.key as typeof filter)}
              className={cn(
                'rounded-2xl border p-3 text-left transition-all',
                filter === b.key
                  ? 'border-brand-500/60 bg-brand-500/10 ring-2 ring-brand-500/30'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                {b.label}
              </div>
              <div className={cn('text-2xl font-bold tabular-nums mt-1', b.color)}>
                {b.value}
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {profile?.seller_id && <SelectItem value="mine">Minhas</SelectItem>}
                <SelectItem value="overdue">Atrasadas</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          )}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa"
            description={
              !isAdmin
                ? 'O gestor ainda não atribuiu tarefas pra esse filtro.'
                : 'Crie a primeira tarefa pro time.'
            }
            icon={CheckSquare}
          />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-zinc-900">
              {filtered.map((t) => {
                const seller = t.assignedTo ? sellersById[t.assignedTo] : null;
                const isOverdue =
                  t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10);
                const done = t.status === 'done';
                return (
                  <div key={t.id} className="flex items-start gap-3 p-4">
                    <button
                      onClick={() =>
                        toggleStatus.mutate({
                          id: t.id,
                          status: done ? 'pending' : 'done',
                        })
                      }
                      className={cn(
                        'mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                        done
                          ? 'border-emerald-400 bg-emerald-400'
                          : 'border-zinc-700 hover:border-brand-400',
                      )}
                      aria-label={done ? 'Reabrir' : 'Marcar como concluída'}
                    >
                      {done && <CheckSquare className="h-3 w-3 text-zinc-950" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            done ? 'text-zinc-500 line-through' : 'text-zinc-100',
                          )}
                        >
                          {t.title}
                        </p>
                        <Badge variant={PRIORITY_VARIANT[t.priority]}>
                          {TASK_PRIORITY_LABELS[t.priority]}
                        </Badge>
                        {t.status !== 'pending' && t.status !== 'done' && (
                          <Badge variant="warning">{TASK_STATUS_LABELS[t.status]}</Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 flex-wrap">
                        {t.dueDate && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1',
                              isOverdue && !done && 'text-red-400 font-semibold',
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {isOverdue && !done && '⚠ '}
                            {dayLabelPt(new Date(t.dueDate))}
                          </span>
                        )}
                        {seller && (
                          <span className="inline-flex items-center gap-1.5">
                            <Avatar className="h-4 w-4 text-[8px]">
                              <AvatarFallback style={{ background: seller.avatarColor }}>
                                {seller.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            {seller.fullName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(t.id, t.title)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription>
              Atribua a um vendedor com data e prioridade.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Título</label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Ex: Follow-up no João sexta às 10h"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Descrição</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={3}
                placeholder="Contexto e instruções..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Atribuir a
                </label>
                <Select
                  value={draft.assignedTo || 'none'}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, assignedTo: v === 'none' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguém</SelectItem>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Prazo
                </label>
                <Input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Prioridade
                </label>
                <Select
                  value={draft.priority}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, priority: v as TaskPriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {TASK_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Status</label>
                <Select
                  value={draft.status}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, status: v as TaskStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TASK_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!draft.title || upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar' : 'Criar tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
