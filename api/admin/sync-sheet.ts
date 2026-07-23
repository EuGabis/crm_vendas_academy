/**
 * POST /api/admin/sync-sheet
 * Sincroniza uma planilha Google publicada como CSV com public.sales.
 *
 * Fluxo:
 *  1. Valida que o caller eh admin (via profile.role)
 *  2. Le a URL da planilha (do body OU de app_settings.sheet_sync)
 *  3. Fetch do CSV → parse → normaliza
 *  4. Sincroniza sellers e courses (cria os que faltarem)
 *  5. Insert em batches em sales, dedupando por (client, valor, seller, data, course)
 *  6. Salva timestamp da ultima sync em app_settings.sheet_sync
 *  7. Retorna resumo do que aconteceu
 *
 * Body: { url?: string, save_url?: boolean }
 * Response: { inserted, skipped_dups, sellers_created, courses_created,
 *             source_rows, url_used, synced_at }
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

interface RequestLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface ResponseLike {
  status(n: number): ResponseLike;
  json(x: unknown): void;
  setHeader(k: string, v: string): void;
}

// ============================================================================
// CSV parser (RFC 4180 minimalista — trata aspas duplas e quebras dentro do campo)
// ============================================================================
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

// ============================================================================
// Normalização de campos
// ============================================================================
const PAYMENT_MAP: Record<string, string> = {
  'cartao de credito': 'CARTAO_PARCELADO',
  'cartão de crédito': 'CARTAO_PARCELADO',
  cartao: 'CARTAO_PARCELADO',
  cartão: 'CARTAO_PARCELADO',
  pix: 'PIX',
  'boleto bancario': 'BOLETO',
  'boleto bancário': 'BOLETO',
  boleto: 'BOLETO',
  avista: 'AVISTA',
  'à vista': 'AVISTA',
};

function normPayment(v: string): string {
  const key = (v ?? '').toLowerCase().trim();
  return PAYMENT_MAP[key] ?? 'PIX';
}

function parseNum(v: string): number | null {
  if (!v || !v.trim()) return null;
  const s = v.trim().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parsePoints(v: string): number | null {
  if (!v || !v.trim()) return null;
  const s = v.trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Data pode vir como "30/3", "30/03", "30/03/2026" ou vazia.
 * Se sem ano, usa o ano atual e ajusta pra passado se data futura.
 */
