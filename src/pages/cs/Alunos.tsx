import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users2, Loader2, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
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
import { useSellers } from '@/hooks/useSupabaseData';
import {
  useStudents,
  useUpsertStudent,
  useDeleteStudent,
} from '@/hooks/useCS';
import type { Student } from '@/types/domain';

function maskCPF(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskPhone(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

interface DraftStudent {
  id?: string;
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  sellerId: string;
}

const EMPTY: DraftStudent = {
  fullName: '',
  cpf: '',
  email: '',
  phone: '',
  sellerId: '',
};

export function CSAlunos() {
  const { data: students = [], isLoading, error } = useStudents();
  const { data: sellers = [] } = useSellers();
  const upsert = useUpsertStudent();
  const del = useDeleteStudent();

  const sellersById = useMemo(
    () => Object.fromEntries(sellers.map((s) => [s.id, s])),
    [sellers],
  );

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftStudent>(EMPTY);

  function openCreate() {
    setDraft({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(s: Student) {
    setDraft({
      id: s.id,
      fullName: s.fullName,
      cpf: s.cpf ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      sellerId: s.sellerId ?? '',
    });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        id: draft.id,
        fullName: draft.fullName.trim(),
        cpf: draft.cpf || null,
        email: draft.email || null,
        phone: draft.phone || null,
        sellerId: draft.sellerId || null,
      });
      toast.success(draft.id ? 'Aluno atualizado' : 'Aluno cadastrado');
      setOpen(false);
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover aluno "${name}"? Matrículas e tickets serão removidos juntos.`))
      return;
    try {
      await del.mutateAsync(id);
      toast.success('Aluno removido');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.cpf?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        s.email?.toLowerCase().includes(q),
    );
  }, [students, search]);

  return (
    <>
      <Header title="Alunos" subtitle="Base de clientes da Lito Academy" />
      <div className="page">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-zinc-500">{students.length} aluno(s)</p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo aluno
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou email..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : students.length === 0 ? (
          <EmptyState
            title="Nenhum aluno cadastrado"
            description="Cadastre seus alunos para começar a gerenciar o pós-venda."
            icon={Users2}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum aluno encontrado"
            description={`Nenhum resultado para "${search}".`}
            icon={Search}
          />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Aluno</th>
                    <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">CPF</th>
                    <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">
                      Vendedor responsável
                    </th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filtered.map((s) => {
                    const seller = s.sellerId ? sellersById[s.sellerId] : null;
                    return (
                      <tr key={s.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3">
                          <Link
                            to={`/cs/alunos/${s.id}`}
                            className="flex items-center gap-2.5 group"
                          >
                            <Avatar className="h-8 w-8 text-xs">
                              <AvatarFallback className="bg-zinc-800 text-zinc-200">
                                {s.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="leading-tight">
                              <div className="text-zinc-100 font-medium group-hover:text-brand-300 transition-colors">
                                {s.fullName}
                              </div>
                              {s.email && (
                                <div className="text-[11px] text-zinc-500">{s.email}</div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 hidden md:table-cell tabular-nums text-xs">
                          {s.cpf ?? '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {seller ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 text-[10px]">
                                <AvatarFallback style={{ background: seller.avatarColor }}>
                                  {seller.fullName
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((p) => p[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-zinc-300 text-xs">{seller.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs">Sem responsável</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild size="sm" variant="ghost">
                              <Link to={`/cs/alunos/${s.id}`}>
                                Abrir <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(s.id, s.fullName)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Editar aluno' : 'Novo aluno'}</DialogTitle>
            <DialogDescription>
              Cadastro mínimo para o pós-venda — apenas nome, CPF, contato e vendedor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Nome completo *
              </label>
              <Input
                value={draft.fullName}
                onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                placeholder="Ex: Mariana Souza"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">CPF</label>
                <Input
                  value={draft.cpf}
                  onChange={(e) => setDraft((d) => ({ ...d, cpf: maskCPF(e.target.value) }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Telefone</label>
                <Input
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: maskPhone(e.target.value) }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="aluno@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Vendedor responsável
              </label>
              <Select
                value={draft.sellerId || 'none'}
                onValueChange={(v) => setDraft((d) => ({ ...d, sellerId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
