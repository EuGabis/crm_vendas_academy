import { useState, type FormEvent } from 'react';
import { Loader2, ShieldAlert, LogOut, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/layout/ConfiguracoesLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChangePassword } from '@/hooks/useSettings';
import { useAuth } from '@/lib/auth';

function passwordStrength(p: string): { score: number; label: string; color: string } {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const labels = ['muito fraca', 'fraca', 'média', 'boa', 'forte', 'muito forte'];
  const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];
  return { score, label: labels[score], color: colors[score] };
}

export function ConfigSeguranca() {
  const { user, signOut } = useAuth();
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const strength = passwordStrength(next);
  const valid =
    next.length >= 8 &&
    next === confirm &&
    current.length > 0 &&
    strength.score >= 3;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error('Verifique a força da nova senha e a confirmação.');
      return;
    }
    try {
      await changePassword.mutateAsync(next);
      toast.success('Senha alterada com sucesso');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Alterar senha"
        description="Use no mínimo 8 caracteres. Recomendamos misturar letras maiúsculas, números e símbolos."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <SettingsRow label="Senha atual">
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="max-w-xs"
            />
          </SettingsRow>
          <SettingsRow label="Nova senha" description="Mínimo 8 caracteres.">
            <div className="max-w-xs space-y-1.5">
              <Input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
              {next.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${strength.color}`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 capitalize w-16 text-right">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
          </SettingsRow>
          <SettingsRow label="Confirmar nova senha">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="max-w-xs"
            />
          </SettingsRow>
          {confirm && confirm !== next && (
            <p className="text-xs text-red-400">As senhas não coincidem.</p>
          )}
          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={!valid || changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <KeyRound className="h-4 w-4" /> Alterar senha
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Sessão"
        description="Encerre a sessão atual em todos os dispositivos."
      >
        <SettingsRow
          label="Conta logada"
          description={user?.email ?? '—'}
        >
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" /> Sair desta conta
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Zona de risco"
        description="Ações irreversíveis. Use com cuidado."
      >
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">Excluir minha conta</p>
            <p className="text-xs text-red-200/70 mt-1">
              A exclusão de contas só pode ser feita pelo administrador do workspace, por motivos de auditoria.
              Solicite via suporte.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            Indisponível
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
