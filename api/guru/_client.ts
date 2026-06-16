/**
 * Cliente compartilhado para chamar a API da DigitalManager Guru.
 *
 * O token vem da env var GURU_API_TOKEN (server-side, nunca exposto).
 *
 * Suporta auto-detecção do esquema de autenticação:
 *   1. Authorization: Bearer <token>      (padrão tentado primeiro)
 *   2. Authorization: <token>             (alguns sistemas Brasil)
 *   3. apikey: <token>                    (alternativo)
 *
 * Se a env var GURU_AUTH_MODE estiver setada (bearer/raw/apikey),
 * pula a auto-detecção e usa direto.
 */

export const GURU_BASE_URL =
  process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

const TOKEN = process.env.GURU_API_TOKEN ?? '';

export type AuthMode = 'bearer' | 'raw' | 'apikey';

function headersFor(mode: AuthMode): Record<string, string> {
  const base = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  switch (mode) {
    case 'bearer':
      return { ...base, Authorization: `Bearer ${TOKEN}` };
    case 'raw':
      return { ...base, Authorization: TOKEN };
    case 'apikey':
      return { ...base, apikey: TOKEN };
  }
}

export function isConfigured() {
  return TOKEN.length > 0;
}

export async function guruGet<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
  options?: { authMode?: AuthMode; timeoutMs?: number },
): Promise<T> {
  if (!TOKEN) {
    throw new Error(
      'GURU_API_TOKEN não configurada. Adicione a env var no Vercel e redeploy.',
    );
  }

  // Monta URL com query params
  const url = new URL(`${GURU_BASE_URL}${path}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  // Modo configurado via env ou auto-tentativa
  const configuredMode = process.env.GURU_AUTH_MODE as AuthMode | undefined;
  const modesToTry: AuthMode[] = configuredMode
    ? [configuredMode]
    : ['bearer', 'raw', 'apikey'];

  const timeoutMs = options?.timeoutMs ?? 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let lastError: { status: number; body: string; mode: AuthMode } | null = null;

    for (const mode of options?.authMode ? [options.authMode] : modesToTry) {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: headersFor(mode),
        signal: controller.signal,
      });

      // 401/403 → tenta próximo modo de auth
      if (res.status === 401 || res.status === 403) {
        lastError = {
          status: res.status,
          body: await res.text().catch(() => ''),
          mode,
        };
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `Guru API ${res.status} em ${path}: ${body.slice(0, 300)}`,
        );
      }

      // Sucesso — guarda qual modo funcionou (útil pra diagnose)
      return (await res.json()) as T;
    }

    // Nenhum modo funcionou
    throw new Error(
      `Guru API rejeitou todos os modos de auth tentados. Último: ${lastError?.status} (${lastError?.mode}): ${lastError?.body.slice(0, 200)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Helper genérico pra responses Vercel.
 */
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
