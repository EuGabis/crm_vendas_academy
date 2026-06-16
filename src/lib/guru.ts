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
  days?: number; // helper — backend converte em ordered_at_ini
}

export function fetchTransactions(params?: GuruTransactionsParams) {
  return get<GuruListResponse<GuruTransaction>>(
    'transactions',
    params as Record<string, string | number | undefined> | undefined,
  );
}

export function fetchSubscriptions(params?: { per_page?: number; page?: number; status?: string }) {
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
