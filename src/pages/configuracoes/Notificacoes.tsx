import { useEffect, useState } from 'react';
import { Loader2, Save, Mail, Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/layout/ConfiguracoesLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useUpdateUserSettings, useUserSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-500' : 'bg-zinc-800',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export function ConfigNotificacoes() {
  const { user } = useAuth();
  const { data: settings } = useUserSettings(user?.id);
  const update = useUpdateUserSettings();

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);

  useEffect(() => {
    if (settings) {
      setNotifyEmail(settings.notify_email);
      setNotifyInApp(settings.notify_in_app);
    }
  }, [settings]);

  const dirty =
    settings &&
    (notifyEmail !== settings.notify_email || notifyInApp !== settings.notify_in_app);

  async function save() {
    if (!user) return;
    try {
      await update.mutateAsync({
        userId: user.id,
        patch: { notify_email: notifyEmail, notify_in_app: notifyInApp },
      });
      toast.success('Preferências salvas');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Canais de notificação"
        description="Onde você quer receber alertas e atualizações da plataforma."
        action={
          <Button onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" /> Salvar
          </Button>
        }
      >
        <SettingsRow
          label="Notificações no app"
          description="Badge no sino do header e toasts no canto da tela."
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-zinc-500" />
            <Toggle checked={notifyInApp} onChange={setNotifyInApp} />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Notificações por email"
          description="Resumos diários e alertas críticos no seu email."
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-zinc-500" />
            <Toggle checked={notifyEmail} onChange={setNotifyEmail} />
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Tipos de alerta"
        description="Configurações granulares por tipo de evento. Disponível em breve."
      >
        <SettingsRow
          label="Meta diária não batida"
          description="Avisa quando um vendedor está abaixo do pace ideal."
        >
          <Toggle checked={false} onChange={() => {}} disabled />
        </SettingsRow>
        <SettingsRow
          label="Nova venda registrada"
          description="Toast em tempo real quando alguém registra uma venda."
        >
          <Toggle checked={false} onChange={() => {}} disabled />
        </SettingsRow>
        <SettingsRow
          label="CAC acima do limite"
          description="Aviso quando o CAC ultrapassar 30% do ticket médio."
        >
          <Toggle checked={false} onChange={() => {}} disabled />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
