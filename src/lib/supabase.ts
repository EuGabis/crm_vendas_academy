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
      realtime: {
        // Desabilita realtime — evita WebSocket que pode travar em redes restritivas
        params: { eventsPerSecond: 0 },
      },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    });
  }
  return _client;
}

export function isSupabaseConfigured() {
  return getSupabase() !== null;
}
