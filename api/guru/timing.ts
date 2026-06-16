/**
 * GET /api/guru/timing?per_page=N&days=D
 *
 * Mede quanto a Guru demora pra responder com N transactions
 * de D dias atrás. Retorna sempre 200 com info, mesmo em erro.
 */
import { GURU_BASE_URL, type RequestLike, type ResponseLike } from './client';

const TOKEN = process.env.GURU_API_TOKEN ?? '';

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    const q = req.query ?? {};
    const perPage = String(q.per_page ?? '50');
    const days = Number(q.days ?? 7);

    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const url = `${GURU_BASE_URL}/transactions?per_page=${perPage}&ordered_at_ini=${start}&ordered_at_end=${end}`;

    const startedAt = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8500);

    let fetchMs = 0;
    let jsonMs = 0;
    let status = 0;
    let dataLen = 0;
    let error: string | null = null;

    try {
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
        },
        signal: ctrl.signal,
      });
      fetchMs = Date.now() - startedAt;
      status = r.status;
      const jsonStart = Date.now();
      const json = await r.json();
      jsonMs = Date.now() - jsonStart;
      dataLen = Array.isArray(json?.data) ? json.data.length : 0;
    } catch (err) {
      error = `${(err as Error).name}: ${(err as Error).message}`;
    } finally {
      clearTimeout(timer);
    }

    return res.status(200).json({
      requestedUrl: url,
      perPage,
      days,
      timing: {
        fetchMs,
        jsonParseMs: jsonMs,
        totalMs: Date.now() - startedAt,
      },
      response: { status, dataItemsCount: dataLen },
      error,
    });
  } catch (err) {
    return res.status(200).json({
      caughtError: true,
      message: (err as Error).message,
    });
  }
}
