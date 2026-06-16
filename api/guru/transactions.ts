/**
 * GET /api/guru/transactions
 *
 * Query params (passa direto pra Guru):
 *   - per_page, page
 *   - ordered_at_ini, ordered_at_end  (YYYY-MM-DD) — obrigatório (ou outro filtro)
 *   - confirmed_at_ini, confirmed_at_end
 *   - cancelled_at_ini, cancelled_at_end
 *   - status, contact_id, product_id, etc
 *
 * Se não vier filtro de data, aplica padrão (últimos 30 dias).
 */
import {
  guruGet,
  setCacheHeaders,
  defaultDateRange,
  type RequestLike,
  type ResponseLike,
} from './_client';

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

    // Aplica defaults
    if (!qp.per_page) qp.per_page = '50';

    // Se não veio nenhum filtro obrigatório, aplica últimos 30 dias
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
    setCacheHeaders(res, 300);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: (err as Error).message,
    });
  }
}
