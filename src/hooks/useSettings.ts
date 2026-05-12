import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';

function sb() {
  const c = getSupabase();
  if (!c) throw new Error('Supabase não configurado');
  return c;
}

// ============================================================================
// App settings (global, admin write)
// ============================================================================

export interface CompanySettings {
  name: string;
  legal_name: string;
  cnpj: string;
  logo_url: string;
  support_email: string;
}

export interface BrandingSettings {
  primary_color: string;
  show_logo_login: boolean;
}

export interface BonusTier {
  threshold: number;
  bonus_pct: number;
  label: string;
}

export interface AppSettingsMap {
  company?: CompanySettings;
  branding?: BrandingSettings;
  bonus_tiers?: BonusTier[];
  lead_sources?: string[];
  traffic_channels?: string[];
  seller_teams?: string[];
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    queryFn: async (): Promise<AppSettingsMap> => {
      const { data, error } = await sb().from('app_settings').select('key, value');
      if (error) throw error;
      const map: AppSettingsMap = {};
      for (const row of data ?? []) {
        (map as Record<string, unknown>)[row.key] = row.value;
      }
      return map;
    },
  });
}

export function useUpdateAppSetting<K extends keyof AppSettingsMap>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: K; value: AppSettingsMap[K] }) => {
      const { error } = await sb()
        .from('app_settings')
        .upsert(
          { key: input.key as string, value: input.value, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app_settings'] }),
  });
}

// ============================================================================
// User settings (per user)
// ============================================================================

export interface UserSettings {
  user_id: string;
  theme: 'dark' | 'light' | 'system';
  density: 'comfortable' | 'compact';
  notify_email: boolean;
  notify_in_app: boolean;
  full_name: string | null;
  avatar_color: string | null;
}

export function useUserSettings(userId: string | undefined) {
  return useQuery({
    queryKey: ['user_settings', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserSettings | null> => {
      if (!userId) return null;
      const { data, error } = await sb()
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as UserSettings | null) ?? null;
    },
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; patch: Partial<UserSettings> }) => {
      const { error } = await sb()
        .from('user_settings')
        .upsert(
          {
            user_id: input.userId,
            ...input.patch,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['user_settings', variables.userId] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await sb().auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  });
}

export function useUpdateUserEmail() {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await sb().auth.updateUser({ email: newEmail });
      if (error) throw error;
    },
  });
}
