import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Anima a transicao entre rotas com slide horizontal (estilo app nativo iOS).
 * Direcao inferida via history.state — se o usuario voltou (POP), slida
 * pra direita; se avancou (PUSH/REPLACE), slida pra esquerda.
 *
 * So aplica em mobile (< lg). No desktop nao anima pra nao distrair.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const lastPath = useRef(location.pathname);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    if (location.pathname === lastPath.current) return;

    // Determina direcao pelo tipo de navegacao
    const historyAction = (window.history.state as { idx?: number } | null)?.idx;
    const direction: 'forward' | 'back' = historyAction != null && historyAction < 0 ? 'back' : 'forward';

    // Remove classes anteriores + re-triggera animacao
    el.classList.remove('route-slide-in-r', 'route-slide-in-l');
    // reflow trick pra reiniciar animacao
    void el.offsetWidth;
    el.classList.add(direction === 'forward' ? 'route-slide-in-r' : 'route-slide-in-l');

    lastPath.current = location.pathname;
  }, [location.pathname]);

  return (
    <div ref={ref} key={location.pathname} className="route-slide-in-r">
      {children}
    </div>
  );
}