function parseDate(v: string, now = new Date()): string | null {
  if (!v || !v.trim()) return null;
  const s = v.trim();
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = m[3] ? Number(m[3]) : now.getFullYear();
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  if (!Number.isFinite(d.getTime())) return null;
  // Se sem ano e cai no futuro, assume ano anterior
  if (!m[3] && d.getTime() > now.getTime() + 86400000) {
    d.setFullYear(year - 1);
  }
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

// ============================================================================
// Supabase REST helpers
// ============================================================================
function sbHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function sbGet<T>(path: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: sbHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Supabase GET ${path}: ${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function sbPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Supabase POST ${path}: ${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function sbUpsertAppSetting(key: string, value: unknown): Promise<void> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`,
    {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!r.ok) throw new Error(`Supabase upsert app_settings: ${r.status} ${await r.text()}`);
}

// ============================================================================
// Handler
// ============================================================================
export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: 'Env vars ausentes no servidor' });
    }

    // 1) Valida caller = admin
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Token ausente' });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Token inválido' });
    const user = (await userResp.json()) as { id: string };

    const profiles = await sbGet<Array<{ role: string }>>(
      `profiles?id=eq.${user.id}&select=role`,
    );
    if (!profiles[0] || profiles[0].role !== 'admin') {
      return res.status(403).json({ error: 'Somente admin pode sincronizar' });
    }

    // 2) Le URL
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
      url?: string;
      save_url?: boolean;
    };
    let url = body?.url?.trim();

    if (!url) {
      try {
        const cfg = await sbGet<Array<{ value: { url?: string } | null }>>(
          'app_settings?key=eq.sheet_sync&select=value',
        );
        url = cfg[0]?.value?.url;
      } catch {
        // app_settings pode nao existir ainda — cai no path de "sem url"
      }
    }
    if (!url) {
      return res.status(400).json({ error: 'URL da planilha nao configurada' });
    }
    if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(url)) {
      return res.status(400).json({ error: 'URL invalida — deve ser docs.google.com/spreadsheets' });
    }

    // 3) Fetch CSV
    const csvResp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!csvResp.ok) {
      return res.status(500).json({
        error: `Nao foi possivel baixar a planilha: HTTP ${csvResp.status}`,
      });
    }
    const csvText = await csvResp.text();
    const grid = parseCSV(csvText);
    if (grid.length < 2) {
      return res.status(400).json({ error: 'Planilha vazia ou sem dados' });
    }
    const headers = grid[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);

    const cPagto = idx('pagamento');
    const cParc = idx('parcelas');
    const cValor = idx('valor venda');
    const cProd = idx('nome produto');
    const cCliente = idx('nome contato');
    const cVend = idx('vendedor');
    const cPontos = idx('pontos');
    const cData = idx('data');

    if (cValor === -1 || cVend === -1 || cProd === -1) {
      return res.status(400).json({
        error: 'Cabecalhos esperados nao encontrados (valor venda, vendedor, nome produto)',
        headers_found: headers,
      });
    }

    // 4) Normaliza linhas
    interface Row {
      payment: string;
      installments: number;
      amount: number;
      course_name: string;
      client_name: string | null;
      seller_name: string;
      points: number | null;
      sold_at: string;
    }
    const rows: Row[] = [];
    let skipped = { no_amount: 0, no_seller: 0, no_course: 0, no_date: 0 };

    for (let i = 1; i < grid.length; i++) {
      const r = grid[i];
      const amount = parseNum(r[cValor] ?? '');
      const seller = (r[cVend] ?? '').trim().toUpperCase();
      const course = (r[cProd] ?? '').trim();
      const dateStr = cData >= 0 ? r[cData] ?? '' : '';
      const soldAt = parseDate(dateStr);

      if (!amount || amount <= 0) { skipped.no_amount++; continue; }
      if (!seller) { skipped.no_seller++; continue; }
      if (!course) { skipped.no_course++; continue; }
      if (!soldAt) { skipped.no_date++; continue; }

      rows.push({
        payment: normPayment(r[cPagto] ?? ''),
        installments: Number(r[cParc]) || 1,
        amount,
        course_name: course,
        client_name: cCliente >= 0 ? (r[cCliente] ?? '').trim() || null : null,
        seller_name: seller,
        points: cPontos >= 0 ? parsePoints(r[cPontos] ?? '') : null,
        sold_at: soldAt,
      });
    }

    if (rows.length === 0) {
      return res.status(200).json({
        inserted: 0, skipped_dups: 0, sellers_created: 0, courses_created: 0,
        source_rows: grid.length - 1, skipped, message: 'Nada pra sincronizar',
      });
    }

    // 5) Sync sellers
    const sellersNeeded = Array.from(new Set(rows.map((r) => r.seller_name))).sort();
    const existingSellers = await sbGet<Array<{ id: string; full_name: string }>>(
      'sellers?select=id,full_name',
    );
    const sellerMap = new Map<string, string>();
    for (const s of existingSellers) {
      sellerMap.set(s.full_name.trim().toUpperCase(), s.id);
    }
    const sellersToCreate = sellersNeeded.filter((n) => !sellerMap.has(n));
    if (sellersToCreate.length > 0) {
      const created = await sbPost<Array<{ id: string; full_name: string }>>(
        'sellers',
        sellersToCreate.map((n) => ({ full_name: n, active: true })),
      );
      for (const s of created) sellerMap.set(s.full_name.trim().toUpperCase(), s.id);
    }

    // 6) Sync courses
    const coursesNeeded = Array.from(new Set(rows.map((r) => r.course_name))).sort();
    const existingCourses = await sbGet<Array<{ id: string; name: string }>>(
      'courses?select=id,name',
    );
    const courseMap = new Map<string, string>();
    for (const c of existingCourses) courseMap.set(c.name.trim(), c.id);
    const coursesToCreate = coursesNeeded.filter((n) => !courseMap.has(n));
    if (coursesToCreate.length > 0) {
      // preco medio das linhas desse curso
      const prices: Record<string, number[]> = {};
      for (const row of rows) {
        if (coursesToCreate.includes(row.course_name)) {
          (prices[row.course_name] ||= []).push(row.amount);
        }
      }
      const payload = coursesToCreate.map((name) => ({
        name,
        price: Math.round(((prices[name] ?? [0]).reduce((a, b) => a + b, 0) / (prices[name]?.length ?? 1)) * 100) / 100,
      }));
      // batch 50 pra evitar payload grande
      for (let i = 0; i < payload.length; i += 50) {
        const chunk = payload.slice(i, i + 50);
        const created = await sbPost<Array<{ id: string; name: string }>>('courses', chunk);
        for (const c of created) courseMap.set(c.name.trim(), c.id);
      }
    }

    // 7) Buscar vendas existentes pra dedup (do periodo minimo–maximo das novas linhas)
    const dates = rows.map((r) => r.sold_at).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    const existingSales = await sbGet<
      Array<{ seller_id: string; course_id: string; amount: number | string; sold_at: string }>
    >(
      `sales?select=seller_id,course_id,amount,sold_at&sold_at=gte.${minDate}T00:00:00&sold_at=lte.${maxDate}T23:59:59&limit=5000`,
    );
    const seen = new Set<string>();
    for (const s of existingSales) {
      const day = s.sold_at.slice(0, 10);
      seen.add(`${s.seller_id}|${s.course_id}|${Number(s.amount).toFixed(2)}|${day}`);
    }

    // 8) Prepara payload de insert
    const salesPayload: unknown[] = [];
    let skippedDups = 0;
    for (const r of rows) {
      const sellerId = sellerMap.get(r.seller_name);
      const courseId = courseMap.get(r.course_name);
      if (!sellerId || !courseId) continue;
      const key = `${sellerId}|${courseId}|${r.amount.toFixed(2)}|${r.sold_at}`;
      if (seen.has(key)) { skippedDups++; continue; }
      seen.add(key);
      salesPayload.push({
        seller_id: sellerId,
        course_id: courseId,
        amount: r.amount,
        payment_method: r.payment,
        installments: r.installments,
        sold_at: `${r.sold_at}T12:00:00+00:00`,
        commission_points: r.points,
      });
    }

    // 9) Insert em batches de 200
    let inserted = 0;
    for (let i = 0; i < salesPayload.length; i += 200) {
      const chunk = salesPayload.slice(i, i + 200);
      await sbPost('sales', chunk);
      inserted += chunk.length;
    }

    // 10) Salva URL + timestamp em app_settings (nao falha o sync se der erro aqui)
    const syncedAt = new Date().toISOString();
    let configSaveWarning: string | undefined;
    try {
      await sbUpsertAppSetting('sheet_sync', {
        url,
        last_synced_at: syncedAt,
        last_result: { inserted, skipped_dups: skippedDups, source_rows: rows.length },
      });
    } catch (err) {
      configSaveWarning =
        'Vendas inseridas com sucesso, mas nao foi possivel salvar a URL em app_settings: ' +
        (err as Error).message +
        '. Rode a migration 0003_settings.sql no SQL Editor.';
    }

    return res.status(200).json({
      inserted,
      skipped_dups: skippedDups,
      sellers_created: sellersToCreate.length,
      courses_created: coursesToCreate.length,
      source_rows: rows.length,
      csv_total_rows: grid.length - 1,
      skipped,
      url_used: url,
      synced_at: syncedAt,
      warning: configSaveWarning,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
