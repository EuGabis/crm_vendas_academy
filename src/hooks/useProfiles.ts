import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/auth';

export interface ProfileRow {
  id: string;
  role: UserRole;
  seller_id: string | null;
  created_at: string;
  email?: string;
}

function sb() {
  const c = getSupabase();
  if (!c) throw new Error('Supabase não configurado');
  return c;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await sb()
        .from('profiles')
        .select('id, role, seller_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; role?: UserRole; seller_id?: string | null }) => {
      const payload: Record<string, unknown> = {};
      if (p.role !== undefined) payload.role = p.role;
      if (p.seller_id !== undefined) payload.seller_id = p.seller_id;
      const { error } = await sb().from('profiles').update(payload).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}
