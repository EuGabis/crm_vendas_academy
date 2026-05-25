import { useMemo } from 'react';
import {
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFilters } from '@/store/filters';
import { useUI } from '@/store/ui';
import { useSellers } from '@/hooks/useSupabaseData';
import { useAuth } from '@/lib/auth';
import { monthLabelPt } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { year, month, sellerId, setMonth, setSeller } = useFilters();
  const { data: sellers = [] } = useSellers();
  const { user, role, isAdmin, signOut } = useAuth();
  const { toggleMobileSidebar } = useUI();

  const months = useMemo(() => {
    const arr: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      arr.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabelPt(d) });
    }
    return arr;
  }, []);

  const currentLabel = monthLabelPt(new Date(year, month, 1));

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getFullYear(), d.getMonth());
  }

  const displayName = user?.email?.split('@')[0] ?? 'Usuário';

  return (
    <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900/80">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden -ml-2 shrink-0"
            onClick={toggleMobileSidebar}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden sm:block text-xs sm:text-sm text-zinc-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
          {/* Search — só desktop */}
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input placeholder="Buscar..." className="h-9 pl-9 w-44" />
          </div>

          {/* Month switcher: compacto em mobile */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:inline-flex"
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select
              value={`${year}-${month}`}
              onValueChange={(v) => {
                const [y, m] = v.split('-').map(Number);
                setMonth(y, m);
              }}
            >
              <SelectTrigger className="w-32 sm:w-40 lg:w-44 h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue>
                  <span className="capitalize">{currentLabel}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    <span className="capitalize">{m.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:inline-flex"
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Seller filter: só md+ */}
          <Select value={sellerId} onValueChange={(v) => setSeller(v)}>
            <SelectTrigger className="w-44 lg:w-48 h-8 sm:h-9 text-xs sm:text-sm hidden md:inline-flex">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bell: hide em mobile */}
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 sm:h-9 sm:w-9 relative hidden sm:inline-flex"
          >
            <Bell className="h-4 w-4" />
          </Button>

          {/* User */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-zinc-800/60">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              <AvatarFallback className="bg-brand-gradient text-white text-xs">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:flex flex-col leading-tight">
              <span className="text-xs font-medium text-zinc-200 capitalize">
                {displayName}
              </span>
              <Badge variant={isAdmin ? 'success' : 'muted'} className="text-[9px] mt-0.5">
                {isAdmin ? 'admin' : role}
              </Badge>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => signOut()}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
