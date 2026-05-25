import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users2,
  TicketCheck,
  Star,
  Repeat,
  AlertTriangle,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import {
  useStudents,
  useEnrollments,
  useTickets,
  useNPSResponses,
  computeHealthScore,
} from '@/hooks/useCS';
import { formatInt, formatPercent, cn } from '@/lib/utils';

export function CSDashboardPage() {
  const { data: students = [], isLoading } = useStudents();
  const { data: enrollments = [] } = useEnrollments();
  const { data: tickets = [] } = useTickets();
  const { data: nps = [] } = useNPSResponses();

  const stats = useMemo(() => {
    const activeStudents = new Set(
      enrollments.filter((e) => e.status === 'active').map((e) => e.studentId),
    ).size;
    const cancelledStudents = new Set(
      enrollments.filter((e) => e.status === 'cancelled').map((e) => e.studentId),
    ).size;
    const churnRate = students.length ? cancelledStudents / students.length : 0;

    const openTickets = tickets.filter(
      (t) => t.status === 'aberto' || t.status === 'em_andamento',
    ).length;

    // NPS Score
    const npsCount = nps.length;
    let promoters = 0;
    let detractors = 0;
    for (const r of nps) {
      if (r.score >= 9) promoters++;
      else if (r.score <= 6) detractors++;
    }
    const npsScore = npsCount ? ((promoters - detractors) / npsCount) * 100 : 0;

    // Renovações nos próximos 30 dias
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const renewingSoon = enrollments.filter((e) => {
      if (!e.nextRenewalAt || e.status !== 'active') return false;
      const d = new Date(e.nextRenewalAt);
      return d >= now && d <= in30;
    });

    // Health score por aluno
    const lastNPSByStudent = new Map<string, number>();
    for (const r of [...nps].reverse()) lastNPSByStudent.set(r.studentId, r.score);

    const ticketsByStudent = new Map<string, number>();
    for (const t of tickets) {
      if (t.status !== 'aberto' && t.status !== 'em_andamento') continue;
      ticketsByStudent.set(t.studentId, (ticketsByStudent.get(t.studentId) ?? 0) + 1);
    }

    const enrollmentsByStudent = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const arr = enrollmentsByStudent.get(e.studentId) ?? [];
      arr.push(e);
      enrollmentsByStudent.set(e.studentId, arr);
    }

    const healthList = students.map((s) => {
      const enrolls = enrollmentsByStudent.get(s.id) ?? [];
      const h = computeHealthScore({
        enrollments: enrolls,
        openTickets: ticketsByStudent.get(s.id) ?? 0,
        lastNPS: lastNPSByStudent.get(s.id) ?? null,
        onboardingPct: 0.5, // placeholder — sem fetch granular aqui
      });
      return { student: s, ...h };
    });

    const critical = healthList.filter((h) => h.level === 'critico');
    const attention = healthList.filter((h) => h.level === 'atencao');

    return {
      activeStudents,
      cancelledStudents,
      churnRate,
      openTickets,
      npsScore,
      npsCount,
      renewingSoon,
      critical,
      attention,
    };
  }, [students, enrollments, tickets, nps]);

  return (
    <>
      <Header title="Customer Success" subtitle="Visão geral do pós-venda" />
      <div className="page">
        {isLoading ? (
          <LoadingState />
        ) : students.length === 0 ? (
          <EmptyState
            title="Sem alunos cadastrados"
            description="Cadastre alunos pra começar a operar o CS — tickets, renovações e NPS."
            actionLabel="Cadastrar alunos"
            actionTo="/cs/alunos"
            icon={Users2}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <KpiCard
                label="Total de alunos"
                value={formatInt(students.length)}
                icon={<Users2 className="h-4 w-4" />}
                accent="info"
              />
              <KpiCard
                label="Alunos ativos"
                value={formatInt(stats.activeStudents)}
                hint={`${stats.cancelledStudents} cancelados`}
                icon={<Activity className="h-4 w-4" />}
                accent="success"
              />
              <KpiCard
                label="Churn"
                value={formatPercent(stats.churnRate)}
                icon={<AlertTriangle className="h-4 w-4" />}
                accent={stats.churnRate > 0.1 ? 'danger' : 'warning'}
              />
              <KpiCard
                label="Tickets abertos"
                value={formatInt(stats.openTickets)}
                icon={<TicketCheck className="h-4 w-4" />}
                accent={stats.openTickets > 5 ? 'danger' : 'warning'}
              />
              <KpiCard
                label="NPS Score"
                value={stats.npsCount ? Math.round(stats.npsScore).toString() : '—'}
                hint={`${stats.npsCount} respostas`}
                icon={<Star className="h-4 w-4" />}
                accent={stats.npsScore >= 50 ? 'success' : stats.npsScore >= 0 ? 'warning' : 'danger'}
              />
            </div>

            {/* Health Score breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="section-title">Saudáveis</p>
                    <p className="text-3xl font-bold text-emerald-400 tabular-nums mt-1">
                      {students.length - stats.critical.length - stats.attention.length}
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-xs text-zinc-500">Sem riscos identificados</p>
              </Card>

              <Card>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="section-title">Atenção</p>
                    <p className="text-3xl font-bold text-amber-400 tabular-nums mt-1">
                      {stats.attention.length}
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-xs text-zinc-500">Vale acompanhar de perto</p>
              </Card>

              <Card>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="section-title">Críticos</p>
                    <p className="text-3xl font-bold text-red-400 tabular-nums mt-1">
                      {stats.critical.length}
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <p className="text-xs text-zinc-500">Risco alto de churn</p>
              </Card>
            </div>

            {/* Cards de ações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alunos críticos */}
              <Card className="!p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-semibold text-white">Alunos em risco</h3>
                  <Badge variant="danger">{stats.critical.length}</Badge>
                </div>
                {stats.critical.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-500">
                    Nenhum aluno em estado crítico 🎉
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-900 max-h-72 overflow-y-auto">
                    {stats.critical.slice(0, 8).map(({ student, score }) => (
                      <Link
                        key={student.id}
                        to={`/cs/alunos/${student.id}`}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-zinc-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 text-[10px]">
                            <AvatarFallback className="bg-zinc-800 text-zinc-200">
                              {student.fullName
                                .split(' ')
                                .slice(0, 2)
                                .map((p) => p[0])
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-zinc-100 truncate">
                            {student.fullName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-red-400 tabular-nums">
                            {score}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Renovações próximas */}
              <Card className="!p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-semibold text-white">Renovações em 30 dias</h3>
                  <Badge variant={stats.renewingSoon.length > 0 ? 'warning' : 'muted'}>
                    {stats.renewingSoon.length}
                  </Badge>
                </div>
                {stats.renewingSoon.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-500">
                    Nenhuma renovação prevista pros próximos 30 dias.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-900 max-h-72 overflow-y-auto">
                    {stats.renewingSoon
                      .sort(
                        (a, b) =>
                          new Date(a.nextRenewalAt!).getTime() -
                          new Date(b.nextRenewalAt!).getTime(),
                      )
                      .slice(0, 8)
                      .map((e) => {
                        const student = students.find((s) => s.id === e.studentId);
                        if (!student) return null;
                        const daysLeft = Math.ceil(
                          (new Date(e.nextRenewalAt!).getTime() - Date.now()) /
                            (24 * 60 * 60 * 1000),
                        );
                        return (
                          <Link
                            key={e.id}
                            to={`/cs/alunos/${student.id}`}
                            className="flex items-center justify-between gap-3 p-3 hover:bg-zinc-900/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Repeat className="h-4 w-4 text-amber-400 shrink-0" />
                              <span className="text-sm text-zinc-100 truncate">
                                {student.fullName}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'text-xs font-semibold tabular-nums',
                                daysLeft <= 7
                                  ? 'text-red-400'
                                  : daysLeft <= 15
                                    ? 'text-amber-400'
                                    : 'text-zinc-400',
                              )}
                            >
                              {daysLeft}d
                            </span>
                          </Link>
                        );
                      })}
                  </div>
                )}
                <div className="p-3 border-t border-zinc-800 bg-zinc-900/40">
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link to="/cs/renovacoes">
                      Ver todas as renovações <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
