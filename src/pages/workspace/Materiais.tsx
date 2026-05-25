import { useMemo, useState, type FormEvent } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Pencil,
  Loader2,
  ExternalLink,
  FileText,
  Video,
  HelpCircle,
  Shield,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import {
  useMaterials,
  useUpsertMaterial,
  useDeleteMaterial,
} from '@/hooks/useWorkspace';
import {
  MATERIAL_CATEGORY_LABELS,
  type MaterialCategory,
  type WorkspaceMaterial,
} from '@/types/domain';
import { cn } from '@/lib/utils';

const CATEGORIES: MaterialCategory[] = [
  'script',
  'apresentacao',
  'video',
  'faq',
  'objecao',
  'politica',
  'outros',
];

const CATEGORY_ICON: Record<MaterialCategory, React.ComponentType<{ className?: string }>> = {
  script: MessageSquare,
  apresentacao: FileText,
  video: Video,
  faq: HelpCircle,
  objecao: Shield,
  politica: BookOpen,
  outros: Sparkles,
};

const CATEGORY_COLOR: Record<MaterialCategory, string> = {
  script: 'bg-brand-500/15 text-brand-300',
  apresentacao: 'bg-blue-500/15 text-blue-300',
  video: 'bg-red-500/15 text-red-300',
  faq: 'bg-emerald-500/15 text-emerald-300',
  objecao: 'bg-amber-500/15 text-amber-300',
  politica: 'bg-zinc-700/40 text-zinc-300',
  outros: 'bg-zinc-700/40 text-zinc-300',
};

interface Draft {
  id?: string;
  title: string;
  description: string;
  category: MaterialCategory;
  url: string;
  body: string;
  tagsRaw: string;
}

const EMPTY: Draft = {
  title: '',
  description: '',
  category: 'script',
  url: '',
  body: '',
  tagsRaw: '',
};

export function WorkspaceMateriais() {
  const { user, isAdmin } = useAuth();
  const { data: materials = [], isLoading } = useMaterials();
  const upsert = useUpsertMaterial();
  const del = useDeleteMaterial();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState<WorkspaceMaterial | null>(null);

  const filtered = useMemo(() => {
    let list = materials;
    if (categoryFilter !== 'all') list = list.filter((m) => m.category === categoryFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.body?.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [materials, search, categoryFilter]);

  const countsByCategory = useMemo(() => {
    const c: Record<MaterialCategory, number> = {
      script: 0,
      apresentacao: 0,
      video: 0,
      faq: 0,
      objecao: 0,
      politica: 0,
      outros: 0,
    };
    for (const m of materials) c[m.category]++;
    return c;
  }, [materials]);

  function openCreate() {
    setDraft({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(m: WorkspaceMaterial) {
    setDraft({
      id: m.id,
      title: m.title,
      description: m.description ?? '',
      category: m.category,
      url: m.url ?? '',
      body: m.body ?? '',
      tagsRaw: m.tags.join(', '),
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const tags = draft.tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await upsert.mutateAsync({
        id: draft.id,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        category: draft.category,
        url: draft.url.trim() || null,
        body: draft.body.trim() || null,
        tags,
        createdBy: !draft.id ? user?.id : undefined,
      });
      toast.success(draft.id ? 'Material atualizado' : 'Material adicionado');
      setOpen(false);
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Remover material "${title}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success('Material removido');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <>
      <Header title="Materiais" subtitle="Biblioteca de scripts, vídeos e recursos de venda" />
      <div className="page">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-zinc-500">{materials.length} material(is) disponível(is)</p>
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo material
            </Button>
          )}
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, conteúdo ou tag..."
            className="pl-9"
          />
        </div>

        {/* Filtros por categoria */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              categoryFilter === 'all'
                ? 'border-brand-500/60 bg-brand-500/15 text-brand-300'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700',
            )}
          >
            Todos · {materials.length}
          </button>
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  categoryFilter === c
                    ? 'border-brand-500/60 bg-brand-500/15 text-brand-300'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700',
                )}
              >
                <Icon className="h-3 w-3" />
                {MATERIAL_CATEGORY_LABELS[c]} · {countsByCategory[c]}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Nada encontrado' : 'Biblioteca vazia'}
            description={
              search
                ? `Nenhum material para "${search}".`
                : isAdmin
                  ? 'Adicione scripts, FAQs e materiais de apoio para o time.'
                  : 'O gestor ainda não publicou nenhum material.'
            }
            icon={BookOpen}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => {
              const Icon = CATEGORY_ICON[m.category];
              return (
                <Card
                  key={m.id}
                  className="!p-0 overflow-hidden flex flex-col cursor-pointer hover:border-zinc-700 transition-colors"
                  onClick={() => setPreview(m)}
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl shrink-0',
                          CATEGORY_COLOR[m.category],
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(m);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(m.id, m.title);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
                      {MATERIAL_CATEGORY_LABELS[m.category]}
                    </p>
                    <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                    {m.description && (
                      <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">{m.description}</p>
                    )}
                    {m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {m.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="muted" className="text-[9px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.url && (
                    <div className="border-t border-zinc-800 px-5 py-2 bg-zinc-900/40">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline"
                      >
                        Abrir link <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Editar material' : 'Novo material'}</DialogTitle>
            <DialogDescription>
              Adicione scripts, FAQs, links de vídeo ou qualquer apoio de venda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Título</label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Ex: Script de abordagem para Premium"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Categoria</label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft((d) => ({ ...d, category: v as MaterialCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {MATERIAL_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Descrição curta
              </label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Em uma frase — quando usar este material"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Link (Drive, YouTube, etc) — opcional
              </label>
              <Input
                type="url"
                value={draft.url}
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Conteúdo (script, FAQ, etc) — opcional
              </label>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                rows={6}
                placeholder="Pode colar texto, script, perguntas e respostas..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 resize-y font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Tags (separadas por vírgula)
              </label>
              <Input
                value={draft.tagsRaw}
                onChange={(e) => setDraft((d) => ({ ...d, tagsRaw: e.target.value }))}
                placeholder="premium, alta-renda, fechamento"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!draft.title || upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="muted">{MATERIAL_CATEGORY_LABELS[preview.category]}</Badge>
                  {preview.tags.map((t) => (
                    <Badge key={t} variant="default" className="text-[9px]">
                      {t}
                    </Badge>
                  ))}
                </div>
                <DialogTitle>{preview.title}</DialogTitle>
                {preview.description && (
                  <DialogDescription>{preview.description}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {preview.url && (
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:underline"
                  >
                    {preview.url} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {preview.body && (
                  <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                    {preview.body}
                  </pre>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
