import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { sellers } from '@/data/seed-data';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const CRITERIA = [
  { key: 'discovery', label: 'Discovery (qualificação)' },
  { key: 'rapport', label: 'Rapport e escuta ativa' },
  { key: 'pitch', label: 'Pitch e demonstração' },
  { key: 'objections', label: 'Quebra de objeções' },
  { key: 'fechamento', label: 'Fechamento e follow-up' },
];

export function AvaliacaoClosers() {
  const [scores] = useState<Record<string, number[]>>(() => {
    const init: Record<string, number[]> = {};
    for (const s of sellers) {
      init[s.id] = CRITERIA.map(() => Math.round((Math.random() * 4 + 6) * 10) / 10);
    }
    return init;
  });

  return (
    <>
      <Header
        title="Avaliação de Closers"
        subtitle="Rubrica qualitativa por critérios de venda"
      />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sellers.map((s) => {
            const sellerScores = scores[s.id];
            const avg = sellerScores.reduce((a, b) => a + b, 0) / sellerScores.length;
            return (
              <Card key={s.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ background: s.avatarColor }}>
                        {s.fullName
                          .split(' ')
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-white">{s.fullName}</p>
                      <p className="text-xs text-zinc-500">{s.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="h-4 w-4 fill-amber-400" />
                      <span className="text-2xl font-bold text-white tabular-nums">
                        {avg.toFixed(1)}
                      </span>
                      <span className="text-xs text-zinc-500">/ 10</span>
                    </div>
                    <Badge
                      variant={avg >= 8.5 ? 'success' : avg >= 7 ? 'warning' : 'danger'}
                      className="mt-1"
                    >
                      {avg >= 8.5 ? 'Excelente' : avg >= 7 ? 'Bom' : 'Atenção'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {CRITERIA.map((c, i) => (
                    <div key={c.key} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 flex-1">{c.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={cn(
                            'h-full',
                            sellerScores[i] >= 8.5
                              ? 'bg-emerald-400'
                              : sellerScores[i] >= 7
                                ? 'bg-amber-400'
                                : 'bg-red-400',
                          )}
                          style={{ width: `${sellerScores[i] * 10}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-zinc-300 w-8 text-right">
                        {sellerScores[i].toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
