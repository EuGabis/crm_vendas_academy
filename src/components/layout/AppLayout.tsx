import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { RouteTransition } from './RouteTransition';
import { useSwipeNav } from '@/hooks/useSwipeNav';

export function AppLayout() {
  useSwipeNav();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar desktop (>= lg) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Bottom nav mobile (< lg) */}
      <MobileBottomNav />

      <main className="lg:pl-64 transition-all pb-20 lg:pb-0">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          }
        >
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </Suspense>
      </main>
    </div>
  );
}
