import { useMemo } from 'react';
import { Bell, Search, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-20 bg-zinc-950/75 backdrop-blur-xl border-b border-zinc-900/80">
      <div className="flex items-center justify-between gap-4 px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input placeholder="Buscar..." className="h-9 pl-9 w-52" />
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
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
              <SelectTrigger className="w-48 h-9">
                <SelectValue>{currentLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={sellerId} onValueChange={(v) => setSeller(v)}>
            <SelectTrigger className="w-52 h-9">
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

          <Button size="icon" variant="outline" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800/60">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-brand-gradient text-white text-xs">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:flex flex-col leading-tight">
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
              className="h-9 w-9"
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
