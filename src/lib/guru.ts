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

export type ContactSearchKind = 'auto' | 'name' | 'email' | 'doc' | 'phone';

/** Detecta o tipo de busca a partir da string. */
export function detectContactSearchKind(raw: string): Exclude<ContactSearchKind, 'auto'> {
  const s = raw.trim();
  if (!s) return 'name';
  if (s.includes('@')) return 'email';
  const digits = s.replace(/\D/g, '');
  // CPF (11) ou CNPJ (14)
  if (digits.length === 11 || digits.length === 14) return 'doc';
  // Telefone BR (10 ou 11 dígitos com DDD)
  if (digits.length >= 10 && digits.length <= 13) return 'phone';
  // Sequencia só-numérica de 6+ dígitos: tratamos como doc (parcial)
  if (digits.length >= 6 && digits === s.replace(/[.\-/\s]/g, '')) return 'doc';
  return 'name';
}

export function fetchContacts(params?: {
  per_page?: number;
  page?: number;
  search?: string;
  name?: string;
  email?: string;
  doc?: string;
  phone?: string;
  /** Força um tipo específico — sobrescreve a inferência. */
  kind?: ContactSearchKind;
}) {
  const all: Record<string, string | number | undefined> = {
    per_page: params?.per_page,
    page: params?.page,
  };
  // Se algum tipo direto veio (name/email/doc/phone), respeita.
  if (params?.name) all.name = params.name;
  if (params?.email) all.email = params.email;
  if (params?.doc) all.doc = params.doc.replace(/\D/g, '');
  if (params?.phone) all.phone = params.phone.replace(/\D/g, '');

  // Inferência via search
  if (params?.search) {
    const s = params.search.trim();
    const kind =
      params.kind && params.kind !== 'auto'
        ? params.kind
        : detectContactSearchKind(s);
    switch (kind) {
      case 'email':
        all.email = s;
        break;
      case 'doc':
        all.doc = s.replace(/\D/g, '');
        break;
      case 'phone':
        all.phone = s.replace(/\D/g, '');
        break;
      default:
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
