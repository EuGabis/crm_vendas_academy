import { useEffect, useState } from 'react';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/layout/ConfiguracoesLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import {
  useUpdateUserEmail,
  useUpdateUserSettings,
  useUserSettings,
} from '@/hooks/useSettings';

const AVATAR_COLORS = [
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

export function ConfigPerfil() {
  const { user } = useAuth();
  const { data: settings } = useUserSettings(user?.id);
  const updateSettings = useUpdateUserSettings();
  const updateEmail = useUpdateUserEmail();

  const [fullName, setFullName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [email, setEmail] = useState(user?.email ?? '');

  useEffect(() => {
    if (settings) {
      setFullName(settings.full_name ?? '');
      setAvatarColor(settings.avatar_color ?? AVATAR_COLORS[0]);
    }
  }, [settings]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const dirty =
    settings &&
    (fullName !== (settings.full_name ?? '') ||
      avatarColor !== (settings.avatar_color ?? AVATAR_COLORS[0]));
  const emailDirty = email !== (user?.email ?? '');

  async function saveProfile() {
    if (!user) return;
    try {
      await updateSettings.mutateAsync({
        userId: user.id,
        patch: { full_name: fullName.trim() || null, avatar_color: avatarColor },
      });
      toast.success('Perfil atualizado');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function saveEmail() {
    try {
      await updateEmail.mutateAsync(email);
      toast.success('Solicitação enviada. Verifique seu novo email para confirmar a alteração.');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  const initials = (fullName || email)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Seu perfil"
        description="Estes dados aparecem em todo o sistema, inclusive no header."
        action={
          <Button onClick={saveProfile} disabled={!dirty || updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" /> Salvar
          </Button>
        }
      >
        <SettingsRow label="Avatar" description="Cor de identidade visual">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback style={{ background: avatarColor }} className="text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className={`h-6 w-6 rounded-md ring-2 transition-transform ${
                    avatarColor === c
                      ? 'ring-white scale-110'
                      : 'ring-transparent hover:scale-105'
                  }`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
        </SettingsRow>
        <SettingsRow label="Nome completo" description="Apresentado no header e nos avisos.">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Como prefere ser chamado"
            className="max-w-xs"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Email de acesso"
        description="Mudar o email exige confirmação no endereço atual e no novo."
        action={
          <Button
            variant="outline"
            onClick={saveEmail}
            disabled={!emailDirty || updateEmail.isPending}
          >
            {updateEmail.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Solicitar alteração
          </Button>
        }
      >
        <SettingsRow label="Email" description="Usado para login e recuperação de senha.">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-xs"
          />
        </SettingsRow>
        {emailDirty && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Após confirmar a alteração, faça login novamente com o novo email.
            </span>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
