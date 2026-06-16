/**
 * GET /api/guru/raw?path=/transactions&mode=bearer
 *
 * Faz UMA chamada simples na API Guru e retorna a resposta crua.
 * Pra debug — mais simples que o diagnose.
 *
 * Modes: bearer | raw | apikey
 */
import type { RequestLike, ResponseLike } from './_client';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) {
      return res
        .status(500)
        .json({ error: 'GURU_API_TOKEN não configurada' });
    }

    const q = req.query ?? {};
    const path =
      (typeof q.path === 'string' ? q.path : null) ?? '/transactions?per_page=1';
    const mode =
      (typeof q.mode === 'string' ? q.mode : null) ?? 'bearer';

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (mode === 'bearer') headers.Authorization = `Bearer ${TOKEN}`;
    else if (mode === 'raw') headers.Authorization = TOKEN;
    else if (mode === 'apikey') headers.apikey = TOKEN;
    else
      return res.status(400).json({
        error: 'mode inválido — use bearer, raw ou apikey',
      });

    const url = `${BASE}${path}`;
    const start = Date.now();

    const r = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000),
    });

    const elapsed = Date.now() - start;
    const contentType = r.headers.get('content-type') ?? '';
    const text = await r.text();

    let parsed: unknown = null;
    if (contentType.includes('json')) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    return res.status(200).json({
      requestedUrl: url,
      mode,
      tookMs: elapsed,
      response: {
        status: r.status,
        statusText: r.statusText,
        contentType,
        headers: Object.fromEntries(r.headers.entries?.() ?? []),
      },
      body: parsed ?? text.slice(0, 4000),
    });
  } catch (err) {
    return res.status(200).json({
      caughtError: true,
      message: (err as Error).message,
      name: (err as Error).name,
      stack: (err as Error).stack?.split('\n').slice(0, 8),
    });
  }
}
