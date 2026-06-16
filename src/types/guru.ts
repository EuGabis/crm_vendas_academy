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
  if (typeof tx.status === 'string') return tx.status;
  const payment = anyTx['payment'] as Record<string, unknown> | undefined;
  if (payment && typeof payment['status'] === 'string') return payment['status'] as string;
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

/** Tenta extrair valor da venda em vários formatos comuns. */
export function txValue(tx: GuruTransaction): number {
  if (typeof tx.value === 'number') return tx.value;
  if (typeof tx.payment?.total === 'number') return tx.payment.total;
  if (Array.isArray(tx.affiliations) && tx.affiliations.length) {
    return tx.affiliations.reduce((a, b) => a + (b.value ?? 0), 0);
  }
  return 0;
}

export function txNetValue(tx: GuruTransaction): number {
  if (typeof tx.net_value === 'number') return tx.net_value;
  if (typeof tx.payment?.net === 'number') return tx.payment.net;
  return txValue(tx);
}

/** Extrai data de uma transaction. A Guru pode usar:
 *   - string solta: tx.confirmed_at
 *   - objeto: tx.dates.confirmed_at = "..." ou {value: "...", raw: "..."}
 *   - timestamp epoch dentro de payment.dates
 *   tenta todos.
 */
export function txDate(tx: GuruTransaction): string | null {
  const anyTx = tx as unknown as Record<string, unknown>;
  // Plano
  const flat = [
    tx.confirmed_at,
    tx.ordered_at,
    tx.created_at,
    tx.updated_at,
    tx.cancelled_at,
  ].find((v) => typeof v === 'string') as string | undefined;
  if (flat) return flat;

  // Aninhado em `dates`
  const dates = anyTx['dates'] as Record<string, unknown> | undefined;
  if (dates && typeof dates === 'object') {
    const candidates = ['confirmed_at', 'ordered_at', 'created_at', 'updated_at'];
    for (const k of candidates) {
      const v = dates[k];
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object' && 'value' in (v as object)) {
        const val = (v as { value?: unknown }).value;
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return new Date(val * 1000).toISOString();
      }
      // unix timestamp puro
      if (typeof v === 'number') return new Date(v * 1000).toISOString();
    }
  }

  // Fallback comum em APIs br: ordered/confirmed unix timestamp na raiz
  for (const k of ['confirmed_at', 'ordered_at', 'created_at']) {
    const v = anyTx[k];
    if (typeof v === 'number') return new Date(v * 1000).toISOString();
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
