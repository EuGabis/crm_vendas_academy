/**
 * GET /api/guru/subscriptions/[id]
 * Busca 1 assinatura específica da Guru.
 */
import type { RequestLike, ResponseLike } from '../client';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) return res.status(500).json({ error: 'no token' });
    const q = req.query ?? {};
    const id = typeof q.id === 'string' ? q.id : Array.isArray(q.id) ? q.id[0] : '';
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });

    const r = await fetch(`${BASE}/subscriptions/${encodeURIComponent(id)}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({
        error: `Guru ${r.status}`,
        body: text.slice(0, 500),
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
    return res.status(500).json({ error: (err as Error).message });
  }
}
