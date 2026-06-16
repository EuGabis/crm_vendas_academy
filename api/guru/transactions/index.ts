/**
 * GET /api/guru/transactions
 *
 * Espelha exatamente o /api/guru/raw que funcionou.
 * Mesmo fetch, mesmas headers, mesmo padrão.
 */
import type { RequestLike, ResponseLike } from '../client';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) {
      return res
        .status(500)
        .json({ error: 'GURU_API_TOKEN não configurada no Vercel' });
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const q = req.query ?? {};
    const getStr = (k: string) => {
      const v = q[k];
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) return v[0];
      return undefined;
    };

    // Constrói query string
    const params = new URLSearchParams();
    params.set('per_page', getStr('per_page') ?? '50');

    if (getStr('page')) params.set('page', getStr('page')!);

    // Filtros — passa qualquer um que vier
    const passThrough = [
      'ordered_at_ini',
      'ordered_at_end',
      'confirmed_at_ini',
      'confirmed_at_end',
      'cancelled_at_ini',
      'cancelled_at_end',
      'status',
      'contact_id',
      'product_id',
      'subscription_id',
      'invoice_id',
    ];
    for (const k of passThrough) {
      const v = getStr(k);
      if (v) params.set(k, v);
    }

    // Se não veio nenhum filtro obrigatório, aplica últimos 14 dias
    const hasReq =
      params.has('ordered_at_ini') ||
      params.has('confirmed_at_ini') ||
      params.has('cancelled_at_ini') ||
      params.has('contact_id') ||
      params.has('subscription_id') ||
      params.has('invoice_id');

    if (!hasReq) {
      const days = Number(getStr('days') ?? '14');
      const end = isoDate(new Date());
      const start = isoDate(new Date(Date.now() - days * 86400000));
      params.set('ordered_at_ini', start);
      params.set('ordered_at_end', end);
    }

    const url = `${BASE}/transactions?${params.toString()}`;

    // Fetch direto (formato exato do raw.ts que funcionou)
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
      isAbort: e.name === 'AbortError' || e.name === 'TimeoutError',
    });
  }
}
