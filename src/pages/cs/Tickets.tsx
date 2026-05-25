import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketCheck, Filter, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTickets } from '@/hooks/useCS';
import { useStudents } from '@/hooks/useCS';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from '@/types/domain';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<TicketStatus, 'warning' | 'default' | 'success' | 'muted'> = {
  aberto: 'warning',
  em_andamento: 'default',
  resolvido: 'success',
  fechado: 'muted',
};

export function CSTicketsPage() {
  const { data: tickets = [], isLoading } = useTickets();
  const { data: students = [] } = useStudents();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students],
  );

  const filtered = useMemo(() => {
    let list = tickets;
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    return list.sort((a, b) => {
      const order = { urgente: 0, alta: 1, media: 2, baixa: 3 };
      return order[a.priority] - order[b.priority];
    });
  }, [tickets, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<TicketStatus, number> = {
      aberto: 0,
      em_andamento: 0,
      resolvido: 0,
      fechado: 0,
    };
    for (const t of tickets) c[t.status]++;
    return c;
  }, [tickets]);

  return (
    <>
      <Header title="Tickets" subtitle="Fila de suporte e atendimento aos alunos" />
      <div className="page">
        {/* Status counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(counts) as TicketStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all',
                statusFilter === s
                  ? 'border-brand-500/60 bg-brand-500/10 ring-2 ring-brand-500/30'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
              )}
            >
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {TICKET_STATUS_LABELS[s]}
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-1">
                {counts[s]}
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | 'all')}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aberto">Abertos</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="resolvido">Resolvidos</SelectItem>
              <SelectItem value="fechado">Fechados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum ticket"
            description={
              statusFilter === 'all'
                ? 'Tickets criados pelo time aparecem aqui.'
                : `Nenhum ticket com status "${TICKET_STATUS_LABELS[statusFilter]}".`
            }
            icon={TicketCheck}
          />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-zinc-900">
              {filtered.map((t) => {
                const student = studentsById[t.studentId];
                if (!student) return null;
                return (
                  <Link
                    key={t.id}
                    to={`/cs/alunos/${student.id}`}
                    className="block p-4 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar className="h-6 w-6 text-[10px]">
                            <AvatarFallback className="bg-zinc-800 text-zinc-200">
                              {student.fullName
                                .split(' ')
                                .slice(0, 2)
                                .map((p) => p[0])
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-zinc-400">{student.fullName}</span>
                          <span className="text-zinc-700">·</span>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                            {TICKET_CATEGORY_LABELS[t.category]}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-100 mt-1.5">{t.subject}</p>
                        {t.body && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.body}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={STATUS_VARIANT[t.status]}>
                            {TICKET_STATUS_LABELS[t.status]}
                          </Badge>
                          <Badge
                            variant={
                              t.priority === 'urgente' || t.priority === 'alta'
                                ? 'danger'
                                : t.priority === 'media'
                                  ? 'warning'
                                  : 'muted'
                            }
                          >
                            {TICKET_PRIORITY_LABELS[t.priority]}
                          </Badge>
                          <span className="text-[10px] text-zinc-600">
                            {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-600 mt-2 shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
