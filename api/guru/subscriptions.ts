/**
 * GET /api/guru/subscriptions
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
    if (getStr('status')) params.set('status', getStr('status')!);
    if (getStr('contact_id')) params.set('contact_id', getStr('contact_id')!);
    if (getStr('product_id')) params.set('product_id', getStr('product_id')!);

    // Subscriptions tambem pode exigir filtro de data; aplicar started_at_ini
    const days = Number(getStr('days') ?? '365');
    if (!params.has('started_at_ini') && !params.has('contact_id')) {
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      params.set('started_at_ini', start);
      params.set('started_at_end', end);
    }

    const url = `${BASE}/subscriptions?${params.toString()}`;

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
