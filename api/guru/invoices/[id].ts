/**
 * GET /api/guru/invoices/[id]?subscription_id=...
 *
 * Busca 1 fatura especifica da Guru. A Guru tem dois IDs por invoice:
 * um codigo legivel "in_xxx" (que o painel usa) e um UUID interno. A API
 * single de invoice pode nao aceitar todos os formatos, entao a estrategia:
 *
 *   1. tenta /invoices/{id}
 *   2. se nao tiver ou der 404 e tivermos subscription_id, busca a LISTA
 *      /subscriptions/{sub}/invoices e filtra por id/code matching
 *
 * Isso garante que sempre encontramos a fatura quando ela aparece na lista.
 */
import type { RequestLike, ResponseLike } from '../client.js';

const TOKEN = process.env.GURU_API_TOKEN ?? '';
const BASE = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';

async function tryFetch(url: string) {
  return fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    signal: AbortSignal.timeout(8000),
  });
}

function matchesId(inv: Record<string, unknown>, id: string): boolean {
  const candidates = [
    inv.id,
    inv.code,
    inv.invoice_id,
    inv.invoice_code,
  ].map((v) => (v == null ? '' : String(v)));
  return candidates.includes(id);
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

    // 1a tentativa: GET /invoices/{id}
    let r = await tryFetch(`${BASE}/invoices/${encodeURIComponent(id)}`);

    if (r.ok) {
      const data = await r.json();
      try {
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      } catch {
        /* noop */
      }
      return res.status(200).json(data);
    }

    // 2a tentativa: buscar na lista da assinatura e filtrar
    if (subHint) {
      const listR = await tryFetch(
        `${BASE}/subscriptions/${encodeURIComponent(subHint)}/invoices`,
      );
      if (listR.ok) {
        const listJson = (await listR.json()) as
          | { data?: Array<Record<string, unknown>> }
          | Array<Record<string, unknown>>;
        const arr = Array.isArray(listJson) ? listJson : (listJson.data ?? []);
        const found = arr.find((it) => matchesId(it, id));
        if (found) {
          try {
            res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
          } catch {
            /* noop */
          }
          return res.status(200).json(found);
        }
      }
    }

    // se chegou aqui, devolve o erro original
    const text = await r.text().catch(() => '');
    return res.status(r.status).json({
      error: `Guru ${r.status}`,
      body: text.slice(0, 500),
      hint: subHint
        ? 'tentou na lista da assinatura mas nao achou esse id'
        : 'passe ?subscription_id=... pra tentar fallback na lista',
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
