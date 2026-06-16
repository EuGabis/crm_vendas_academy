/**
 * Tipos espelhando a resposta da API DigitalManager Guru.
 * Campos definidos como opcionais quando não confirmados — leitura defensiva.
 */

export interface GuruContact {
  id: string;
  name?: string;
  email?: string;
  doc?: string | null;
  phone_number?: string | null;
  company_name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  created_at?: string;
}

export interface GuruAffiliation {
  id: string;
  name?: string;
  contact_id?: string;
  contact_email?: string;
  value?: number;
  net_value?: number;
  fee?: number;
  currency?: string;
  marketplace_id?: string;
  recipient_id?: string;
  affiliates_group_name?: string;
}

export interface GuruProduct {
  id: string;
  name?: string;
  marketplace_id?: string;
  type?: string;
}

export interface GuruPayment {
  method?: string;
  total?: number;
  net?: number;
  fee?: number;
  installments?: number;
  status?: string;
  acquirer?: string;
  brand?: string;
}

export interface GuruTransaction {
  id: string;
  contact?: GuruContact;
  product?: GuruProduct;
  affiliations?: GuruAffiliation[];

  // Datas (qualquer um pode estar presente)
  ordered_at?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
  created_at?: string;
  updated_at?: string;

  // Valores
  value?: number;
  net_value?: number;
  fee?: number;
  currency?: string;

  // Status / pagamento
  status?: string;
  payment?: GuruPayment;
  payment_method?: string;
  installments?: number;

  // URLs
  checkout_url?: string;
  checkout_invoice_url?: string;
  invoice_url?: string;

  // Marketplace / ids
  marketplace_id?: string;
  source?: string;
}

export interface GuruSubscription {
  id: string;
  contact?: GuruContact;
  product?: GuruProduct;
  status?: string; // active, cancelled, expired, etc
  started_at?: string;
  cancelled_at?: string;
  next_charge_at?: string;
  charge_value?: number;
  net_value?: number;
  charges_made?: number;
  charges_count?: number;
  cycle?: string;
  currency?: string;
  payment_method?: string;
}

export interface GuruMeta {
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
  next_cursor?: string;
  has_more?: boolean;
}

export interface GuruListResponse<T> {
  data: T[];
  meta?: GuruMeta;
  total?: number;
  next_cursor?: string;
}

// ============================================================================
// Status normalizado (UI)
// ============================================================================
export type NormalizedStatus =
  | 'paid'
  | 'pending'
  | 'refused'
  | 'refunded'
  | 'cancelled'
  | 'chargedback'
  | 'expired'
  | 'unknown';

const STATUS_MAP: Record<string, NormalizedStatus> = {
  paid: 'paid',
  approved: 'paid',
  confirmed: 'paid',
  authorized: 'paid',
  pending: 'pending',
  waiting_payment: 'pending',
  waiting: 'pending',
  processing: 'pending',
  billet_printed: 'pending',
  billet: 'pending',
  refused: 'refused',
  failed: 'refused',
  not_authorized: 'refused',
  refunded: 'refunded',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  chargeback: 'chargedback',
  chargedback: 'chargedback',
  expired: 'expired',
};

