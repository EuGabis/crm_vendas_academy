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
import { getSupabase, isSupabaseConfigured } from './supabase';

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
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('id, role, seller_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Falha ao carregar profile:', error.message);
      return null;
    }
    return (data as Profile | null) ?? null;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const sb = getSupabase()!;
    let cancelled = false;

    // Timeout de segurança: se o getSession travar (CORS, rede fora, etc),
    // libera o loading depois de 15s pra mostrar a tela de login.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Auth] getSession() timeout — liberando tela de login');
        setLoading(false);
      }
    }, 15000);

    sb.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[Auth] getSession error:', error);
        }
        setSession(data.session);
        if (data.session?.user) {
          const p = await loadProfile(data.session.user.id);
          if (!cancelled) setProfile(p);
        }
      })
      .catch((err) => {
        console.error('[Auth] getSession threw:', err);
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      });

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
      clearTimeout(safetyTimeout);
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
