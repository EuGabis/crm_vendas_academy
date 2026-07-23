import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Headphones,
  Building2,
  MoreHorizontal,
  X,
  LayoutGrid,
  Users,
  Target,
  Trophy,
  Gift,
  ClipboardCheck,
  Megaphone,
  Settings,
  BookOpen,
  Receipt,
  ShoppingBag,
  Repeat,
  UserPlus,
  RefreshCw,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface TabDef {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix: string; // rota base pra saber se está "ativa" (mesmo em sub-rotas)
}

const TABS: TabDef[] = [
  { to: '/vendas/dashboard-times', label: 'Vendas', icon: TrendingUp, matchPrefix: '/vendas' },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign, matchPrefix: '/financeiro' },
  { to: '/cs/overview', label: 'CS', icon: Headphones, matchPrefix: '/cs' },
  { to: '/workspace', label: 'Workspace', icon: Building2, matchPrefix: '/workspace' },
];

interface DrawerLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const DRAWER_SECTIONS: Array<{ title: string; links: DrawerLink[] }> = [
  {
    title: 'Vendas',
    links: [
      { to: '/vendas/dashboard-times', label: 'Dashboard Times', icon: Users },
      { to: '/vendas/funil', label: 'Funil de Vendas', icon: TrendingUp },
      { to: '/vendas/metas-times', label: 'Metas de Times', icon: Target },
      { to: '/vendas/ranking', label: 'Ranking Vendedores', icon: Trophy },
      { to: '/vendas/bonus', label: 'Bônus Comercial', icon: Gift },
      { to: '/vendas/avaliacao-closers', label: 'Avaliação Closers', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Financeiro',
    links: [
      { to: '/financeiro', label: 'Dashboard', icon: LayoutGrid, adminOnly: true },
      { to: '/financeiro/vendas', label: 'Vendas', icon: Receipt, adminOnly: true },
      { to: '/financeiro/assinaturas', label: 'Assinaturas', icon: Repeat, adminOnly: true },
      { to: '/financeiro/contatos', label: 'Contatos', icon: Users, adminOnly: true },
    ],
  },
  {
    title: 'CS',
    links: [
      { to: '/cs/overview', label: 'Dashboard', icon: LayoutGrid },
      { to: '/cs/alunos', label: 'Alunos', icon: Users },
      { to: '/cs/tickets', label: 'Tickets', icon: ClipboardCheck },
      { to: '/cs/renovacoes', label: 'Renovações', icon: TrendingUp },
      { to: '/cs/nps', label: 'NPS', icon: Trophy },
    ],
  },
  {
    title: 'Marketing',
    links: [
      { to: '/marketing/trafego', label: 'Tráfego e CAC', icon: Megaphone },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { to: '/workspace', label: 'Meu Dia', icon: LayoutGrid },
      { to: '/workspace/tarefas', label: 'Tarefas', icon: ClipboardCheck },
      { to: '/workspace/materiais', label: 'Materiais', icon: Package },
    ],
  },
  {
    title: 'Administração',
    links: [
      { to: '/admin/vendedores', label: 'Vendedores', icon: Users, adminOnly: true },
      { to: '/admin/cursos', label: 'Cursos', icon: BookOpen, adminOnly: true },
      { to: '/admin/vendas', label: 'Registrar Vendas', icon: Receipt, adminOnly: true },
      { to: '/admin/leads', label: 'Leads', icon: ShoppingBag, adminOnly: true },
      { to: '/admin/metas', label: 'Metas Mensais', icon: Target, adminOnly: true },
      { to: '/admin/trafego', label: 'Gastos Tráfego', icon: Megaphone, adminOnly: true },
      { to: '/admin/usuarios', label: 'Usuários', icon: UserPlus, adminOnly: true },
      { to: '/admin/sincronizar', label: 'Sincronizar Planilha', icon: RefreshCw, adminOnly: true },
    ],
  },
  {
    title: 'Outros',
    links: [
      { to: '/receita', label: 'Receita', icon: LayoutGrid },
      { to: '/configuracoes/perfil', label: 'Configurações', icon: Settings },
    ],
  },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (matchPrefix: string) => {
    if (matchPrefix === '/financeiro') return location.pathname === '/financeiro' || location.pathname.startsWith('/financeiro/');
    return location.pathname.startsWith(matchPrefix);
  };

  const visibleTabs = TABS.filter((t) => {
    if (t.to.startsWith('/financeiro') && !isAdmin) return false;
    return true;
  });

  return (
    <>
      {/* Drawer "Mais" — full-screen sheet */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl bg-zinc-950 border-t border-zinc-800 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
              <span className="brand-wordmark text-lg">LITO ACADEMY</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-2 hover:bg-zinc-900 text-zinc-500 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-6 pb-8">
              {DRAWER_SECTIONS.map((section) => {
                const links = section.links.filter((l) => !l.adminOnly || isAdmin);
                if (links.length === 0) return null;
                return (
                  <div key={section.title}>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 px-2">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {links.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          onClick={() => setDrawerOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center transition-colors',
                              isActive
                                ? 'bg-brand-500/15 text-brand-200 ring-1 ring-brand-500/30'
                                : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900',
                            )
                          }
                        >
                          <link.icon className="h-5 w-5" />
                          <span className="text-[10px] leading-tight line-clamp-2">{link.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80',
          'bg-zinc-950/95 backdrop-blur-xl',
          'lg:hidden',
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <div className="grid grid-cols-5 h-16">
          {visibleTabs.map((tab) => {
            const active = isActive(tab.matchPrefix);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-brand-300' : 'text-zinc-500 active:text-zinc-300',
                )}
              >
                <tab.icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 bg-brand-500 rounded-b" />
                )}
              </NavLink>
            );
          })}
          {/* Mais */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-zinc-500 active:text-zinc-300 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
