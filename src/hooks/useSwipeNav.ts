import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Mapa de rotas por modulo — swipe horizontal navega entre elas ciclicamente.
 */
const ROUTE_GROUPS: Record<string, string[]> = {
  '/vendas': [
    '/vendas/dashboard-times',
    '/vendas/funil',
    '/vendas/metas-times',
    '/vendas/ranking',
    '/vendas/bonus',
    '/vendas/avaliacao-closers',
  ],
  '/financeiro': [
    '/financeiro',
    '/financeiro/vendas',
    '/financeiro/assinaturas',
    '/financeiro/contatos',
  ],
  '/cs': ['/cs/overview', '/cs/alunos', '/cs/tickets', '/cs/renovacoes', '/cs/nps'],
  '/workspace': ['/workspace', '/workspace/tarefas', '/workspace/materiais'],
  '/admin': [
    '/admin/vendedores',
    '/admin/cursos',
    '/admin/vendas',
    '/admin/leads',
    '/admin/metas',
    '/admin/trafego',
    '/admin/usuarios',
    '/admin/sincronizar',
  ],
};

function findGroup(pathname: string): { group: string[]; index: number } | null {
  for (const routes of Object.values(ROUTE_GROUPS)) {
    const exact = routes.indexOf(pathname);
    if (exact !== -1) return { group: routes, index: exact };
    for (let i = 0; i < routes.length; i++) {
      if (pathname === routes[i] || pathname.startsWith(routes[i] + '/')) {
        return { group: routes, index: i };
      }
    }
  }
  return null;
}

/**
 * Elementos onde swipe NAO deve navegar (o gesto ali eh interno do componente).
 * Match por seletor CSS no elemento alvo do touchstart (ou qualquer ancestral).
 */
const SWIPE_BLOCKLIST = [
  'input',
  'textarea',
  'select',
  'table',
  'canvas',
  '[contenteditable="true"]',
  '[role="dialog"]',
  '[role="slider"]',
  '[data-no-swipe]',
  '.recharts-wrapper',
  '.overflow-x-auto',
];

function isBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return SWIPE_BLOCKLIST.some((sel) => target.closest(sel) !== null);
}

const MIN_DIST = 64;         // deltaX minimo
const MAX_TIME = 700;        // ms — swipe rapido
const H_TO_V_RATIO = 1.5;    // horizontal precisa ser 1.5× o vertical

/**
 * Swipe horizontal FULL-SCREEN pra navegar entre sub-rotas do modulo atual.
 * Ignora automaticamente inputs, tabelas, graficos, dialogs e areas com
 * scroll horizontal (que tem seu proprio gesto).
 */
export function useSwipeNav() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const group = findGroup(location.pathname);
    if (!group) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let active = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        active = false;
        return;
      }
      if (isBlocked(e.target)) {
        active = false;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      active = true;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active || !group) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      active = false;

      if (dt > MAX_TIME) return;
      if (Math.abs(dx) < MIN_DIST) return;
      if (Math.abs(dx) < Math.abs(dy) * H_TO_V_RATIO) return;

      const { group: routes, index } = group;
      if (dx < 0) {
        // Swipe pra esquerda → proxima
        const nextIndex = (index + 1) % routes.length;
        navigate(routes[nextIndex]);
      } else {
        // Swipe pra direita → anterior
        const prevIndex = (index - 1 + routes.length) % routes.length;
        navigate(routes[prevIndex]);
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [location.pathname, navigate]);
}
