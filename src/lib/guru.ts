/**
 * Cliente frontend que chama nossas serverless functions /api/guru/*
 * (que por sua vez fazem proxy pra Guru com o token server-side).
 */
import type {
  GuruListResponse,
  GuruTransaction,
  GuruSubscription,
  GuruContact,
} from '@/types/guru';

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`/api/guru/${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface GuruTransactionsParams {
  per_page?: number;
  page?: number;
  ordered_at_ini?: string; // YYYY-MM-DD
  ordered_at_end?: string;
  confirmed_at_ini?: string;
  confirmed_at_end?: string;
  status?: string;
  contact_id?: string;
  product_id?: string;
  subscription_id?: string;
  days?: number; // helper — backend converte em ordered_at_ini
}

export interface GuruInvoice {
  id: string;
  cycle?: number;
  value?: number;
  status?: string;
  charged_at?: string;
  type?: string;
  [k: string]: unknown;
}

export function fetchSubscriptionInvoices(id: string) {
  return get<{ data?: GuruInvoice[] } & Record<string, unknown>>(
    `subscriptions/${encodeURIComponent(id)}/invoices`,
  );
}

export function fetchInvoice(id: string, subscriptionId?: string) {
  const params: Record<string, string> = {};
  if (subscriptionId) params.subscription_id = subscriptionId;
  return get<GuruInvoice & Record<string, unknown>>(
    `invoices/${encodeURIComponent(id)}`,
    params,
  );
}

export function fetchTransactions(params?: GuruTransactionsParams) {
  return get<GuruListResponse<GuruTransaction>>(
    'transactions',
    params as Record<string, string | number | undefined> | undefined,
  );
}

export function fetchSubscriptions(params?: {
  per_page?: number;
  page?: number;
  status?: string;
  contact_id?: string;
  product_id?: string;
}) {
  return get<GuruListResponse<GuruSubscription>>(
    'subscriptions',
    params as Record<string, string | number | undefined> | undefined,
  );
}

export function fetchContacts(params?: {
  per_page?: number;
  page?: number;
  search?: string;
  name?: string;
  email?: string;
  doc?: string;
}) {
  // Se vier um "search" genérico, o backend tenta também como name/email/doc.
  // Aqui passamos tudo direto.
  const all: Record<string, string | number | undefined> = { ...params };
  if (params?.search && !params.name && !params.email && !params.doc) {
    // tenta inferir: se for número, doc; se tem @, email; senão name
    const s = params.search.trim();
    if (/^\d+$/.test(s.replace(/\D/g, '')) && s.replace(/\D/g, '').length >= 6) {
      all.doc = s.replace(/\D/g, '');
    } else if (s.includes('@')) {
      all.email = s;
    } else {
      all.name = s;
    }
  }
  return get<GuruListResponse<GuruContact>>('contacts', all);
}

export function fetchTransaction(id: string) {
  return get<GuruTransaction>(`transactions/${encodeURIComponent(id)}`);
}

export function fetchSubscription(id: string) {
  return get<GuruSubscription>(`subscriptions/${encodeURIComponent(id)}`);
}

/**
 * Formata uma data que pode vir como string ISO, número (epoch),
 * tratando casos invalidos (NaN, 0, 1970) como em branco.
 */
export function fmtGuruDate(
  raw: unknown,
  opts: { withTime?: boolean } = {},
): string {
  if (raw == null || raw === '' || raw === 0) return '—';
  const d =
    typeof raw === 'number'
      ? new Date(raw < 1e12 ? raw * 1000 : raw)
      : new Date(String(raw));
  const t = d.getTime();
  if (!Number.isFinite(t) || t < 86400000) return '—'; // antes de 1970-01-02
  return opts.withTime
    ? d.toLocaleString('pt-BR')
    : d.toLocaleDateString('pt-BR');
}

// Helpers de período
export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function daysAgo(n: number) {
  return isoDate(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

export function today() {
  return isoDate(new Date());
}

export function startOfMonth() {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}
