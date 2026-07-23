import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabase } from '@/lib/supabase';

interface SyncConfig {
  url?: string;
  last_synced_at?: string;
  last_result?: {
    inserted: number;
    skipped_dups: number;
    source_rows: number;
  };
}

interface SyncResponse {
  inserted: number;
  skipped_dups: number;
  sellers_created: number;
  courses_created: number;
  source_rows: number;
  csv_total_rows: number;
  skipped: { no_amount: number; no_seller: number; no_course: number; no_date: number };
  url_used: string;
  synced_at: string;
  warning?: string;
}

async function fetchConfig(): Promise<SyncConfig> {
  const sb = getSupabase();
  if (!sb) return {};
  try {
    const { data } = await sb
      .from('app_settings')
      .select('value')
      .eq('key', 'sheet_sync')
      .maybeSingle();
    return ((data?.value as SyncConfig) ?? {}) as SyncConfig;
  } catch {
    // tabela app_settings pode nao existir — retorna vazio
    return {};
  }
}

async function callSync(url?: string): Promise<SyncResponse> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase nao configurado');
  const { data: session } = await sb.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('Nao autenticado');

  const r = await fetch('/api/admin/sync-sheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(url ? { url } : {}),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
  return body as SyncResponse;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.floor((now - then) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

export function AdminSincronizar() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ['sheet_sync_config'], queryFn: fetchConfig });
  const [urlDraft, setUrlDraft] = useState('');

  const sync = useMutation({
    mutationFn: (url?: string) => callSync(url),
    onSuccess: (data) => {
      toast.success(
        `${data.inserted} venda(s) sincronizada(s)`,
        {
          description:
            `${data.skipped_dups} duplicada(s) ignorada(s) · ` +
            `${data.sellers_created} novo(s) vendedor(es) · ` +
            `${data.courses_created} novo(s) curso(s)`,
        },
      );
      qc.invalidateQueries({ queryKey: ['sheet_sync_config'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sellers'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      setUrlDraft('');
    },
    onError: (err) => {
      toast.error('Falha ao sincronizar: ' + (err as Error).message);
    },
  });

  const configuredUrl = cfg.data?.url;
  const lastSync = cfg.data?.last_synced_at;
  const lastResult = cfg.data?.last_result;

  const maskedUrl = useMemo(() => {
    if (!configuredUrl) return '';
    const parts = configuredUrl.split('/');
    const last = parts[parts.length - 2] ?? '';
    return `${parts.slice(0, 4).join('/')}/…/${last.slice(0, 8)}…/pub`;
  }, [configuredUrl]);

  return (
    <>
      <Header
        title="Sincronizar Planilha"
        subtitle="Puxa vendas do Google Sheets publicado e insere no banco"
      />
      <div className="page">
        {/* Configuração da URL */}
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">URL da planilha</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Cole a URL de "Publicar na web → CSV" do Google Sheets. Fica
                salva pra próximas sincronizações.
              </p>
            </div>
          </div>

          {configuredUrl && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">
                  URL configurada
                </p>
                <p className="text-xs text-zinc-300 font-mono truncate">{maskedUrl}</p>
              </div>
              <a
                href={configuredUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 shrink-0 ml-2"
                title="Abrir planilha"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              className="flex-1"
            />
            <Button
              disabled={!urlDraft.trim() || sync.isPending}
              onClick={() => sync.mutate(urlDraft.trim())}
              variant="outline"
            >
              Salvar e sincronizar
            </Button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            Ao clicar em "Salvar e sincronizar", a URL fica gravada em app_settings
            e todas as próximas sincronizações usam ela automaticamente.
          </p>
        </Card>

        {/* Botão principal */}
        {configuredUrl && (
          <Card className="!bg-gradient-to-br !from-brand-500/10 !to-indigo-500/10 border-brand-500/20">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-bold text-white">Sincronizar agora</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Baixa a planilha, cria vendedores/cursos que faltarem, e insere
                  as vendas novas (deduplica automaticamente).
                </p>
                {lastSync && (
                  <p className="text-[11px] text-zinc-500 mt-2">
                    Última sync: <strong className="text-zinc-300">{timeAgo(lastSync)}</strong>
                    {lastResult && (
                      <>
                        {' '}· <span className="text-emerald-400">{lastResult.inserted} vendas</span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <Button
                size="lg"
                disabled={sync.isPending}
                onClick={() => sync.mutate(undefined)}
                className="shrink-0"
              >
                {sync.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sincronizando…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Sincronizar agora
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Resultado da última execução (do banco) */}
        {lastResult && (
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Última sincronização</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                  Vendas inseridas
                </p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {lastResult.inserted}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                  Duplicadas ignoradas
                </p>
                <p className="text-2xl font-bold text-zinc-400 tabular-nums">
                  {lastResult.skipped_dups}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                  Linhas processadas
                </p>
                <p className="text-2xl font-bold text-zinc-300 tabular-nums">
                  {lastResult.source_rows}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Resultado da execução atual (transiente) */}
        {sync.isSuccess && sync.data && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-emerald-300">Sincronização concluída</h3>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-500">Inseridas</p>
                    <p className="text-lg font-bold text-emerald-400 tabular-nums">{sync.data.inserted}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Duplicadas</p>
                    <p className="text-lg font-bold text-zinc-400 tabular-nums">{sync.data.skipped_dups}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Novos vendedores</p>
                    <p className="text-lg font-bold text-brand-300 tabular-nums">{sync.data.sellers_created}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Novos cursos</p>
                    <p className="text-lg font-bold text-brand-300 tabular-nums">{sync.data.courses_created}</p>
                  </div>
                </div>
                {(sync.data.skipped.no_amount + sync.data.skipped.no_seller + sync.data.skipped.no_course + sync.data.skipped.no_date) > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    <span>
                      Ignoradas por dados faltando: {sync.data.skipped.no_amount} sem valor,{' '}
                      {sync.data.skipped.no_seller} sem vendedor, {sync.data.skipped.no_course} sem curso,{' '}
                      {sync.data.skipped.no_date} sem data
                    </span>
                  </div>
                )}
                {sync.data.warning && (
                  <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-400 p-2 rounded-lg bg-amber-500/10">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{sync.data.warning}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {sync.isError && (
          <Card className="border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-300">Falha na sincronização</h3>
                <p className="text-xs text-red-200/80 mt-1">{(sync.error as Error).message}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Instruções */}
        {!configuredUrl && (
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Como publicar sua planilha</h3>
            <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside">
              <li>Abra a planilha no Google Sheets</li>
              <li>Menu <strong className="text-zinc-200">Arquivo → Compartilhar → Publicar na web</strong></li>
              <li>Aba <strong className="text-zinc-200">Link</strong>: escolha "Valores separados por vírgula (.csv)"</li>
              <li>Clique <strong className="text-zinc-200">Publicar</strong> → confirme</li>
              <li>Copie a URL gerada e cole no campo acima</li>
            </ol>
            <div className="mt-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <p className="text-[11px] text-zinc-400">
                <strong className="text-amber-300">Colunas esperadas</strong> (case-insensitive):
              </p>
              <p className="text-[11px] font-mono text-zinc-300 mt-1">
                pagamento · parcelas · valor venda · nome produto · nome contato · codigo tel ·
                telefone contato · nome oferta · vendedor · pontos · DATA
              </p>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
