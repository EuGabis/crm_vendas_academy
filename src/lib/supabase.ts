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
 * Faz fetch direto na REST API do Supabase, contornando o supabase-js.
 * Útil quando o SDK trava — alguns proxies/middleware não gostam dos
 * headers internos do SDK (sb-*).
 */
export async function rawSupabaseGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  if (!url || !anonKey) throw new Error('Supabase não configurado');
  const sessionRaw = localStorage.getItem(
    `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
  );
  let token = anonKey;
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      if (session?.access_token) token = session.access_token;
    } catch {
      /* noop */
    }
  }
  const r = await fetch(`${url}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export function isSupabaseConfigured() {
  return getSupabase() !== null;
}
