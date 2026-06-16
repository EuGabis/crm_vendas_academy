/**
 * Cliente compartilhado para chamar a API da DigitalManager Guru.
 *
 * Auth: Bearer token (confirmado via /api/guru/diagnose).
 * Token vem da env GURU_API_TOKEN.
 *
 * Endpoints conhecidos:
 *   GET /transactions   — exige filtro: ordered_at_ini, confirmed_at_ini, cancelled_at_ini OU id
 *   GET /subscriptions  — paginado
 *   GET /contacts       — busca por nome/email/CPF
 *
 * Rate limit: 360 req/hora.
 */

export const GURU_BASE_URL =
  process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

const TOKEN = process.env.GURU_API_TOKEN ?? '';

export type AuthMode = 'bearer' | 'raw' | 'apikey';

export function isConfigured() {
  return TOKEN.length > 0;
}

export async function guruGet<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
  options?: { timeoutMs?: number },
): Promise<T> {
  if (!TOKEN) {
    throw new Error(
      'GURU_API_TOKEN não configurada. Adicione a env var no Vercel e redeploy.',
    );
  }

  const url = new URL(`${GURU_BASE_URL}${path}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const timeoutMs = options?.timeoutMs ?? 9000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Guru API ${res.status} em ${path}: ${body.slice(0, 400)}`,
      );
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calcula filtro padrão de data pra endpoints que exigem.
 * Default: últimos 30 dias.
 */
export function defaultDateRange(days = 30) {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { ordered_at_ini: start, ordered_at_end: end };
}

// ============================================================================
// Tipos de Request/Response Vercel
// ============================================================================
export interface RequestLike {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

export interface ResponseLike {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export function setCacheHeaders(res: ResponseLike, seconds = 300) {
  res.setHeader(
    'Cache-Control',
    `s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`,
  );
}
