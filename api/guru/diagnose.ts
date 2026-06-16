/**
 * GET /api/guru/diagnose
 *
 * Testa quais endpoints/auth modes funcionam contra a API Guru.
 * Roda só uma vez pra confirmar o setup. Não cachear.
 */
import {
  GURU_BASE_URL,
  isConfigured,
  type RequestLike,
  type ResponseLike,
  type AuthMode,
} from './_client';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const ALL_MODES: AuthMode[] = ['bearer', 'raw', 'apikey'];

function headersFor(mode: AuthMode): Record<string, string> {
  const base = { Accept: 'application/json' };
  switch (mode) {
    case 'bearer':
      return { ...base, Authorization: `Bearer ${TOKEN}` };
    case 'raw':
      return { ...base, Authorization: TOKEN };
    case 'apikey':
      return { ...base, apikey: TOKEN };
  }
}

export default async function handler(_req: RequestLike, res: ResponseLike) {
  if (!isConfigured()) {
    return res.status(500).json({
      error: 'GURU_API_TOKEN não configurada',
      hint: 'Adicione a env var no Vercel e redeploy',
    });
  }

  const candidatePaths = [
    '/transactions?per_page=1',
    '/transaction?per_page=1',
    '/sales?per_page=1',
    '/contacts?per_page=1',
    '/subscriptions?per_page=1',
  ];

  const results: Array<{
    path: string;
    mode: AuthMode;
    status: number;
    ok: boolean;
    bodyPreview: string;
    contentType: string;
  }> = [];

  for (const path of candidatePaths) {
    for (const mode of ALL_MODES) {
      try {
        const res2 = await fetch(`${GURU_BASE_URL}${path}`, {
          method: 'GET',
          headers: headersFor(mode),
          signal: AbortSignal.timeout(10000),
        });
        const text = await res2.text();
        results.push({
          path,
          mode,
          status: res2.status,
          ok: res2.ok,
          bodyPreview: text.slice(0, 200),
          contentType: res2.headers.get('content-type') ?? '',
        });
        // se OK nesse path, pula os outros modos pra economizar
        if (res2.ok) break;
      } catch (err) {
        results.push({
          path,
          mode,
          status: 0,
          ok: false,
          bodyPreview: `network error: ${(err as Error).message}`,
          contentType: '',
        });
      }
    }
  }

  const working = results.filter((r) => r.ok);

  return res.status(200).json({
    baseUrl: GURU_BASE_URL,
    tokenLength: TOKEN.length,
    tokenPreview: TOKEN.slice(0, 6) + '...' + TOKEN.slice(-4),
    working,
    allResults: results,
    next:
      working.length === 0
        ? 'Nenhum endpoint funcionou. Verifique o token e a URL base.'
        : `Use mode=${working[0].mode} no path=${working[0].path}`,
  });
}
