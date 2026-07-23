import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, restGet } from './supabase';

export type UserRole = 'admin' | 'manager' | 'seller' | 'viewer' | 'anon';

export interface Profile {
  id: string;
  role: UserRole;
  seller_id: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      // Usa REST direto pra evitar travamento de 15s do supabase-js
      const rows = await restGet<Profile[]>(
        `profiles?select=id,role,seller_id&id=eq.${userId}&limit=1`,
      );
      return rows[0] ?? null;
    } catch (err) {
      console.error('Falha ao carregar profile:', (err as Error).message);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const sb = getSupabase()!;
    let cancelled = false;

    // Tenta ler a sessão DIRETO do localStorage primeiro (evita travamento
    // de getSession do supabase-js).
    function readSessionFromStorage(): Session | null {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const ref = new URL(url).hostname.split('.')[0];
        const raw = localStorage.getItem(`sb-${ref}-auth-token`);
        if (!raw) return null;
        return JSON.parse(raw) as Session;
      } catch {
        return null;
      }
    }

    (async () => {
      const stored = readSessionFromStorage();
      if (stored?.user && !cancelled) {
        setSession(stored);
        const p = await loadProfile(stored.user.id);
        if (!cancelled) {
          setProfile(p);
          setLoading(false);
        }
        return;
      }

      // Sem sessão no storage: chama getSession (com timeout de 5s)
      const safetyTimeout = setTimeout(() => {
        if (!cancelled) {
          console.warn('[Auth] getSession() timeout — liberando tela de login');
          setLoading(false);
        }
      }, 5000);

      try {
        const { data } = await sb.auth.getSession();
        if (cancelled) return;
        setSession(data.session);
        if (data.session?.user) {
          const p = await loadProfile(data.session.user.id);
          if (!cancelled) setProfile(p);
        }
      } catch (err) {
        console.error('[Auth] getSession threw:', err);
      } finally {
        if (!cancelled) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    })();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const p = await loadProfile(newSession.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase não configurado' };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const p = await loadProfile(session.user.id);
    setProfile(p);
  }, [session?.user, loadProfile]);

  const role: UserRole = profile?.role ?? (session ? 'viewer' : 'anon');

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAdmin: role === 'admin',
      loading,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, role, loading, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
