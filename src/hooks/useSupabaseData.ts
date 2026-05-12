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

// ============================================================================
// Sellers
// ============================================================================
export function useSellers() {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async (): Promise<Seller[]> => {
      const { data, error } = await sb()
        .from('sellers')
        .select('id, full_name, email, team, avatar_color, active')
        .order('full_name');
      if (error) throw error;
      return (data ?? []).map((r) => ({
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
      const payload = {
        id: s.id,
        full_name: s.fullName,
        email: s.email,
        team: s.team ?? 'Closer',
        avatar_color: s.avatarColor ?? '#8b5cf6',
        active: s.active ?? true,
      };
      const { data, error } = await sb()
        .from('sellers')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
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
      const { data, error } = await sb()
        .from('courses')
        .select('id, name, price')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
    },
  });
}

export function useUpsertCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Course> & { name: string; price: number }) => {
      const payload = { id: c.id, name: c.name, price: c.price };
      const { data, error } = await sb()
        .from('courses')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
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
      const { data, error } = await sb()
        .from('monthly_goals')
        .select('seller_id, year_month, revenue_goal, courses_goal, business_days');
      if (error) throw error;
      return (data ?? []).map((r) => ({
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
      const { data, error } = await sb()
        .from('leads')
        .select('id, seller_id, source, stage, created_at, stage_changed_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
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
      const payload = {
        id: l.id,
        seller_id: l.sellerId,
        source: l.source ?? 'Manual',
        stage: l.stage,
        created_at: l.createdAt,
        stage_changed_at: l.stageChangedAt ?? new Date().toISOString(),
      };
      const { error } = await sb().from('leads').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
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
      const { data, error } = await sb()
        .from('sales')
        .select(
          'id, seller_id, lead_id, course_id, amount, payment_method, installments, sold_at',
        )
        .order('sold_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
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
      const payload = {
        id: s.id,
        seller_id: s.sellerId,
        lead_id: s.leadId ?? null,
        course_id: s.courseId,
        amount: s.amount,
        payment_method: s.paymentMethod,
        installments: s.installments ?? 1,
        sold_at: s.soldAt ?? new Date().toISOString(),
      };
      const { error } = await sb().from('sales').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
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
      const { data, error } = await sb()
        .from('traffic_spend')
        .select('id, spend_date, channel, amount')
        .order('spend_date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
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
    mutationFn: async (t: Partial<TrafficSpend> & { spendDate: string; channel: string; amount: number }) => {
      const payload = {
        id: t.id,
        spend_date: t.spendDate,
        channel: t.channel,
        amount: t.amount,
      };
      const { error } = await sb().from('traffic_spend').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
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
// Aggregate hook — passa todos os datasets pra páginas do dashboard
// ============================================================================
export function useDashboardDatasets() {
  const sellers = useSellers();
  const courses = useCourses();
  const leads = useLeads();
  const sales = useSales();
  const goals = useMonthlyGoals();
  const traffic = useTrafficSpend();

  // "isLoading" só na primeira carga (todas pending sem dados ainda).
  // Se alguma já voltou, não mostra loading global — usa dados parciais.
  const allPending =
    sellers.isLoading &&
    courses.isLoading &&
    leads.isLoading &&
    sales.isLoading &&
    goals.isLoading &&
    traffic.isLoading;

  const error =
    sellers.error ??
    courses.error ??
    leads.error ??
    sales.error ??
    goals.error ??
    traffic.error;

  return {
    sellers: sellers.data ?? [],
    courses: courses.data ?? [],
    leads: leads.data ?? [],
    sales: sales.data ?? [],
    goals: goals.data ?? [],
    traffic: traffic.data ?? [],
    isLoading: allPending,
    error,
  };
}
