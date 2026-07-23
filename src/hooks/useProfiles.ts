import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restGet, restUpdate } from '@/lib/supabase';
import type { UserRole } from '@/lib/auth';

export interface ProfileRow {
  id: string;
  role: UserRole;
  seller_id: string | null;
  created_at: string;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<ProfileRow[]> =>
      restGet<ProfileRow[]>(
        'profiles?select=id,role,seller_id,created_at&order=created_at.desc',
      ),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; role?: UserRole; seller_id?: string | null }) => {
      const payload: Record<string, unknown> = {};
      if (p.role !== undefined) payload.role = p.role;
      if (p.seller_id !== undefined) payload.seller_id = p.seller_id;
      return restUpdate('profiles', `id=eq.${p.id}`, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}
