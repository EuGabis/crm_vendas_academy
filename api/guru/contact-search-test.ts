/**
 * GET /api/guru/contact-search-test?q=Gabriel
 *
 * Testa qual param a Guru aceita pra filtrar contatos:
 * search, q, keyword, name, contact, contact_name, fullname...
 * Retorna pra cada um se filtrou (total < total geral) ou se ignorou.
 */
import type { RequestLike, ResponseLike } from './client.js';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

const PARAMS_TO_TEST = [
  'search',
  'q',
  'keyword',
  'name',
  'fullname',
  'contact_name',
  'contact',
  'filter',
  'term',
];

async function tryParam(param: string, value: string) {
  const url = `${BASE}/contacts?per_page=3&${param}=${encodeURIComponent(value)}`;
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      signal: AbortSignal.timeout(4000),
    });
    const text = await r.text();
    let names: string[] = [];
    let total: number | null = null;
    try {
      const json = JSON.parse(text);
      const data = json?.data ?? json ?? [];
      names = Array.isArray(data)
        ? data.slice(0, 3).map((c: { name?: string }) => c.name ?? 'sem nome')
        : [];
      total = json?.meta?.total ?? json?.total ?? null;
    } catch {
      /* noop */
    }
    return {
      param,
      status: r.status,
      ok: r.ok,
      sample: names,
      total,
      matches: names.filter((n) => n?.toLowerCase().includes(value.toLowerCase())).length,
    };
  } catch (err) {
    return {
      param,
      status: 0,
      ok: false,
      sample: [],
      total: null,
      matches: 0,
      error: (err as Error).message,
    };
  }
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (!TOKEN) return res.status(500).json({ error: 'no token' });
    const q = String(req.query?.q ?? 'Gabriel');

    // Teste de baseline sem filtro
    const baselineUrl = `${BASE}/contacts?per_page=3`;
    let baselineNames: string[] = [];
    try {
      const r = await fetch(baselineUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        signal: AbortSignal.timeout(4000),
      });
      const json = await r.json();
      const data = json?.data ?? json ?? [];
      baselineNames = Array.isArray(data)
        ? data.slice(0, 3).map((c: { name?: string }) => c.name ?? '')
        : [];
    } catch {
      /* noop */
    }

    // Testa cada param em paralelo (rápido)
    const results = await Promise.all(PARAMS_TO_TEST.map((p) => tryParam(p, q)));

    // Considera "funcionou" se retorna nomes diferentes do baseline E contém o termo
    const baselineKey = baselineNames.join('|');
    const working = results.filter((r) => {
      if (!r.ok) return false;
      const k = r.sample.join('|');
      if (k === baselineKey) return false; // ignorou o filtro
      return r.matches > 0;
    });

    return res.status(200).json({
      query: q,
      baseline: baselineNames,
      working: working.map((w) => w.param),
      bestMatch: working[0]?.param ?? null,
      allResults: results,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
