import { useEffect, useState } from 'react';
import { Loader2, Save, Moon, Sun, Monitor, Rows3, Rows4 } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/layout/ConfiguracoesLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  useUpdateUserSettings,
  useUserSettings,
  type UserSettings,
} from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

const THEMES: { value: UserSettings['theme']; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

const DENSITY: { value: UserSettings['density']; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { value: 'comfortable', label: 'Confortável', icon: Rows3, description: 'Mais espaço entre elementos' },
  { value: 'compact', label: 'Compacto', icon: Rows4, description: 'Mais informação por tela' },
];

export function ConfigAparencia() {
  const { user } = useAuth();
  const { data: settings } = useUserSettings(user?.id);
  const update = useUpdateUserSettings();

  const [theme, setTheme] = useState<UserSettings['theme']>('dark');
  const [density, setDensity] = useState<UserSettings['density']>('comfortable');

  useEffect(() => {
    if (settings) {
      setTheme(settings.theme);
      setDensity(settings.density);
    }
  }, [settings]);

  const dirty = settings && (theme !== settings.theme || density !== settings.density);

  async function save() {
    if (!user) return;
    try {
      await update.mutateAsync({ userId: user.id, patch: { theme, density } });
      toast.success('Preferências salvas');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Tema"
        description="A plataforma é otimizada para o modo escuro. Modo claro estará disponível em breve."
        action={
          <Button onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" /> Salvar
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.value;
            const disabled = t.value !== 'dark';
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => !disabled && setTheme(t.value)}
                disabled={disabled}
                className={cn(
                  'flex flex-col items-center gap-2 p-5 rounded-xl border transition-all',
                  active
                    ? 'border-brand-500/60 bg-brand-500/10 ring-2 ring-brand-500/30'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                  disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                <Icon className={cn('h-6 w-6', active ? 'text-brand-300' : 'text-zinc-400')} />
                <span className="text-sm font-medium text-zinc-200">{t.label}</span>
                {disabled && (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                    em breve
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Densidade"
        description="Quanto espaço cada elemento ocupa nas tabelas e cards."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DENSITY.map((d) => {
            const Icon = d.icon;
            const active = density === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setDensity(d.value)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                  active
                    ? 'border-brand-500/60 bg-brand-500/10 ring-2 ring-brand-500/30'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                    active ? 'bg-brand-500/20 text-brand-300' : 'bg-zinc-800/80 text-zinc-400',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <SettingsRow label={d.label} description={d.description}>
                  <div />
                </SettingsRow>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Pré-visualização"
        description="Como vai parecer com as configurações atuais."
      >
        <SettingsRow label="Tema atual">
          <span className="text-sm text-zinc-300 capitalize">{theme}</span>
        </SettingsRow>
        <SettingsRow label="Densidade atual">
          <span className="text-sm text-zinc-300 capitalize">{density}</span>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
