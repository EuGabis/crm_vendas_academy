import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  Calendar,
  BookOpen,
  ArrowRight,
  Sun,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/empty-state';
import { useAuth } from '@/lib/auth';
import { useTasks, useToggleTaskStatus, useMaterials } from '@/hooks/useWorkspace';
import { useStudents, useEnrollments, useTickets, useNPSResponses, computeHealthScore } from '@/hooks/useCS';
import { useLeads, useSales, useMonthlyGoals, useSellers } from '@/hooks/useSupabaseData';
import {
  TASK_PRIORITY_LABELS,
  MATERIAL_CATEGORY_LABELS,
  type TaskPriority,
} from '@/types/domain';
import { cn, formatInt, formatPercent, dayLabelPt } from '@/lib/utils';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgente: 'bg-red-500/15 text-red-300 border-red-500/30',
  alta: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  media: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  baixa: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function WorkspaceMeuDia() {
  const { user, profile, isAdmin } = useAuth();
  const { data: tasks = [], isLoading: lTasks } = useTasks();
  const { data: materials = [] } = useMaterials();
  const { data: sellers = [] } = useSellers();
  const { data: students = [] } = useStudents();
  const { data: enrollments = [] } = useEnrollments();
  const { data: tickets = [] } = useTickets();
  const { data: nps = [] } = useNPSResponses();
  const { data: leads = [] } = useLeads();
  const { data: sales = [] } = useSales();
  const { data: goals = [] } = useMonthlyGoals();
  const toggleStatus = useToggleTaskStatus();

  const mySellerId = profile?.seller_id ?? null;
  const mySeller = sellers.find((s) => s.id === mySellerId) ?? null;
  const displayName = mySeller?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';

  // Minhas tarefas (ou todas se admin)
  const myTasks = useMemo(() => {
    return isAdmin
      ? tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
      : tasks.filter(
          (t) => t.assignedTo === mySellerId && t.status !== 'done' && t.status !== 'cancelled',
        );
  }, [tasks, isAdmin, mySellerId]);

  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return myTasks.filter((t) => t.dueDate && t.dueDate < today);
  }, [myTasks]);

  // Reuniões agendadas pra mim hoje (leads em AGENDADA)
  const meetingsToday = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    return leads.filter(
      (l) =>
        l.stage === 'AGENDADA' &&
        l.stageChangedAt.slice(0, 10) === todayStr &&
        (isAdmin || l.sellerId === mySellerId),
    );
  }, [leads, isAdmin, mySellerId]);

  // Alunos em risco (CS) sob minha responsabilidade
  const studentsInRisk = useMemo(() => {
    if (students.length === 0) return [];
    const myStudents = isAdmin
      ? students
      : students.filter((s) => s.sellerId === mySellerId);

    const lastNPSByStudent = new Map<string, number>();
    for (const r of [...nps].reverse()) lastNPSByStudent.set(r.studentId, r.score);
    const ticketsByStudent = new Map<string, number>();
    for (const t of tickets) {
      if (t.status === 'aberto' || t.status === 'em_andamento')
        ticketsByStudent.set(t.studentId, (ticketsByStudent.get(t.studentId) ?? 0) + 1);
    }
    const enrollmentsByStudent = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const arr = enrollmentsByStudent.get(e.studentId) ?? [];
      arr.push(e);
      enrollmentsByStudent.set(e.studentId, arr);
    }

    return myStudents
      .map((s) => {
        const h = computeHealthScore({
          enrollments: enrollmentsByStudent.get(s.id) ?? [],
          openTickets: ticketsByStudent.get(s.id) ?? 0,
          lastNPS: lastNPSByStudent.get(s.id) ?? null,
          onboardingPct: 0.5,
        });
        return { student: s, ...h };
      })
      .filter((x) => x.level === 'critico')
      .slice(0, 5);
  }, [students, enrollments, tickets, nps, isAdmin, mySellerId]);

  // Minha meta vs realizado (mês atual)
  const myGoal = useMemo(() => {
    if (!mySellerId) return null;
    const now = new Date();
    const ym = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const goal = goals.find((g) => g.sellerId === mySellerId && g.yearMonth === ym);
    if (!goal) return null;
    const mySales = sales.filter((s) => {
      const d = new Date(s.soldAt);
      return (
        s.sellerId === mySellerId &&
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    });
    const points = mySales.reduce((a, s) => a + (s.commissionPoints ?? 0), 0);
    const pointsGoal = goal.pointsGoal ?? 0;
    return { pointsGoal, points, pct: pointsGoal ? points / pointsGoal : 0 };
  }, [mySellerId, goals, sales]);

  // Materiais — top 4 mais recentes
  const recentMaterials = useMemo(() => materials.slice(0, 4), [materials]);

  return (
    <>
      <Header title="Meu Dia" subtitle="Sua agenda e prioridades de hoje" />
      <div className="page">
        {/* Saudação */}
        <Card className="!bg-gradient-to-br !from-brand-500/10 !to-indigo-500/10 border-brand-500/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300">
              <Sun className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {greeting()}, {displayName}!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Você tem <strong className="text-brand-300">{myTasks.length}</strong> tarefa(s)
                pendente(s)
                {overdueTasks.length > 0 && (
                  <> · <span className="text-red-400">{overdueTasks.length} atrasada(s)</span></>
                )}
                {meetingsToday.length > 0 && (
                  <> · <span className="text-amber-400">{meetingsToday.length} reunião(ões) hoje</span></>
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Grid: minha meta + reuniões hoje */}
        {(myGoal || meetingsToday.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myGoal && (
              <Card>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="section-title">Minha meta do mês</p>
                    <p className="text-2xl font-bold text-white tabular-nums mt-1">
                      {formatInt(myGoal.points)} pts{' '}
                      <span className="text-sm text-zinc-500">de {formatInt(myGoal.pointsGoal)} pts</span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      myGoal.pct >= 1
                        ? 'success'
                        : myGoal.pct >= 0.7
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {formatPercent(myGoal.pct)}
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-gradient transition-all"
                    style={{ width: `${Math.min(100, myGoal.pct * 100)}%` }}
                  />
                </div>
              </Card>
            )}

            {meetingsToday.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <p className="section-title">Reuniões hoje</p>
                </div>
                <div className="space-y-2">
                  {meetingsToday.slice(0, 3).map((l) => {
                    const seller = sellers.find((s) => s.id === l.sellerId);
                    return (
                      <div
                        key={l.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          {seller && (
                            <Avatar className="h-5 w-5 text-[9px]">
                              <AvatarFallback style={{ background: seller.avatarColor }}>
                                {seller.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-zinc-200">Lead via {l.source}</span>
                        </div>
                        <Badge variant="warning">Agendada</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tarefas + Alunos em risco */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 !p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">
                  {isAdmin ? 'Tarefas do time' : 'Minhas tarefas'}
                </h3>
                <Badge variant="muted">{myTasks.length}</Badge>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/workspace/tarefas">
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {lTasks ? (
              <div className="p-6">
                <LoadingState />
              </div>
            ) : myTasks.length === 0 ? (
              <div className="p-8 text-center">
                <CheckSquare className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-400">
                  {isAdmin ? 'Nenhuma tarefa atribuída' : 'Você está em dia 🎉'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900 max-h-96 overflow-y-auto">
                {myTasks.slice(0, 10).map((t) => {
                  const seller = sellers.find((s) => s.id === t.assignedTo);
                  const isOverdue =
                    t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10);
                  return (
                    <div key={t.id} className="flex items-start gap-3 p-3">
                      <button
                        onClick={() =>
                          toggleStatus.mutate({
                            id: t.id,
                            status: t.status === 'done' ? 'pending' : 'done',
                          })
                        }
                        className={cn(
                          'mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                          t.status === 'done'
                            ? 'border-emerald-400 bg-emerald-400'
                            : 'border-zinc-700 hover:border-brand-400',
                        )}
                      >
                        {t.status === 'done' && (
                          <CheckSquare className="h-3 w-3 text-zinc-950" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-zinc-100">{t.title}</p>
                          <span
                            className={cn(
                              'text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold',
                              PRIORITY_COLOR[t.priority],
                            )}
                          >
                            {TASK_PRIORITY_LABELS[t.priority]}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500">
                          {t.dueDate && (
                            <span
                              className={cn(
                                isOverdue && 'text-red-400 font-semibold',
                              )}
                            >
                              {isOverdue ? '⚠ Atrasada · ' : ''}
                              {dayLabelPt(new Date(t.dueDate))}
                            </span>
                          )}
                          {seller && isAdmin && (
                            <span className="text-zinc-600">
                              · atribuída a {seller.fullName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white">Alunos em risco</h3>
                <Badge variant="danger">{studentsInRisk.length}</Badge>
              </div>
            </div>
            {studentsInRisk.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Nenhum aluno crítico 🎉
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {studentsInRisk.map(({ student, score }) => (
                  <Link
                    key={student.id}
                    to={`/cs/alunos/${student.id}`}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
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
                      <span className="text-sm text-zinc-100 truncate">{student.fullName}</span>
                    </div>
                    <span className="text-sm font-bold text-red-400 tabular-nums">{score}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Materiais recentes */}
        {recentMaterials.length > 0 && (
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Materiais recentes</h3>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/workspace/materiais">
                  Ver biblioteca <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
              {recentMaterials.map((m) => (
                <Link
                  key={m.id}
                  to="/workspace/materiais"
                  className="block p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{m.title}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {MATERIAL_CATEGORY_LABELS[m.category]}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
