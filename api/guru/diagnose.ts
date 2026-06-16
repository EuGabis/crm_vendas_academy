/**
 * GET /api/guru/diagnose
 *
 * Testa quais endpoints/auth modes funcionam contra a API Guru.
 * Otimizado pra rodar em <10s (limite Vercel Hobby).
 */
import {
  GURU_BASE_URL,
  isConfigured,
  type RequestLike,
  type ResponseLike,
  type AuthMode,
} from './client';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const ALL_MODES: AuthMode[] = ['bearer', 'raw', 'apikey'];
const PER_REQUEST_TIMEOUT_MS = 2500;

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

async function tryOne(path: string, mode: AuthMode) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GURU_BASE_URL}${path}`, {
      method: 'GET',
      headers: headersFor(mode),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => '');
    return {
      path,
      mode,
      status: res.status,
      ok: res.ok,
      bodyPreview: text.slice(0, 300),
      contentType: res.headers.get('content-type') ?? '',
    };
  } catch (err) {
    return {
      path,
      mode,
      status: 0,
      ok: false,
      bodyPreview: `error: ${(err as Error).message}`,
      contentType: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(_req: RequestLike, res: ResponseLike) {
  try {
    if (!isConfigured()) {
      return res.status(500).json({
        error: 'GURU_API_TOKEN não configurada',
        hint: 'Adicione a env var no Vercel e redeploy',
      });
    }

    // Tenta /transactions com os 3 modos (em paralelo pra ser rápido)
    const transactions = await Promise.all(
      ALL_MODES.map((m) => tryOne('/transactions?per_page=1', m)),
    );

    // Se algum funcionou, tenta os outros endpoints só com o mode que deu certo
    const workingMode = transactions.find((r) => r.ok)?.mode;
    let others: Awaited<ReturnType<typeof tryOne>>[] = [];
    if (workingMode) {
      others = await Promise.all([
        tryOne('/subscriptions?per_page=1', workingMode),
        tryOne('/contacts?per_page=1', workingMode),
      ]);
    }

    const allResults = [...transactions, ...others];
    const working = allResults.filter((r) => r.ok);

    return res.status(200).json({
      baseUrl: GURU_BASE_URL,
      tokenLength: TOKEN.length,
      tokenPreview: TOKEN.slice(0, 6) + '...' + TOKEN.slice(-4),
      detectedMode: workingMode ?? null,
      working,
      allResults,
      next: workingMode
        ? `Auth: ${workingMode}. ${working.length} endpoints OK.`
        : 'Nenhum modo funcionou — verifique o token na Guru',
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Diagnose crashed',
      message: (err as Error).message,
      stack: (err as Error).stack?.split('\n').slice(0, 5),
    });
  }
}