/** Extrai status considerando que pode estar em payment.status, status, ou outros. */
export function txStatus(tx: GuruTransaction): string | undefined {
  const anyTx = tx as unknown as Record<string, unknown>;
  // raiz
  for (const k of ['status', 'transaction_status', 'order_status']) {
    const v = anyTx[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  // aninhado
  const payment = anyTx['payment'] as Record<string, unknown> | undefined;
  if (payment) {
    for (const k of ['status', 'state']) {
      const v = payment[k];
      if (typeof v === 'string' && v.trim() !== '') return v;
    }
  }
  return undefined;
}

export function normalizeStatus(s?: string): NormalizedStatus {
  if (!s) return 'unknown';
  return STATUS_MAP[s.toLowerCase()] ?? 'unknown';
}

export const STATUS_LABELS: Record<NormalizedStatus, string> = {
  paid: 'Paga',
  pending: 'Pendente',
  refused: 'Recusada',
  refunded: 'Estornada',
  cancelled: 'Cancelada',
  chargedback: 'Chargeback',
  expired: 'Expirada',
  unknown: 'Desconhecido',
};

export const STATUS_VARIANT: Record<
  NormalizedStatus,
  'success' | 'warning' | 'danger' | 'muted' | 'info'
> = {
  paid: 'success',
  pending: 'warning',
  refused: 'danger',
  refunded: 'muted',
  cancelled: 'muted',
  chargedback: 'danger',
  expired: 'muted',
  unknown: 'muted',
};

function asNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Tenta extrair valor da venda em vários formatos comuns. */
export function txValue(tx: GuruTransaction): number {
  const anyTx = tx as unknown as Record<string, unknown>;
  // Plano: tx.value, tx.total, tx.amount, tx.price
  for (const k of ['value', 'total', 'amount', 'price']) {
    const v = asNum(anyTx[k]);
    if (v != null) return v;
  }
  // payment.total / amount / value
  const payment = anyTx['payment'] as Record<string, unknown> | undefined;
  if (payment) {
    for (const k of ['total', 'amount', 'value', 'price']) {
      const v = asNum(payment[k]);
      if (v != null) return v;
    }
  }
  // afiliações somadas
  if (Array.isArray(tx.affiliations) && tx.affiliations.length) {
    return tx.affiliations.reduce((a, b) => a + (b.value ?? 0), 0);
  }
  return 0;
}

export function txNetValue(tx: GuruTransaction): number {
  const anyTx = tx as unknown as Record<string, unknown>;
  for (const k of ['net_value', 'net', 'net_amount']) {
    const v = asNum(anyTx[k]);
    if (v != null) return v;
  }
  const payment = anyTx['payment'] as Record<string, unknown> | undefined;
  if (payment) {
    for (const k of ['net', 'net_value', 'net_amount']) {
      const v = asNum(payment[k]);
      if (v != null) return v;
    }
  }
  return txValue(tx);
}

function toIsoFromAny(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string' && v.trim() !== '') return v;
  if (typeof v === 'number' && Number.isFinite(v)) {
    // ms ou s? heurística: <1e12 ~= segundos
    const ms = v < 1e12 ? v * 1000 : v;
    if (ms < 86400000) return null; // antes de 1970-01-02 = inválido
    return new Date(ms).toISOString();
  }
  if (typeof v === 'object' && v) {
    const obj = v as Record<string, unknown>;
    for (const k of ['value', 'iso', 'raw', 'date', 'datetime', '$date']) {
      if (k in obj) {
        const r = toIsoFromAny(obj[k]);
        if (r) return r;
      }
    }
  }
  return null;
}

/** Extrai data de uma transaction. A Guru pode usar:
 *   - string solta na raiz: tx.confirmed_at, tx.ordered_at, ...
 *   - aninhado em `dates`: tx.dates.confirmed_at (string ou {value: "..."})
 *   - aninhado em `payment.dates` ou `payment.paid_at`
 *   - timestamp epoch (segundos OU milissegundos)
 *   tenta todos em ordem de prioridade.
 */
export function txDate(tx: GuruTransaction): string | null {
  const anyTx = tx as unknown as Record<string, unknown>;

  // ordem de preferência: paid > confirmed > ordered > created
  const fields = [
    'paid_at',
    'confirmed_at',
    'confirmed_date',
    'ordered_at',
    'order_date',
    'created_at',
    'created_date',
    'updated_at',
  ];

  // 1) raiz
  for (const k of fields) {
    const r = toIsoFromAny(anyTx[k]);
    if (r) return r;
  }

  // 2) aninhado em dates / payment.dates / payment
  const containers: Array<Record<string, unknown> | undefined> = [
    anyTx['dates'] as Record<string, unknown> | undefined,
    (anyTx['payment'] as Record<string, unknown> | undefined)?.['dates'] as
      | Record<string, unknown>
      | undefined,
    anyTx['payment'] as Record<string, unknown> | undefined,
  ];
  for (const c of containers) {
    if (!c) continue;
    for (const k of fields) {
      const r = toIsoFromAny(c[k]);
      if (r) return r;
    }
  }

  return null;
}

export function txProductName(tx: GuruTransaction): string {
  return tx.product?.name ?? tx.affiliations?.[0]?.name ?? '—';
}

export function txPaymentLabel(tx: GuruTransaction): string {
  const m = tx.payment?.method ?? tx.payment_method ?? '';
  const lower = m.toLowerCase();
  if (lower.includes('credit')) return 'Cartão de crédito';
  if (lower.includes('debit')) return 'Cartão de débito';
  if (lower.includes('boleto')) return 'Boleto';
  if (lower.includes('pix')) return 'PIX';
  if (lower.includes('paypal')) return 'PayPal';
  return m || '—';
}
