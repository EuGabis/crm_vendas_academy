import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useFilters } from '@/store/filters';
import { sellers, monthlyGoals } from '@/data/seed-data';
import { formatCompactCurrency, formatCurrency, formatInt, formatPercent } from '@/lib/utils';
import { getSellerCards } from '@/data/queries';
import { Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditableGoal {
  sellerId: string;
  revenueGoal: number;
  coursesGoal: number;
  businessDays: number;
}

export function MetasTimes() {
  const { year, month } = useFilters();
  const ym = new Date(year, month, 1).toISOString().slice(0, 10);
  const cards = useMemo(() => getSellerCards({ year, month }), [year, month]);

  const [draft, setDraft] = useState<Record<string, EditableGoal>>(() => {
    const init: Record<string, EditableGoal> = {};
    for (const seller of sellers) {
      const g = monthlyGoals.find((mg) => mg.sellerId === seller.id && mg.yearMonth === ym);
      init[seller.id] = {
        sellerId: seller.id,
        revenueGoal: g?.revenueGoal ?? 50000,
        coursesGoal: g?.coursesGoal ?? 14,
        businessDays: g?.businessDays ?? 21,
      };
    }
    return init;
  });

  function updateField(sellerId: string, field: keyof EditableGoal, value: number) {
    setDraft((d) => ({ ...d, [sellerId]: { ...d[sellerId], [field]: value } }));
  }

  function handleSave() {
    toast.success('Metas salvas no draft local — persistência via Supabase nas próximas sprints.');
  }

  const total = Object.values(draft).reduce((a, g) => a + g.revenueGoal, 0);
  const totalCourses = Object.values(draft).reduce((a, g) => a + g.coursesGoal, 0);

  return (
    <>
      <Header title="Metas de Times" subtitle="Defina meta mensal por vendedor" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="section-title">Meta total do time</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">
              {formatCurrency(total)}
            </p>
          </Card>
          <Card>
            <p className="section-title">Meta total de cursos</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">
              {formatInt(totalCourses)}
            </p>
          </Card>
          <Card>
            <p className="section-title">Meta diária média</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">
              {formatCurrency(total / 21)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Considerando 21 dias úteis</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Edição de metas</h3>
              <p className="text-xs text-zinc-500">Clique em qualquer valor para editar</p>
            </div>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4" /> Salvar metas
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
                  <th className="text-right font-semibold px-4 py-3">Realizado</th>
                  <th className="text-right font-semibold px-4 py-3">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {sellers.map((seller) => {
                  const g = draft[seller.id];
                  const card = cards.find((c) => c.seller.id === seller.id);
                  const realized = card?.revenue ?? 0;
                  const pct = g.revenueGoal ? realized / g.revenueGoal : 0;
                  const dailyGoal = g.revenueGoal / g.businessDays;
                  return (
                    <tr key={seller.id} className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 text-[10px]">
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
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={g.revenueGoal}
                          onChange={(e) =>
                            updateField(seller.id, 'revenueGoal', Number(e.target.value))
                          }
                          className="h-8 text-right tabular-nums max-w-[120px] ml-auto"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={g.coursesGoal}
                          onChange={(e) =>
                            updateField(seller.id, 'coursesGoal', Number(e.target.value))
                          }
                          className="h-8 text-right tabular-nums max-w-[80px] ml-auto"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={g.businessDays}
                          onChange={(e) =>
                            updateField(seller.id, 'businessDays', Number(e.target.value))
                          }
                          className="h-8 text-right tabular-nums max-w-[70px] ml-auto"
                        />
                      </td>
                      <td className="text-right tabular-nums text-zinc-300 px-4 py-2">
                        {formatCompactCurrency(dailyGoal)}
                      </td>
                      <td className="text-right tabular-nums text-zinc-100 font-semibold px-4 py-2">
                        {formatCompactCurrency(realized)}
                      </td>
                      <td className="text-right px-4 py-2">
                        <Badge variant={pct >= 1 ? 'success' : pct >= 0.7 ? 'warning' : 'danger'}>
                          {formatPercent(pct)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1.5">
            <Settings2 className="h-3 w-3" /> Edição local — persistência via Supabase ao plugar
            backend.
          </p>
        </Card>
      </div>
    </>
  );
}
