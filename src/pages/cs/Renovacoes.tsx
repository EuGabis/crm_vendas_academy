import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Repeat, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { useEnrollments, useStudents } from '@/hooks/useCS';
import { useCourses } from '@/hooks/useSupabaseData';
import { PAYMENT_METHOD_LABELS } from '@/types/domain';
import { cn, formatCurrency } from '@/lib/utils';

export function CSRenovacoesPage() {
  const { data: enrollments = [], isLoading } = useEnrollments();
  const { data: students = [] } = useStudents();
  const { data: courses = [] } = useCourses();

  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students],
  );
  const coursesById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c])),
    [courses],
  );

  // Buckets temporais
  const now = new Date();
  const groups = useMemo(() => {
    const overdue: typeof enrollments = [];
    const next7: typeof enrollments = [];
    const next30: typeof enrollments = [];
    const next90: typeof enrollments = [];

    for (const e of enrollments) {
      if (!e.nextRenewalAt) continue;
      const d = new Date(e.nextRenewalAt);
      const diff = (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (e.status === 'overdue' || diff < 0) overdue.push(e);
      else if (diff <= 7) next7.push(e);
      else if (diff <= 30) next30.push(e);
      else if (diff <= 90) next90.push(e);
    }

    const sortAsc = (a: (typeof enrollments)[0], b: (typeof enrollments)[0]) =>
      new Date(a.nextRenewalAt!).getTime() - new Date(b.nextRenewalAt!).getTime();
    return {
      overdue: overdue.sort(sortAsc),
      next7: next7.sort(sortAsc),
      next30: next30.sort(sortAsc),
      next90: next90.sort(sortAsc),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments]);

  const totalAmount = useMemo(() => {
    const all = [...groups.overdue, ...groups.next7, ...groups.next30, ...groups.next90];
    return all.reduce((sum, e) => sum + (coursesById[e.courseId]?.price ?? 0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, coursesById]);

  function row(e: (typeof enrollments)[0]) {
    const student = studentsById[e.studentId];
    if (!student) return null;
    const course = coursesById[e.courseId];
    const daysLeft = Math.ceil(
      (new Date(e.nextRenewalAt!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    const overdue = daysLeft < 0;
    return (
      <Link
        key={e.id}
        to={`/cs/alunos/${student.id}`}
        className="flex items-center justify-between gap-3 p-3 hover:bg-zinc-900/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 text-[10px]">
            <AvatarFallback className="bg-zinc-800 text-zinc-200">
              {student.fullName
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-sm text-zinc-100 truncate">{student.fullName}</div>
            <div className="text-[11px] text-zinc-500 truncate">
              {course?.name ?? 'Curso removido'} · {PAYMENT_METHOD_LABELS[e.paymentMethod]}
              {e.isRecurring && ' · Recorrente'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs text-zinc-400 tabular-nums">
              {new Date(e.nextRenewalAt!).toLocaleDateString('pt-BR')}
            </div>
            <div
              className={cn(
                'text-[11px] font-semibold tabular-nums',
                overdue
                  ? 'text-red-400'
                  : daysLeft <= 7
                    ? 'text-amber-400'
                    : 'text-zinc-500',
              )}
            >
              {overdue ? `${Math.abs(daysLeft)}d atrasado` : `em ${daysLeft}d`}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </div>
      </Link>
    );
  }

  const section = (
    title: string,
    badge: 'danger' | 'warning' | 'default' | 'muted',
    items: typeof enrollments,
    description: string,
  ) =>
    items.length > 0 && (
      <Card className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          </div>
          <Badge variant={badge}>{items.length}</Badge>
        </div>
        <div className="divide-y divide-zinc-900">{items.map(row)}</div>
      </Card>
    );

  const hasAny =
    groups.overdue.length + groups.next7.length + groups.next30.length + groups.next90.length > 0;

  return (
    <>
      <Header title="Renovações" subtitle="Próximas cobranças e atrasos" />
      <div className="page">
        {isLoading ? (
          <LoadingState />
        ) : !hasAny ? (
          <EmptyState
            title="Sem renovações próximas"
            description="Quando matrículas com recorrência forem cadastradas, elas aparecem aqui agrupadas por vencimento."
            icon={Repeat}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <p className="section-title">Atrasadas</p>
                <p className="text-3xl font-bold text-red-400 tabular-nums mt-1">
                  {groups.overdue.length}
                </p>
              </Card>
              <Card>
                <p className="section-title">Próx 7 dias</p>
                <p className="text-3xl font-bold text-amber-400 tabular-nums mt-1">
                  {groups.next7.length}
                </p>
              </Card>
              <Card>
                <p className="section-title">Próx 30 dias</p>
                <p className="text-3xl font-bold text-zinc-200 tabular-nums mt-1">
                  {groups.next30.length}
                </p>
              </Card>
              <Card>
                <p className="section-title">Receita potencial</p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">
                  {formatCurrency(totalAmount)}
                </p>
              </Card>
            </div>

            {section(
              'Atrasadas',
              'danger',
              groups.overdue,
              'Cobranças vencidas — risco alto de churn',
            )}
            {section('Próximos 7 dias', 'warning', groups.next7, 'Acompanhar de perto')}
            {section('Próximos 30 dias', 'default', groups.next30, 'Planejar contato')}
            {section('Próximos 90 dias', 'muted', groups.next90, 'Visão de pipeline')}
          </>
        )}
      </div>
    </>
  );
}
