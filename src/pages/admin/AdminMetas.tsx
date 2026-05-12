import { useMemo, useState } from 'react';
import { Save, Target, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useFilters } from '@/store/filters';
import {
  useMonthlyGoals,
  useSellers,
  useUpsertGoal,
} from '@/hooks/useSupabaseData';
import { monthLabelPt, formatCompactCurrency } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DraftGoal {
  revenueGoal: number;
  coursesGoal: number;
  businessDays: number;
}

export function AdminMetas() {
  const { year, month, setMonth } = useFilters();
  const { data: sellers = [], isLoading: lSellers } = useSellers();
  const { data: goals = [], isLoading: lGoals, error } = useMonthlyGoals();
  const upsert = useUpsertGoal();

  const ym = useMemo(() => new Date(year, month, 1).toISOString().slice(0, 10), [year, month]);

  const [draft, setDraft] = useState<Record<string, DraftGoal>>(() => ({}));

  const months = useMemo(() => {
    const arr: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      arr.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabelPt(d) });
    }
    return arr;
  }, []);

  function valueFor(sellerId: string): DraftGoal {
    if (draft[sellerId]) return draft[sellerId];
    const existing = goals.find((g) => g.sellerId === sellerId && g.yearMonth === ym);
    return {
      revenueGoal: existing?.revenueGoal ?? 0,
      coursesGoal: existing?.coursesGoal ?? 0,
      businessDays: existing?.businessDays ?? 21,
    };
  }

  function setField(sellerId: string, field: keyof DraftGoal, value: number) {
    setDraft((d) => ({
      ...d,
      [sellerId]: { ...valueFor(sellerId), [field]: value },
    }));
  }

  async function handleSaveAll() {
    const entries = Object.entries(draft);
    if (entries.length === 0) {
      toast.info('Nada a salvar — nenhuma alteração detectada.');
      return;
    }
    try {
      for (const [sellerId, g] of entries) {
        await upsert.mutateAsync({
          sellerId,
          yearMonth: ym,
          revenueGoal: Number(g.revenueGoal),
          coursesGoal: Number(g.coursesGoal),
          businessDays: Number(g.businessDays),
        });
      }
      toast.success(`${entries.length} meta(s) salva(s)`);
      setDraft({});
    } catch (err) {
      toast.error('Falha ao salvar: ' + (err as Error).message);
    }
  }

  const isLoading = lSellers || lGoals;
  const dirty = Object.keys(draft).length;

  return (
    <>
      <Header title="Metas Mensais" subtitle="Defina meta de receita e cursos por vendedor" />
      <div className="p-8 space-y-6">
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Mês de referência: {monthLabelPt(new Date(year, month, 1))}
                </p>
                <p className="text-xs text-zinc-500">
                  As metas são por mês — selecione outro mês para editar a meta dele.
                </p>
              </div>
            </div>
            <Select
              value={`${year}-${month}`}
              onValueChange={(v) => {
                const [y, m] = v.split('-').map(Number);
                setMonth(y, m);
                setDraft({});
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : sellers.length === 0 ? (
          <EmptyState
            title="Sem vendedores cadastrados"
            description="Cadastre vendedores antes de definir metas."
            actionLabel="Cadastrar vendedores"
            actionTo="/admin/vendedores"
            icon={Target}
          />
        ) : (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                Metas para {monthLabelPt(new Date(year, month, 1))}
              </h3>
              <Button onClick={handleSaveAll} disabled={!dirty || upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Salvar {dirty ? `(${dirty})` : ''}
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                    <th className="text-right font-semibold px-4 py-3">Meta R$</th>
                    <th className="text-right font-semibold px-4 py-3">Meta cursos</th>
                    <th className="text-right font-semibold px-4 py-3">Dias úteis</th>
                    <th className="text-right font-semibold px-4 py-3">Meta diária</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {sellers.map((s) => {
                    const g = valueFor(s.id);
                    const dailyGoal = g.businessDays ? g.revenueGoal / g.businessDays : 0;
                    const isDirty = !!draft[s.id];
                    return (
                      <tr key={s.id} className={isDirty ? 'bg-brand-500/5' : 'hover:bg-zinc-900/40'}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 text-[10px]">
                              <AvatarFallback style={{ background: s.avatarColor }}>
                                {s.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-zinc-100">{s.fullName}</span>
                            {isDirty && (
                              <span className="text-[10px] text-brand-300">• alterado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={g.revenueGoal}
                            onChange={(e) =>
                              setField(s.id, 'revenueGoal', Number(e.target.value))
                            }
                            className="h-8 text-right tabular-nums max-w-[140px] ml-auto"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={g.coursesGoal}
                            onChange={(e) =>
                              setField(s.id, 'coursesGoal', Number(e.target.value))
                            }
                            className="h-8 text-right tabular-nums max-w-[80px] ml-auto"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={g.businessDays}
                            onChange={(e) =>
                              setField(s.id, 'businessDays', Number(e.target.value))
                            }
                            className="h-8 text-right tabular-nums max-w-[70px] ml-auto"
                          />
                        </td>
                        <td className="text-right tabular-nums text-zinc-300 px-4 py-2">
                          {formatCompactCurrency(dailyGoal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
