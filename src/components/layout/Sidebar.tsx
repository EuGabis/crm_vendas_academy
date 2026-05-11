import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  LayoutGrid,
  TrendingUp,
  Users,
  Target,
  Trophy,
  Gift,
  ClipboardCheck,
  Megaphone,
  Headphones,
  Package,
  Settings,
  Building2,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type LeafItem = {
  type: 'leaf';
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type GroupItem = {
  type: 'group';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  comingSoon?: boolean;
  children: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
};

type NavItem = LeafItem | GroupItem;

const NAV: NavItem[] = [
  { type: 'leaf', to: '/receita', label: 'Receita', icon: LayoutGrid },
  {
    type: 'group',
    label: 'Vendas',
    icon: TrendingUp,
    defaultOpen: true,
    children: [
      { to: '/vendas/funil', label: 'Funil de Vendas', icon: TrendingUp },
      { to: '/vendas/dashboard-times', label: 'Dashboard Times', icon: Users },
      { to: '/vendas/metas-times', label: 'Metas de Times', icon: Target },
      { to: '/vendas/ranking', label: 'Ranking Vendedores', icon: Trophy },
      { to: '/vendas/bonus', label: 'Bônus Comercial', icon: Gift },
      { to: '/vendas/avaliacao-closers', label: 'Avaliação Closers', icon: ClipboardCheck },
    ],
  },
  {
    type: 'group',
    label: 'Marketing',
    icon: Megaphone,
    children: [
      { to: '/marketing/trafego', label: 'Tráfego e CAC', icon: TrendingUp },
    ],
  },
  {
    type: 'group',
    label: 'CS',
    icon: Headphones,
    children: [{ to: '/cs/overview', label: 'Overview', icon: LayoutGrid }],
  },
  {
    type: 'group',
    label: 'Produto',
    icon: Package,
    comingSoon: true,
    children: [],
  },
  {
    type: 'group',
    label: 'Configurações',
    icon: Settings,
    children: [{ to: '/configuracoes/geral', label: 'Geral', icon: Settings }],
  },
  { type: 'leaf', to: '/workspace', label: 'Workspace', icon: Building2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of NAV) {
      if (item.type === 'group') {
        const hasActiveChild = item.children.some((c) => location.pathname.startsWith(c.to));
        init[item.label] = item.defaultOpen || hasActiveChild;
      }
    }
    return init;
  });

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl transition-all duration-200',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-between gap-2 px-4 border-b border-zinc-900/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white text-sm font-black tracking-tight shadow-glow">
            L
          </div>
          {!collapsed && (
            <div className="leading-tight overflow-hidden">
              <div className="text-[11px] font-bold tracking-[0.28em] text-zinc-100">
                LITO ACADEMY
              </div>
              <div className="section-title">Vendas · Plataforma de Dados</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          aria-label="Recolher menu"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) =>
          item.type === 'leaf' ? (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn('nav-pill', isActive && 'nav-pill-active', collapsed && 'justify-center px-2')
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ) : (
            <div key={item.label}>
              <button
                onClick={() =>
                  !item.comingSoon &&
                  setOpen((o) => ({ ...o, [item.label]: !o[item.label] }))
                }
                disabled={item.comingSoon}
                className={cn(
                  'nav-pill w-full justify-between',
                  collapsed && 'justify-center px-2',
                  item.comingSoon && 'opacity-50 cursor-not-allowed',
                )}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!collapsed && (
                  <span className="flex items-center gap-2">
                    {item.comingSoon && <Badge variant="muted">Em breve</Badge>}
                    {!item.comingSoon && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          open[item.label] && 'rotate-180',
                        )}
                      />
                    )}
                  </span>
                )}
              </button>
              {!collapsed && open[item.label] && !item.comingSoon && (
                <div className="ml-3 mt-1 pl-4 space-y-1 border-l border-zinc-800/80">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        cn('nav-pill !py-1.5 text-[13px]', isActive && 'nav-pill-active')
                      }
                    >
                      <child.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-zinc-900/80 p-4">
          <div className="rounded-xl bg-zinc-900/60 p-3 text-[11px] text-zinc-500">
            v0.1.0 · {import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'Supabase' : 'Mock data'}
          </div>
        </div>
      )}
    </aside>
  );
}
