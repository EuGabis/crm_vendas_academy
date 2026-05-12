import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import type {
  Seller,
  Course,
  Lead,
  Sale,
  MonthlyGoal,
  TrafficSpend,
} from '@/types/domain';

function sb() {
  const c = getSupabase();
  if (!c) throw new Error('Supabase não configurado');
  return c;
}

const QUERY_TIMEOUT_MS = 15000;

/**
 * Executa uma query do Supabase com timeout.
 * Se a query demorar mais que QUERY_TIMEOUT_MS ou der erro,
 * retorna dados vazios + loga warning. NUNCA throw — UI nunca trava.
 */
async function safeFetch<T>(
  label: string,
  promise: PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const start = performance.now();
  try {
    const result = await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), QUERY_TIMEOUT_MS),
      ),
    ]);
    const ms = Math.round(performance.now() - start);
    if (result.error) {
      console.warn(`[Supabase] ${label} retornou erro em ${ms}ms:`, result.error);
      return [];
    }
    console.info(`[Supabase] ${label} OK em ${ms}ms (${result.data?.length ?? 0} rows)`);
    return result.data ?? [];
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    console.warn(`[Supabase] ${label} falhou em ${ms}ms:`, (err as Error).message);
    return [];
  }
}

// ============================================================================
// Sellers
// ============================================================================
export function useSellers() {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async (): Promise<Seller[]> => {
      const rows = await safeFetch<{
        id: string;
        full_name: string;
        email: string;
        team: string;
        avatar_color: string;
        active: boolean;
      }>(
        'sellers',
        sb()
          .from('sellers')
          .select('id, full_name, email, team, avatar_color, active')
          .order('full_name'),
      );
      return rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        team: r.team,
        avatarColor: r.avatar_color,
        active: r.active,
      }));
    },
  });
}

export function useUpsertSeller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<Seller> & { fullName: string; email: string }) => {
      const payload: Record<string, unknown> = {
        full_name: s.fullName,
        email: s.email,
        team: s.team ?? 'Closer',
        avatar_color: s.avatarColor ?? '#8b5cf6',
        active: s.active ?? true,
      };
      if (s.id) payload.id = s.id;
      const query = s.id
        ? sb().from('sellers').update(payload).eq('id', s.id).select().single()
        : sb().from('sellers').insert(payload).select().single();
      const { data, error } = await query;
      if (error) {
        console.error('[upsertSeller] erro:', error);
        throw new Error(error.message || 'Falha ao salvar vendedor');
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sellers'] }),
  });
}

export function useDeleteSeller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('sellers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sellers'] }),
  });
}

// ============================================================================
// Courses
// ============================================================================
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async (): Promise<Course[]> => {
      const rows = await safeFetch<{ id: string; name: string; price: number | string }>(
        'courses',
        sb().from('courses').select('id, name, price').order('name'),
      );
      return rows.map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
    },
  });
}

export function useUpsertCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Course> & { name: string; price: number }) => {
      const payload: Record<string, unknown> = { name: c.name, price: c.price };
      const query = c.id
        ? sb().from('courses').update(payload).eq('id', c.id).select().single()
        : sb().from('courses').insert(payload).select().single();
      const { data, error } = await query;
      if (error) {
        console.error('[upsertCourse] erro:', error);
        throw new Error(error.message || 'Falha ao salvar curso');
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

// ============================================================================
// Monthly Goals
// ============================================================================
export function useMonthlyGoals() {
  return useQuery({
    queryKey: ['monthly_goals'],
    queryFn: async (): Promise<MonthlyGoal[]> => {
      const rows = await safeFetch<{
        seller_id: string;
        year_month: string;
        revenue_goal: number | string;
        courses_goal: number;
        business_days: number;
      }>(
        'monthly_goals',
        sb()
          .from('monthly_goals')
          .select('seller_id, year_month, revenue_goal, courses_goal, business_days'),
      );
      return rows.map((r) => ({
        sellerId: r.seller_id,
        yearMonth: r.year_month,
        revenueGoal: Number(r.revenue_goal),
        coursesGoal: r.courses_goal,
        businessDays: r.business_days,
      }));
    },
  });
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: MonthlyGoal) => {
      const payload = {
        seller_id: g.sellerId,
        year_month: g.yearMonth,
        revenue_goal: g.revenueGoal,
        courses_goal: g.coursesGoal,
        business_days: g.businessDays,
      };
      const { error } = await sb()
        .from('monthly_goals')
        .upsert(payload, { onConflict: 'seller_id,year_month' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly_goals'] }),
  });
}

// ============================================================================
// Leads
// ============================================================================
export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      const rows = await safeFetch<{
        id: string;
        seller_id: string | null;
        source: string | null;
        stage: Lead['stage'];
        created_at: string;
        stage_changed_at: string;
      }>(
        'leads',
        sb()
          .from('leads')
          .select('id, seller_id, source, stage, created_at, stage_changed_at')
          .order('created_at', { ascending: false }),
      );
      return rows.map((r) => ({
        id: r.id,
        sellerId: r.seller_id ?? '',
        source: r.source ?? '',
        stage: r.stage,
        createdAt: r.created_at,
        stageChangedAt: r.stage_changed_at,
      }));
    },
  });
}

