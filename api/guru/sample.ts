/**
 * GET /api/guru/sample
 * Retorna 1 transaction completa + lista de todos os keys
 * para entender a estrutura da resposta da Guru.
 */
import type { RequestLike, ResponseLike } from './client.js';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

function walkKeys(obj: unknown, prefix = '', out: string[] = []): string[] {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    if (obj[0] !== undefined) walkKeys(obj[0], `${prefix}[0]`, out);
    return out;
  }
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(path);
    walkKeys((obj as Record<string, unknown>)[k], path, out);
  }
  return out;
}

export default async function handler(_req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) return res.status(500).json({ error: 'GURU_API_TOKEN não configurada' });

    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const url = `${BASE}/transactions?per_page=1&ordered_at_ini=${start}&ordered_at_end=${end}`;

    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `Guru ${r.status}`, body: t.slice(0, 500) });
    }

    const json = await r.json();
    const first = json?.data?.[0] ?? json?.[0] ?? null;
    const allKeys = first ? walkKeys(first) : [];

    return res.status(200).json({
      requestedUrl: url,
      hasData: !!first,
      allKeys: allKeys.sort(),
      sample: first,
    });
  } catch (err) {
    const e = err as Error;
    return res.status(500).json({ error: e.message, name: e.name });
  }
}
