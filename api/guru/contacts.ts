/**
 * GET /api/guru/contacts
 * Mesmo padrão simples do transactions.ts (sem guruGet).
 */
import type { RequestLike, ResponseLike } from './client';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) return res.status(500).json({ error: 'GURU_API_TOKEN não configurada' });
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const q = req.query ?? {};
    const getStr = (k: string) => {
      const v = q[k];
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) return v[0];
      return undefined;
    };

    const params = new URLSearchParams();
    params.set('per_page', getStr('per_page') ?? '50');
    if (getStr('page')) params.set('page', getStr('page')!);

    // A Guru pode usar `search` ou `q` ou `name`/`email`. Vou passar todos os que vierem.
    for (const k of ['search', 'q', 'name', 'email', 'doc', 'phone', 'created_at_ini', 'created_at_end']) {
      const v = getStr(k);
      if (v) params.set(k, v);
    }

    const url = `${BASE}/contacts?${params.toString()}`;

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({
        error: `Guru API ${r.status}`,
        body: text.slice(0, 500),
        url,
      });
    }

    const data = await r.json();
    try {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    } catch {
      /* noop */
    }
    return res.status(200).json(data);
  } catch (err) {
    const e = err as Error;
    return res.status(500).json({
      error: e.message ?? 'Unknown',
      name: e.name ?? 'Error',
    });
  }
}
