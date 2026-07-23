import { useMemo, useState } from 'react';
import { Save, Target, Loader2, Plus, Minus, Trash2, Sliders } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFilters } from '@/store/filters';
import {
  useMonthlyGoals,
  useSellers,
  useUpsertGoal,
  usePointsAdjustments,
  useAddPointsAdjustment,
  useDeletePointsAdjustment,
} from '@/hooks/useSupabaseData';
import { monthLabelPt, formatInt } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Seller } from '@/types/domain';

interface DraftGoal {
  pointsGoal: number;
  coursesGoal: number;
  businessDays: number;
}

export function AdminMetas() {
  const { year, month, setMonth } = useFilters();
  const { data: sellers = [], isLoading: lSellers } = useSellers();
  const { data: goals = [], isLoading: lGoals, error } = useMonthlyGoals();
  const { data: adjustments = [] } = usePointsAdjustments();
  const upsert = useUpsertGoal();
  const addAdj = useAddPointsAdjustment();
  const delAdj = useDeletePointsAdjustment();
  const [adjTarget, setAdjTarget] = useState<Seller | null>(null);

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
      pointsGoal: existing?.pointsGoal ?? 0,
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
          pointsGoal: Number(g.pointsGoal),
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
      <div className="page">
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
                    <th className="text-right font-semibold px-4 py-3">Meta pontos</th>
                    <th className="text-right font-semibold px-4 py-3">Meta cursos</th>
                    <th className="text-right font-semibold px-4 py-3">Dias úteis</th>
                    <th className="text-right font-semibold px-4 py-3">Meta diária</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {sellers.map((s) => {
                    const g = valueFor(s.id);
                    const dailyGoal = g.businessDays ? g.pointsGoal / g.businessDays : 0;
                    const isDirty = !!draft[s.id];
                    const sellerAdjTotal = adjustments
                      .filter((a) => a.sellerId === s.id && a.yearMonth === ym)
                      .reduce((sum, a) => sum + a.points, 0);
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
                            {sellerAdjTotal !== 0 && (
                              <Badge
                                variant={sellerAdjTotal > 0 ? 'success' : 'warning'}
                                className="text-[9px]"
                              >
                                {sellerAdjTotal > 0 ? '+' : ''}{formatInt(sellerAdjTotal)} pts
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => setAdjTarget(s)}
                              className="ml-auto text-zinc-500 hover:text-brand-300 transition-colors p-1 rounded-lg hover:bg-zinc-900"
                              title="Ajustar pontos"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={g.pointsGoal}
                            onChange={(e) =>
                              setField(s.id, 'pointsGoal', Number(e.target.value))
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
                          {formatInt(Math.round(dailyGoal * 10) / 10)} pts
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

      <AdjustmentDialog
        seller={adjTarget}
        yearMonth={ym}
        adjustments={adjustments.filter(
          (a) => a.sellerId === adjTarget?.id && a.yearMonth === ym,
        )}
        onClose={() => setAdjTarget(null)}
        onAdd={async (points, reason) => {
          if (!adjTarget) return;
          try {
            await addAdj.mutateAsync({
              sellerId: adjTarget.id,
              yearMonth: ym,
              points,
              reason,
            });
            toast.success(
              `${points > 0 ? '+' : ''}${points} pts para ${adjTarget.fullName}`,
            );
          } catch (err) {
            toast.error('Falha: ' + (err as Error).message);
          }
        }}
        onDelete={async (id) => {
          try {
            await delAdj.mutateAsync(id);
            toast.success('Ajuste removido');
          } catch (err) {
            toast.error('Falha: ' + (err as Error).message);
          }
        }}
      />
    </>
  );
}

function AdjustmentDialog({
  seller,
  yearMonth,
  adjustments,
  onClose,
  onAdd,
  onDelete,
}: {
  seller: Seller | null;
  yearMonth: string;
  adjustments: { id: string; points: number; reason: string; createdAt: string }[];
  onClose: () => void;
  onAdd: (points: number, reason: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [pts, setPts] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const total = adjustments.reduce((sum, a) => sum + a.points, 0);

  async function submit(sign: 1 | -1) {
    const raw = Number(pts);
    if (!Number.isFinite(raw) || raw <= 0) {
      toast.error('Informe um valor positivo');
      return;
    }
    if (!reason.trim()) {
      toast.error('Descreva o motivo');
      return;
    }
    setSaving(true);
    try {
      await onAdd(raw * sign, reason.trim());
      setPts('');
      setReason('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!seller} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {seller && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sliders className="h-4 w-4" /> Ajustar pontos — {seller.fullName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-900/40 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                  Total ajustado no mês
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    total > 0
                      ? 'text-emerald-400'
                      : total < 0
                        ? 'text-amber-400'
                        : 'text-zinc-300'
                  }`}
                >
                  {total > 0 ? '+' : ''}
                  {formatInt(total)} pts
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Isso soma/subtrai do total realizado do vendedor além das vendas.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Pontos</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Ex: 10"
                  value={pts}
                  onChange={(e) => setPts(e.target.value)}
                />
                <label className="text-xs text-zinc-400 mt-2 block">Motivo (obrigatório)</label>
                <Input
                  placeholder="Ex: bônus por meta batida antecipada"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => submit(1)}
                    disabled={saving}
                    className="flex-1"
                    variant="default"
                  >
                    <Plus className="h-4 w-4" /> Acrescentar
                  </Button>
                  <Button
                    onClick={() => submit(-1)}
                    disabled={saving}
                    className="flex-1"
                    variant="outline"
                  >
                    <Minus className="h-4 w-4" /> Descontar
                  </Button>
                </div>
              </div>

              {adjustments.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                    Ajustes deste mês ({adjustments.length})
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {adjustments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start justify-between gap-3 p-2 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold tabular-nums ${
                                a.points > 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {a.points > 0 ? '+' : ''}
                              {formatInt(a.points)} pts
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(a.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-zinc-300 mt-0.5">{a.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDelete(a.id)}
                          className="text-zinc-500 hover:text-red-400 p-1"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-zinc-600">
                Mês de referência: {yearMonth}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
