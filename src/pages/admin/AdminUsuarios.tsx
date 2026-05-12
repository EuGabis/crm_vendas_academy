import { useState, type FormEvent } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { useProfiles, useUpdateProfile } from '@/hooks/useProfiles';
import { useSellers } from '@/hooks/useSupabaseData';
import type { UserRole } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';

const ROLES: {
  value: UserRole;
  label: string;
  variant: 'success' | 'default' | 'warning' | 'muted';
  description: string;
}[] = [
  {
    value: 'admin',
    label: 'Admin',
    variant: 'success',
    description: 'Acesso total — pode gerenciar tudo',
  },
  {
    value: 'manager',
    label: 'Gestor',
    variant: 'default',
    description: 'Vê todos os dados e gerencia equipe',
  },
  {
    value: 'seller',
    label: 'Vendedor',
    variant: 'warning',
    description: 'Vinculado a um vendedor (vê só os dados próprios)',
  },
  {
    value: 'viewer',
    label: 'Visualizador',
    variant: 'muted',
    description: 'Apenas leitura — sem alterações',
  },
];

interface DraftUser {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  seller_id: string | null;
}

const EMPTY_DRAFT: DraftUser = {
  email: '',
  password: '',
  full_name: '',
  role: 'viewer',
  seller_id: null,
};

export function AdminUsuarios() {
  const { user } = useAuth();
  const { data: profiles = [], isLoading, error, refetch } = useProfiles();
  const { data: sellers = [] } = useSellers();
  const updateProfile = useUpdateProfile();

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DraftUser>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  async function handleRoleChange(profileId: string, role: UserRole) {
    if (profileId === user?.id && role !== 'admin') {
      toast.error('Você não pode rebaixar o próprio usuário admin.');
      return;
    }
    try {
      await updateProfile.mutateAsync({ id: profileId, role });
      toast.success('Role atualizada');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleLinkSeller(profileId: string, sellerId: string | null) {
    try {
      await updateProfile.mutateAsync({ id: profileId, seller_id: sellerId });
      toast.success('Vendedor vinculado');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Pega o JWT atual pra autenticar a chamada admin
      const sb = getSupabase();
      const { data: sessionData } = (await sb?.auth.getSession()) ?? { data: { session: null } };
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('Sessão expirada — faça login novamente');
        setSubmitting(false);
        return;
      }

      const resp = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error('Falha: ' + (errBody.error ?? resp.statusText));
        setSubmitting(false);
        return;
      }

      const result = await resp.json();
      if (result.adopted) {
        toast.success(
          `Email ${result.email} já existia no Supabase — vinculado à Lito Academy como ${result.role}. Senha foi atualizada.`,
          { duration: 6000 },
        );
      } else {
        toast.success(`Usuário ${result.email} criado como ${result.role}`);
      }
      setCreateOpen(false);
      setDraft(EMPTY_DRAFT);
      refetch();
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header
        title="Usuários"
        subtitle="Gerencie quem tem acesso à plataforma e suas permissões"
      />
      <div className="p-8 space-y-6">
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Como funciona</p>
              <ul className="text-xs text-zinc-400 mt-2 space-y-1 list-disc pl-4">
                <li>
                  Clique em <strong>Criar usuário</strong> para adicionar um novo acesso à plataforma.
                </li>
                <li>
                  Defina <strong>role</strong> (admin / gestor / vendedor / visualizador) e
                  opcionalmente vincule a um vendedor cadastrado.
                </li>
                <li>
                  O usuário já é criado com email confirmado — pode logar imediatamente.
                </li>
              </ul>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Criar usuário
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : profiles.length === 0 ? (
          <EmptyState
            title="Nenhum usuário cadastrado ainda"
            description="Clique em 'Criar usuário' acima para adicionar o primeiro acesso."
            icon={UserPlus}
          />
        ) : (
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">
              {profiles.length} usuário(s) com acesso
            </h3>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">User ID</th>
                    <th className="text-left font-semibold px-4 py-3">Role</th>
                    <th className="text-left font-semibold px-4 py-3">Vendedor vinculado</th>
                    <th className="text-left font-semibold px-4 py-3">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {profiles.map((p) => {
                    const isMe = p.id === user?.id;
                    return (
                      <tr key={p.id} className={isMe ? 'bg-brand-500/5' : 'hover:bg-zinc-900/40'}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 text-[10px]">
                              <AvatarFallback className="bg-zinc-800 text-zinc-300">
                                {p.id.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="leading-tight">
                              <code className="text-[10px] text-zinc-500">
                                {p.id.slice(0, 8)}...
                              </code>
                              {isMe && (
                                <Badge variant="default" className="ml-2 text-[9px]">
                                  você
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                ROLES.find((r) => r.value === p.role)?.variant ?? 'muted'
                              }
                            >
                              {ROLES.find((r) => r.value === p.role)?.label ?? p.role}
                            </Badge>
                            <Select
                              value={p.role}
                              onValueChange={(v) => handleRoleChange(p.id, v as UserRole)}
                              disabled={isMe}
                            >
                              <SelectTrigger className="w-36 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={p.seller_id ?? 'none'}
                            onValueChange={(v) =>
                              handleLinkSeller(p.id, v === 'none' ? null : v)
                            }
                          >
                            <SelectTrigger className="w-52 h-7 text-xs">
                              <SelectValue placeholder="Nenhum" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {sellers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                          {new Date(p.created_at).toLocaleDateString('pt-BR')}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá acesso imediato com a role definida abaixo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Nome completo
              </label>
              <Input
                value={draft.full_name}
                onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
                placeholder="Ex: Helena Martins Silva"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="usuario@litoacademy.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Senha inicial
                </label>
                <Input
                  type="text"
                  value={draft.password}
                  onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Role</label>
              <Select
                value={draft.role}
                onValueChange={(v) => setDraft((d) => ({ ...d, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                {ROLES.find((r) => r.value === draft.role)?.description}
              </p>
            </div>
            {draft.role === 'seller' && (
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Vincular a um vendedor
                </label>
                <Select
                  value={draft.seller_id ?? 'none'}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, seller_id: v === 'none' ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <UserPlus className="h-4 w-4" /> Criar usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
