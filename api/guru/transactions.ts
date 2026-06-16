/**
 * GET /api/guru/transactions
 *
 * Query params (passa direto pra Guru):
 *   - per_page, page
 *   - ordered_at_ini, ordered_at_end  (YYYY-MM-DD) — obrigatório (ou outro filtro)
 *   - status, contact_id, product_id, etc
 *
 * Se não vier filtro de data, aplica padrão (últimos 30 dias).
 */
import {
  guruGet,
  defaultDateRange,
  type RequestLike,
  type ResponseLike,
} from './_client';

export default async function handler(req: RequestLike, res: ResponseLike) {
  // Top-level try/catch garantindo JSON sempre — nunca crashes
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const qp: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (typeof v === 'string') qp[k] = v;
      else if (Array.isArray(v) && v[0]) qp[k] = v[0];
    }

    if (!qp.per_page) qp.per_page = '50';

    const hasRequiredFilter =
      qp.ordered_at_ini ||
      qp.confirmed_at_ini ||
      qp.cancelled_at_ini ||
      qp.contact_id ||
      qp.subscription_id ||
      qp.invoice_id ||
      qp.id;

    if (!hasRequiredFilter) {
      const days = Number(qp.days ?? '30');
      Object.assign(qp, defaultDateRange(days));
      delete qp.days;
    }

    const data = await guruGet<unknown>('/transactions', qp);

    try {
      res.setHeader(
        'Cache-Control',
        's-maxage=300, stale-while-revalidate=600',
      );
    } catch {
      // ignora se já enviou headers
    }

    return res.status(200).json(data);
  } catch (err) {
    const e = err as Error;
    console.error('[transactions handler] erro:', e.message, e.stack);
    try {
      return res.status(500).json({
        error: e.message ?? 'Unknown error',
        name: e.name ?? 'Error',
      });
    } catch {
      // se nem o response funciona, simplesmente engole pra evitar crash
      return;
    }
  }
}
