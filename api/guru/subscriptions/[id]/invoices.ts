/**
 * GET /api/guru/subscriptions/[id]/invoices
 * Lista as faturas (invoices/cobrancas) de uma assinatura.
 */
import type { RequestLike, ResponseLike } from '../../client.js';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) return res.status(500).json({ error: 'no token' });
    const q = req.query ?? {};
    const id = typeof q.id === 'string' ? q.id : Array.isArray(q.id) ? q.id[0] : '';
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });

    const r = await fetch(`${BASE}/subscriptions/${encodeURIComponent(id)}/invoices`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      // Se a Guru retornar 404 pra esse path, devolve lista vazia ao inves
      // de erro pra UI nao quebrar.
      if (r.status === 404) {
        return res.status(200).json({ data: [], note: 'endpoint nao disponivel' });
      }
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
