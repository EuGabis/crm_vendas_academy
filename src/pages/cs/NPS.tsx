import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { useNPSResponses, useStudents } from '@/hooks/useCS';
import { cn } from '@/lib/utils';

export function CSNPSPage() {
  const { data: responses = [], isLoading } = useNPSResponses();
  const { data: students = [] } = useStudents();

  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students],
  );

  const stats = useMemo(() => {
    const count = responses.length;
    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    let sum = 0;
    for (const r of responses) {
      if (r.score >= 9) promoters++;
      else if (r.score >= 7) passives++;
      else detractors++;
      sum += r.score;
    }
    const npsScore = count ? ((promoters - detractors) / count) * 100 : 0;
    const avg = count ? sum / count : 0;
    return { count, promoters, passives, detractors, npsScore, avg };
  }, [responses]);

  return (
    <>
      <Header title="NPS" subtitle="Net Promoter Score — satisfação dos alunos" />
      <div className="page">
        {isLoading ? (
          <LoadingState />
        ) : responses.length === 0 ? (
          <EmptyState
            title="Sem respostas de NPS"
            description="Registre NPS de cada aluno no perfil dele (aba NPS). As estatísticas aparecem aqui."
            icon={Star}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <p className="section-title">NPS Score</p>
                <p
                  className={cn(
                    'text-4xl font-bold tabular-nums mt-1',
                    stats.npsScore >= 50
                      ? 'text-emerald-400'
                      : stats.npsScore >= 0
                        ? 'text-amber-400'
                        : 'text-red-400',
                  )}
                >
                  {Math.round(stats.npsScore)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Média: {stats.avg.toFixed(1)}/10
                </p>
              </Card>
              <Card>
                <p className="section-title">Promotores</p>
                <p className="text-3xl font-bold text-emerald-400 tabular-nums mt-1">
                  {stats.promoters}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {stats.count ? Math.round((stats.promoters / stats.count) * 100) : 0}% do total
                </p>
              </Card>
              <Card>
                <p className="section-title">Passivos</p>
                <p className="text-3xl font-bold text-amber-400 tabular-nums mt-1">
                  {stats.passives}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Notas 7-8</p>
              </Card>
              <Card>
                <p className="section-title">Detratores</p>
                <p className="text-3xl font-bold text-red-400 tabular-nums mt-1">
                  {stats.detractors}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Notas 0-6</p>
              </Card>
            </div>

            {/* Barra de distribuição */}
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Distribuição</h3>
              <div className="flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-red-500/60"
                  style={{
                    width: `${stats.count ? (stats.detractors / stats.count) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-amber-500/60"
                  style={{
                    width: `${stats.count ? (stats.passives / stats.count) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-emerald-500/60"
                  style={{
                    width: `${stats.count ? (stats.promoters / stats.count) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-500 mt-2">
                <span>Detratores</span>
                <span>Passivos</span>
                <span>Promotores</span>
              </div>
            </Card>

            <Card className="!p-0 overflow-hidden">
              <h3 className="text-sm font-semibold text-white p-4 border-b border-zinc-800">
                Últimas respostas
              </h3>
              <div className="divide-y divide-zinc-900 max-h-96 overflow-y-auto">
                {responses.slice(0, 50).map((r) => {
                  const student = studentsById[r.studentId];
                  return (
                    <Link
                      key={r.id}
                      to={student ? `/cs/alunos/${student.id}` : '#'}
                      className="flex items-start gap-3 p-4 hover:bg-zinc-900/40 transition-colors"
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold shrink-0',
                          r.score <= 6
                            ? 'bg-red-500/15 text-red-300'
                            : r.score <= 8
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-emerald-500/15 text-emerald-300',
                        )}
                      >
                        {r.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        {student && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 text-[9px]">
                              <AvatarFallback className="bg-zinc-800 text-zinc-200">
                                {student.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-zinc-200">{student.fullName}</span>
                            <span className="text-[10px] text-zinc-500">
                              · {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        {r.comment && (
                          <p className="text-sm text-zinc-400 mt-1.5">{r.comment}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-600 mt-2" />
                    </Link>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
