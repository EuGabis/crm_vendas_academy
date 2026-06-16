/**
 * GET /api/guru/transactions
 *
 * Query params (passa direto pra Guru):
 *   - per_page, page
 *   - ordered_at_ini, ordered_at_end (YYYY-MM-DD)
 *   - status (paid | refused | refunded | etc)
 *   - search (busca por nome/email/CPF)
 *   - product_id
 */
import { guruGet, setCacheHeaders, type RequestLike, type ResponseLike } from './_client';

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const qp: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (typeof v === 'string') qp[k] = v;
      else if (Array.isArray(v) && v[0]) qp[k] = v[0];
    }
    // Defaults
    if (!qp.per_page) qp.per_page = '50';

    const data = await guruGet<unknown>('/transactions', qp);
    setCacheHeaders(res, 300); // 5 min CDN cache
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: (err as Error).message,
      hint: 'Tente GET /api/guru/diagnose para identificar o esquema correto',
    });
  }
}
