/**
 * GET /api/guru/invoices/[id]
 * Busca 1 fatura especifica da Guru.
 *
 * Tenta /invoices/{id}. Se 404, tenta /subscriptions/{sub}/invoices/{id}
 * caso ?subscription_id seja passado como hint.
 */
import type { RequestLike, ResponseLike } from '../client.js';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

async function tryFetch(url: string) {
  const r = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    signal: AbortSignal.timeout(8000),
  });
  return r;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) return res.status(500).json({ error: 'no token' });
    const q = req.query ?? {};
    const id = typeof q.id === 'string' ? q.id : Array.isArray(q.id) ? q.id[0] : '';
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });

    const subHint =
      typeof q.subscription_id === 'string'
        ? q.subscription_id
        : Array.isArray(q.subscription_id)
          ? q.subscription_id[0]
          : '';

    // 1a tentativa: /invoices/{id}
    let r = await tryFetch(`${BASE}/invoices/${encodeURIComponent(id)}`);

    // 2a tentativa caso 404 e tenhamos sub_id: /subscriptions/{sub}/invoices/{id}
    if (r.status === 404 && subHint) {
      r = await tryFetch(
        `${BASE}/subscriptions/${encodeURIComponent(subHint)}/invoices/${encodeURIComponent(id)}`,
      );
    }

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
