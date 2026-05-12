import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/empty-state';
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
import { UserPlus, ShieldCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ROLES: { value: UserRole; label: string; variant: 'success' | 'default' | 'warning' | 'muted' }[] = [
  { value: 'admin', label: 'Admin', variant: 'success' },
  { value: 'manager', label: 'Gestor', variant: 'default' },
  { value: 'seller', label: 'Vendedor', variant: 'warning' },
  { value: 'viewer', label: 'Visualizador', variant: 'muted' },
];

export function AdminUsuarios() {
  const { user } = useAuth();
  const { data: profiles = [], isLoading, error } = useProfiles();
  const { data: sellers = [] } = useSellers();
  const updateProfile = useUpdateProfile();

  const [inviteOpen, setInviteOpen] = useState(false);

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
                  Usuários novos são criados pelo painel do <strong>Supabase Auth</strong> e
                  recebem automaticamente role <strong>viewer</strong>.
                </li>
                <li>
                  Aqui você promove para <strong>admin</strong> (acesso total), <strong>gestor</strong>{' '}
                  ou <strong>vendedor</strong> (vinculado a um seller).
                </li>
                <li>
                  Apenas admins veem este painel e podem modificar roles.
                </li>
              </ul>
            </div>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
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
            description="Use 'Criar usuário' acima para abrir o painel do Supabase Auth."
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
                              <code className="text-[10px] text-zinc-500">{p.id.slice(0, 8)}...</code>
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo usuário</DialogTitle>
            <DialogDescription>
              A criação de usuários do Supabase Auth é feita pelo painel administrativo do Supabase
              por segurança. Siga os 3 passos abaixo.
            </DialogDescription>
          </DialogHeader>
          <ol className="text-sm text-zinc-300 space-y-3 list-decimal pl-4">
            <li>
              Abra o painel Supabase →{' '}
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL ?? '#'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:underline inline-flex items-center gap-1"
              >
                Authentication → Users <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Clique em <strong>Add user → Create new user</strong>. Preencha email e senha (marque
              "Auto Confirm" para evitar o email de verificação).
            </li>
            <li>
              Volte aqui. O novo usuário aparecerá na lista com role <strong>viewer</strong> — você
              pode promover a <strong>admin</strong>, <strong>gestor</strong> ou{' '}
              <strong>vendedor</strong> e vinculá-lo a um Seller no dropdown ao lado.
            </li>
          </ol>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setInviteOpen(false)}>Entendi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
