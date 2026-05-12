import { useState } from 'react';
import { Download, Database, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/layout/ConfiguracoesLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDashboardDatasets } from '@/hooks/useSupabaseData';
import { getSupabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

type DatasetKey = 'sellers' | 'courses' | 'leads' | 'sales' | 'goals' | 'traffic';

const DATASETS: { key: DatasetKey; label: string; description: string }[] = [
  { key: 'sellers', label: 'Vendedores', description: 'Cadastro completo da equipe' },
  { key: 'courses', label: 'Cursos', description: 'Catálogo de produtos' },
  { key: 'leads', label: 'Leads', description: 'Histórico de leads e etapas' },
  { key: 'sales', label: 'Vendas', description: 'Todas as vendas registradas' },
  { key: 'goals', label: 'Metas mensais', description: 'Metas por vendedor e mês' },
  { key: 'traffic', label: 'Tráfego', description: 'Gastos de mídia paga' },
];

function toCSV<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(','));
  return lines.join('\n');
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ConfigDados() {
  const ds = useDashboardDatasets();
  const qc = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [wiping, setWiping] = useState(false);

  function exportDataset(key: DatasetKey) {
    const data = ds[key] as unknown as Record<string, unknown>[];
    if (data.length === 0) {
      toast.info('Nenhum dado para exportar nesta tabela.');
      return;
    }
    const ts = new Date().toISOString().slice(0, 10);
    downloadFile(`lito-${key}-${ts}.csv`, toCSV(data));
    toast.success(`${data.length} registro(s) exportado(s)`);
  }

  function exportAll() {
    const ts = new Date().toISOString().slice(0, 10);
    let total = 0;
    for (const d of DATASETS) {
      const rows = ds[d.key] as unknown as Record<string, unknown>[];
      if (rows.length === 0) continue;
      downloadFile(`lito-${d.key}-${ts}.csv`, toCSV(rows));
      total += rows.length;
    }
    if (total === 0) toast.info('Nenhum dado para exportar.');
    else toast.success(`${total} registro(s) exportados em ${DATASETS.length} arquivos`);
  }

  async function wipeAll() {
    if (confirmText !== 'LIMPAR TUDO') {
      toast.error('Digite "LIMPAR TUDO" para confirmar.');
      return;
    }
    setWiping(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase não configurado');
      // Ordem por causa de FK
      const tables = ['sales', 'leads', 'traffic_spend', 'monthly_goals', 'courses', 'sellers'];
      for (const t of tables) {
        const { error } = await sb.from(t).delete().not('id', 'is', null);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      toast.success('Banco limpo. Todos os dados de negócio foram removidos.');
      qc.invalidateQueries();
      setConfirmOpen(false);
      setConfirmText('');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    } finally {
      setWiping(false);
    }
  }

  const totalRecords =
    ds.sellers.length +
    ds.courses.length +
    ds.leads.length +
    ds.sales.length +
    ds.goals.length +
    ds.traffic.length;

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Visão geral do banco"
        description="Quantidade atual de registros por tabela."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DATASETS.map((d) => {
            const count = (ds[d.key] as unknown[]).length;
            return (
              <div
                key={d.key}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
              >
                <div className="leading-tight">
                  <p className="text-xs text-zinc-500">{d.label}</p>
                  <p className="text-xl font-bold text-white tabular-nums">{count}</p>
                </div>
                <Database className="h-4 w-4 text-zinc-700" />
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Exportar dados"
        description="Baixe os dados em CSV para análise externa ou backup."
        action={
          <Button onClick={exportAll} disabled={totalRecords === 0}>
            <Download className="h-4 w-4" /> Exportar tudo
          </Button>
        }
      >
        {DATASETS.map((d) => {
          const count = (ds[d.key] as unknown[]).length;
          return (
            <SettingsRow key={d.key} label={d.label} description={d.description}>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{count} registros</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportDataset(d.key)}
                  disabled={count === 0}
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </SettingsRow>
          );
        })}
      </SettingsSection>

      <SettingsSection
        title="Zona de risco"
        description="Ações destrutivas, sem possibilidade de desfazer."
      >
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">Limpar todos os dados de negócio</p>
            <p className="text-xs text-red-200/70 mt-1">
              Remove vendedores, cursos, leads, vendas, metas e tráfego. Não afeta usuários nem
              configurações.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="!border-red-500/40 !text-red-300 hover:!bg-red-500/10"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Limpar banco
          </Button>
        </div>
      </SettingsSection>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-300">Confirmar limpeza total</DialogTitle>
            <DialogDescription>
              Você está prestes a remover <strong>{totalRecords}</strong> registros do banco. Esta
              ação não pode ser desfeita. Para continuar, digite{' '}
              <code className="text-red-300">LIMPAR TUDO</code> abaixo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="LIMPAR TUDO"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={wipeAll}
              disabled={confirmText !== 'LIMPAR TUDO' || wiping}
            >
              {wiping && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" /> Limpar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
