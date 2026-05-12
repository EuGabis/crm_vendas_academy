import { useEffect, useState } from 'react';
import { Loader2, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/layout/ConfiguracoesLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAppSettings,
  useUpdateAppSetting,
  type CompanySettings,
} from '@/hooks/useSettings';

const EMPTY: CompanySettings = {
  name: '',
  legal_name: '',
  cnpj: '',
  logo_url: '/lito-full.png',
  support_email: '',
};

function maskCNPJ(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function ConfigEmpresa() {
  const { data: settings, isLoading } = useAppSettings();
  const update = useUpdateAppSetting<'company'>();
  const [draft, setDraft] = useState<CompanySettings>(EMPTY);

  useEffect(() => {
    if (settings?.company) setDraft(settings.company);
  }, [settings?.company]);

  const dirty =
    settings?.company &&
    JSON.stringify(draft) !== JSON.stringify(settings.company);

  async function save() {
    try {
      await update.mutateAsync({ key: 'company', value: draft });
      toast.success('Dados da empresa atualizados');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Dados da empresa"
        description="Informações usadas em relatórios, notas fiscais e tela de login."
        action={
          <Button onClick={save} disabled={!dirty || update.isPending || isLoading}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" /> Salvar
          </Button>
        }
      >
        <SettingsRow label="Nome de exibição" description="Aparece em headers e relatórios.">
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Lito Academy"
            className="max-w-xs"
          />
        </SettingsRow>
        <SettingsRow label="Razão social" description="Nome jurídico completo.">
          <Input
            value={draft.legal_name}
            onChange={(e) => setDraft((d) => ({ ...d, legal_name: e.target.value }))}
            placeholder="Lito Academy LTDA"
            className="max-w-xs"
          />
        </SettingsRow>
        <SettingsRow label="CNPJ">
          <Input
            value={draft.cnpj}
            onChange={(e) => setDraft((d) => ({ ...d, cnpj: maskCNPJ(e.target.value) }))}
            placeholder="00.000.000/0000-00"
            className="max-w-xs"
          />
        </SettingsRow>
        <SettingsRow
          label="Email de suporte"
          description="Mostrado em links de ajuda e na tela 'Sobre'."
        >
          <Input
            type="email"
            value={draft.support_email}
            onChange={(e) => setDraft((d) => ({ ...d, support_email: e.target.value }))}
            placeholder="suporte@litoacademy.com"
            className="max-w-xs"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Logo"
        description="A logo aparece na sidebar (versão completa) e na sidebar colapsada (ícone)."
      >
        <SettingsRow
          label="Logo horizontal"
          description="Arquivo em /public/lito-full.png (recomendado: PNG, fundo transparente, 400×100)"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center overflow-hidden">
              <img
                src="/lito-full.png"
                alt="Logo"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML =
                    '<span class="text-[10px] text-zinc-600">sem logo</span>';
                }}
              />
            </div>
            <Button variant="outline" size="sm" disabled>
              <Building2 className="h-3.5 w-3.5" /> Upload em breve
            </Button>
          </div>
        </SettingsRow>
        <SettingsRow
          label="Ícone (sidebar colapsada)"
          description="Arquivo em /public/lito-icon.png — formato quadrado, 96×96"
        >
          <div className="h-10 w-10 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center overflow-hidden">
            <img
              src="/lito-icon.png"
              alt="Ícone"
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
