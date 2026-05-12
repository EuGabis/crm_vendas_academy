import { ExternalLink, Github, Mail, BookOpen } from 'lucide-react';
import {
  SettingsSection,
  SettingsRow,
} from '@/components/layout/ConfiguracoesLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppSettings } from '@/hooks/useSettings';

const VERSION = '0.3.0';
const REPO = 'EuGabis/crm_vendas_academy';

export function ConfigSobre() {
  const { data: settings } = useAppSettings();
  const company = settings?.company;

  return (
    <div className="space-y-6">
      <SettingsSection
        title={company?.name ?? 'Lito Academy — Plataforma de Dados'}
        description="Sistema interno de gestão comercial."
      >
        <SettingsRow label="Versão">
          <Badge variant="default">v{VERSION}</Badge>
        </SettingsRow>
        <SettingsRow label="Stack">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="muted">React 18</Badge>
            <Badge variant="muted">Vite 6</Badge>
            <Badge variant="muted">TypeScript</Badge>
            <Badge variant="muted">Tailwind</Badge>
            <Badge variant="muted">Supabase</Badge>
            <Badge variant="muted">Recharts</Badge>
          </div>
        </SettingsRow>
        <SettingsRow label="Ambiente">
          <Badge variant="success">
            {import.meta.env.MODE === 'production' ? 'Produção' : 'Desenvolvimento'}
          </Badge>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Suporte" description="Precisando de ajuda? Fala com a gente.">
        {company?.support_email && (
          <SettingsRow label="Email de suporte">
            <Button asChild variant="outline" size="sm">
              <a href={`mailto:${company.support_email}`}>
                <Mail className="h-3.5 w-3.5" /> {company.support_email}
              </a>
            </Button>
          </SettingsRow>
        )}
        <SettingsRow label="Documentação" description="Em construção.">
          <Button variant="outline" size="sm" disabled>
            <BookOpen className="h-3.5 w-3.5" /> Em breve
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Código-fonte" description="Repositório privado no GitHub.">
        <SettingsRow label="Repositório">
          <Button asChild variant="outline" size="sm">
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-3.5 w-3.5" /> {REPO}
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </SettingsRow>
      </SettingsSection>

      <p className="text-center text-xs text-zinc-600 pt-4">
        © {new Date().getFullYear()} {company?.legal_name || company?.name || 'Lito Academy'}. Todos
        os direitos reservados.
      </p>
    </div>
  );
}
