import { Header } from '@/components/layout/Header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
import { useSellers } from '@/hooks/useSupabaseData';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, ClipboardCheck } from 'lucide-react';

const CRITERIA = [
  { key: 'discovery', label: 'Discovery (qualificação)' },
  { key: 'rapport', label: 'Rapport e escuta ativa' },
  { key: 'pitch', label: 'Pitch e demonstração' },
  { key: 'objections', label: 'Quebra de objeções' },
  { key: 'fechamento', label: 'Fechamento e follow-up' },
];

export function AvaliacaoClosers() {
  const { data: sellers = [], isLoading, error } = useSellers();

  return (
    <>
      <Header
        title="Avaliação de Closers"
        subtitle="Rubrica qualitativa por critérios de venda"
      />
      <div className="p-8 space-y-6">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : sellers.length === 0 ? (
          <EmptyState
            title="Sem vendedores cadastrados"
            description="Cadastre vendedores para iniciar a avaliação qualitativa."
            actionLabel="Cadastrar vendedores"
            actionTo="/admin/vendedores"
            icon={ClipboardCheck}
          />
        ) : (
          <>
            <Card>
              <p className="text-sm text-zinc-400">
                <strong className="text-zinc-200">Funcionalidade em construção:</strong> os scores
                abaixo são exibidos como exemplo. Em uma próxima sprint, criaremos a tabela
                <code className="text-brand-400 mx-1">closer_evaluations</code> no Supabase para
                persistir as notas por critério, mês e avaliador.
              </p>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sellers.map((s) => (
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
                        <span className="text-2xl font-bold text-white tabular-nums">—</span>
                      </div>
                      <Badge variant="muted" className="mt-1">
                        Pendente
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {CRITERIA.map((c) => (
                      <div key={c.key} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 flex-1">{c.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden" />
                        <span className="text-xs tabular-nums text-zinc-500 w-8 text-right">—</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
