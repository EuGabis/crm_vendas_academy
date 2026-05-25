import { NavLink, Outlet } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Palette,
  Bell,
  Building2,
  Database,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface SubNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  adminOnly?: boolean;
  group: 'pessoal' | 'organizacao' | 'sistema';
}

const ITEMS: SubNavItem[] = [
  {
    to: '/configuracoes/perfil',
    label: 'Perfil',
    icon: User,
    description: 'Nome, email e avatar',
    group: 'pessoal',
  },
  {
    to: '/configuracoes/seguranca',
    label: 'Segurança',
    icon: ShieldCheck,
    description: 'Senha e sessão',
    group: 'pessoal',
  },
  {
    to: '/configuracoes/aparencia',
    label: 'Aparência',
    icon: Palette,
    description: 'Tema e densidade',
    group: 'pessoal',
  },
  {
    to: '/configuracoes/notificacoes',
    label: 'Notificações',
    icon: Bell,
    description: 'Preferências de alertas',
    group: 'pessoal',
  },
  {
    to: '/configuracoes/empresa',
    label: 'Empresa',
    icon: Building2,
    description: 'Razão social, CNPJ e logo',
    adminOnly: true,
    group: 'organizacao',
  },
  {
    to: '/configuracoes/dados',
    label: 'Dados',
    icon: Database,
    description: 'Exportar e gerenciar',
    adminOnly: true,
    group: 'organizacao',
  },
  {
    to: '/configuracoes/sobre',
    label: 'Sobre',
    icon: Info,
    description: 'Versão e suporte',
    group: 'sistema',
  },
];

const GROUP_LABEL: Record<SubNavItem['group'], string> = {
  pessoal: 'Pessoal',
  organizacao: 'Organização',
  sistema: 'Sistema',
};

export function ConfiguracoesLayout() {
  const { isAdmin } = useAuth();
  const visible = ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const grouped: Record<SubNavItem['group'], SubNavItem[]> = {
    pessoal: [],
    organizacao: [],
    sistema: [],
  };
  for (const item of visible) grouped[item.group].push(item);

  return (
    <>
      <Header title="Configurações" subtitle="Personalize a plataforma para você e sua equipe" />

      {/* Mobile/tablet: tabs horizontais com scroll */}
      <div className="lg:hidden border-b border-zinc-900/80 bg-zinc-950/50 sticky top-[57px] sm:top-[65px] z-10 backdrop-blur-xl">
        <div className="overflow-x-auto scrollbar-hide">
          <nav className="flex items-center gap-1 px-4 sm:px-6 py-2 w-max">
            {visible.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60',
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Sub-sidebar — só desktop */}
          <aside className="w-64 shrink-0 sticky top-24 self-start hidden lg:block">
            <nav className="space-y-5">
              {(Object.entries(grouped) as [SubNavItem['group'], SubNavItem[]][]).map(
                ([group, items]) =>
                  items.length === 0 ? null : (
                    <div key={group}>
                      <p className="section-title mb-2 px-3">{GROUP_LABEL[group]}</p>
                      <div className="space-y-0.5">
                        {items.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                              cn(
                                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                                isActive
                                  ? 'bg-zinc-900/80 text-white border border-zinc-800'
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50',
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <item.icon
                                  className={cn(
                                    'h-4 w-4 shrink-0',
                                    isActive ? 'text-brand-400' : 'text-zinc-500',
                                  )}
                                />
                                <div className="flex-1 leading-tight">
                                  <div className="font-medium">{item.label}</div>
                                  <div className="text-[10px] text-zinc-600 mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                                <ChevronRight
                                  className={cn(
                                    'h-3.5 w-3.5 shrink-0 transition-opacity',
                                    isActive
                                      ? 'opacity-100 text-brand-400'
                                      : 'opacity-0 group-hover:opacity-50',
                                  )}
                                />
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ),
              )}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}

// Helper components reused across settings pages
import { Card } from '@/components/ui/card';

export function SettingsSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-6 border-b border-zinc-800/80">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </Card>
  );
}

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 max-w-md w-full sm:w-auto">{children}</div>
    </div>
  );
}
