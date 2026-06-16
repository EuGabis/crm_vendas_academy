import { guruGet, type RequestLike, type ResponseLike } from './client';

export default async function handler(req: RequestLike, res: ResponseLike) {
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

    const data = await guruGet<unknown>('/contacts', qp);
    try {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    } catch {
      /* noop */
    }
    return res.status(200).json(data);
  } catch (err) {
    const e = err as Error;
    console.error('[contacts handler]', e.message, e.stack);
    return res.status(500).json({ error: e.message ?? 'Unknown', name: e.name });
  }
}