export function useUpsertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Partial<Lead> & { sellerId: string; stage: Lead['stage'] }) => {
      const payload: Record<string, unknown> = {
        seller_id: l.sellerId,
        source: l.source ?? 'Manual',
        stage: l.stage,
        stage_changed_at: l.stageChangedAt ?? new Date().toISOString(),
      };
      if (l.createdAt) payload.created_at = l.createdAt;
      const query = l.id
        ? sb().from('leads').update(payload).eq('id', l.id)
        : sb().from('leads').insert(payload);
      const { error } = await query;
      if (error) {
        console.error('[upsertLead] erro:', error);
        throw new Error(error.message || 'Falha ao salvar lead');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

// ============================================================================
// Sales
// ============================================================================
export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async (): Promise<Sale[]> => {
      const rows = await safeFetch<{
        id: string;
        seller_id: string;
        lead_id: string | null;
        course_id: string;
        amount: number | string;
        payment_method: Sale['paymentMethod'];
        installments: number;
        sold_at: string;
      }>(
        'sales',
        sb()
          .from('sales')
          .select(
            'id, seller_id, lead_id, course_id, amount, payment_method, installments, sold_at',
          )
          .order('sold_at', { ascending: false }),
      );
      return rows.map((r) => ({
        id: r.id,
        sellerId: r.seller_id,
        leadId: r.lead_id,
        courseId: r.course_id,
        amount: Number(r.amount),
        paymentMethod: r.payment_method,
        installments: r.installments,
        soldAt: r.sold_at,
      }));
    },
  });
}

export function useUpsertSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      s: Partial<Sale> & {
        sellerId: string;
        courseId: string;
        amount: number;
        paymentMethod: Sale['paymentMethod'];
      },
    ) => {
      const payload: Record<string, unknown> = {
        seller_id: s.sellerId,
        lead_id: s.leadId ?? null,
        course_id: s.courseId,
        amount: s.amount,
        payment_method: s.paymentMethod,
        installments: s.installments ?? 1,
        sold_at: s.soldAt ?? new Date().toISOString(),
      };
      const query = s.id
        ? sb().from('sales').update(payload).eq('id', s.id)
        : sb().from('sales').insert(payload);
      const { error } = await query;
      if (error) {
        console.error('[upsertSale] erro:', error);
        throw new Error(error.message || 'Falha ao salvar venda');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

// ============================================================================
// Traffic Spend
// ============================================================================
export function useTrafficSpend() {
  return useQuery({
    queryKey: ['traffic_spend'],
    queryFn: async (): Promise<TrafficSpend[]> => {
      const rows = await safeFetch<{
        id: string;
        spend_date: string;
        channel: string;
        amount: number | string;
      }>(
        'traffic_spend',
        sb()
          .from('traffic_spend')
          .select('id, spend_date, channel, amount')
          .order('spend_date', { ascending: false }),
      );
      return rows.map((r) => ({
        id: r.id,
        spendDate: r.spend_date,
        channel: r.channel,
        amount: Number(r.amount),
      }));
    },
  });
}

export function useUpsertTrafficSpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      t: Partial<TrafficSpend> & { spendDate: string; channel: string; amount: number },
    ) => {
      const payload: Record<string, unknown> = {
        spend_date: t.spendDate,
        channel: t.channel,
        amount: t.amount,
      };
      const query = t.id
        ? sb().from('traffic_spend').update(payload).eq('id', t.id)
        : sb().from('traffic_spend').insert(payload);
      const { error } = await query;
      if (error) {
        console.error('[upsertTrafficSpend] erro:', error);
        throw new Error(error.message || 'Falha ao salvar gasto');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traffic_spend'] }),
  });
}

export function useDeleteTrafficSpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('traffic_spend').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traffic_spend'] }),
  });
}

// ============================================================================
// Dashboard aggregate
// ============================================================================
export function useDashboardDatasets() {
  const sellers = useSellers();
  const courses = useCourses();
  const leads = useLeads();
  const sales = useSales();
  const goals = useMonthlyGoals();
  const traffic = useTrafficSpend();

  // Como safeFetch nunca rejeita, "isLoading" = true só na PRIMEIRA fetch.
  // Quando resolve (mesmo com erro de rede), data vira [] e isLoading=false.
  // Resultado: UI mostra empty state corretamente, sem travamento.
  const isLoading = sellers.isLoading && !sellers.data;

  return {
    sellers: sellers.data ?? [],
    courses: courses.data ?? [],
    leads: leads.data ?? [],
    sales: sales.data ?? [],
    goals: goals.data ?? [],
    traffic: traffic.data ?? [],
    isLoading,
    error: null as Error | null,
  };
}
