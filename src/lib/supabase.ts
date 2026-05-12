import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey || url.includes('PRECISO_QUE_VOCE_ME_MANDE_A_URL')) {
    return null;
  }
  if (!_client) {
    _client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

/**
 * REST client direto, contornando o supabase-js.
 * O SDK envia headers extras (x-client-info, Prefer params) que disparam
 * preflight CORS travando 15s em alguns proxies. Fetch direto evita isso.
 */
function getAuthToken(): string {
  if (!url || !anonKey) return anonKey;
  try {
    const c = getSupabase();
    if (c) {
      // tenta pegar do localStorage do SDK
      const ref = new URL(url).hostname.split('.')[0];
      const raw = localStorage.getItem(`sb-${ref}-auth-token`);
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.access_token) return session.access_token;
      }
    }
  } catch {
    /* noop */
  }
  return anonKey;
}

function baseHeaders(extra?: Record<string, string>) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json',
    ...(extra ?? {}),
  };
}

export async function restGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    method: 'GET',
    headers: baseHeaders(),
    signal,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function restInsert<T>(table: string, body: object): Promise<T> {
  const r = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: baseHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = await r.json();
  return Array.isArray(json) ? (json[0] as T) : (json as T);
}

export async function restUpdate<T>(
  table: string,
  filter: string,
  body: object,
): Promise<T> {
  const r = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: baseHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = await r.json();
  return Array.isArray(json) ? (json[0] as T) : (json as T);
}

export async function restDelete(table: string, filter: string): Promise<void> {
  const r = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: baseHeaders(),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function isSupabaseConfigured() {
  return getSupabase() !== null;
}
