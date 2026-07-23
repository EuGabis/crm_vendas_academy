import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restGet, restInsert, restUpdate, restDelete, restUpsert } from '@/lib/supabase';
import type {
  Seller,
  Course,
  Lead,
  Sale,
  MonthlyGoal,
  TrafficSpend,
  PointsAdjustment,
} from '@/types/domain';

const QUERY_TIMEOUT_MS = 15000;

/**
 * Fetch com timeout via AbortSignal. Em caso de falha/timeout, lança o erro
 * para que o React Query exponha `isError`/`error` — a UI reage com ErrorState
 * + retry em vez de mascarar a falha como lista vazia.
 */
async function fetchRows<T>(label: string, path: string): Promise<T[]> {
  const start = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), QUERY_TIMEOUT_MS);
  try {
    const rows = await restGet<T[]>(path, ctrl.signal);
    const ms = Math.round(performance.now() - start);
    console.info(`[REST] ${label} OK em ${ms}ms (${rows.length} rows)`);
    return rows;
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    const reason = ctrl.signal.aborted
      ? `tempo limite de ${QUERY_TIMEOUT_MS / 1000}s excedido`
      : (err as Error).message;
    console.warn(`[REST] ${label} falhou em ${ms}ms: ${reason}`);
    throw new Error(`Não foi possível carregar ${label} (${reason})`);
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// Sellers
// ============================================================================
type SellerRow = {
  id: string;
  full_name: string;
  email: string;
  team: string;
  avatar_color: string;
  active: boolean;
};

export function useSellers() {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async (): Promise<Seller[]> => {
      const rows = await fetchRows<SellerRow>(
        'sellers',
        'sellers?select=id,full_name,email,team,avatar_color,active&order=full_name.asc',
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
      const payload = {
        full_name: s.fullName,
        email: s.email,
        team: s.team ?? 'Closer',
        avatar_color: s.avatarColor ?? '#8b5cf6',
        active: s.active ?? true,
      };
      if (s.id) {
        return restUpdate<SellerRow>('sellers', `id=eq.${s.id}`, payload);
      }
      return restInsert<SellerRow>('sellers', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sellers'] }),
  });
}

export function useDeleteSeller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('sellers', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sellers'] }),
  });
}

// ============================================================================
// Courses
// ============================================================================
type CourseRow = { id: string; name: string; price: number | string };

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async (): Promise<Course[]> => {
      const rows = await fetchRows<CourseRow>(
        'courses',
        'courses?select=id,name,price&order=name.asc',
      );
      return rows.map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
    },
  });
}

export function useUpsertCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Course> & { name: string; price: number }) => {
      const payload = { name: c.name, price: c.price };
      if (c.id) return restUpdate<CourseRow>('courses', `id=eq.${c.id}`, payload);
      return restInsert<CourseRow>('courses', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('courses', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

// ============================================================================
// Monthly Goals
// ============================================================================
type GoalRow = {
  seller_id: string;
  year_month: string;
  points_goal: number | string | null;
  revenue_goal: number | string | null;
  courses_goal: number;
  business_days: number;
};

export function useMonthlyGoals() {
  return useQuery({
    queryKey: ['monthly_goals'],
    queryFn: async (): Promise<MonthlyGoal[]> => {
      const rows = await fetchRows<GoalRow>(
        'monthly_goals',
        'monthly_goals?select=seller_id,year_month,points_goal,revenue_goal,courses_goal,business_days',
      );
      return rows.map((r) => ({
        sellerId: r.seller_id,
        yearMonth: r.year_month,
        pointsGoal: Number(r.points_goal ?? 0),
        revenueGoal: r.revenue_goal != null ? Number(r.revenue_goal) : undefined,
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
        points_goal: g.pointsGoal,
        courses_goal: g.coursesGoal,
        business_days: g.businessDays,
      };
      // Upsert nativo do PostgREST via ON CONFLICT.
      // Antes fazia try UPDATE catch INSERT, mas UPDATE nao lanca em 0 rows,
      // entao meta nova nunca era inserida. Fix: usar restUpsert.
      await restUpsert(
        'monthly_goals',
        payload,
        'seller_id,year_month',
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly_goals'] }),
  });
}

// ============================================================================
// Leads
// ============================================================================
type LeadRow = {
  id: string;
  seller_id: string | null;
  source: string | null;
  stage: Lead['stage'];
  created_at: string;
  stage_changed_at: string;
};

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      const rows = await fetchRows<LeadRow>(
        'leads',
        'leads?select=id,seller_id,source,stage,created_at,stage_changed_at&order=created_at.desc',
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
      if (l.id) return restUpdate('leads', `id=eq.${l.id}`, payload);
      return restInsert('leads', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('leads', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

// ============================================================================
// Sales
// ============================================================================
type SaleRow = {
  id: string;
  seller_id: string;
  lead_id: string | null;
  course_id: string;
  amount: number | string;
  payment_method: Sale['paymentMethod'];
  installments: number;
  sold_at: string;
  commission_points: number | string | null;
};

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async (): Promise<Sale[]> => {
      const rows = await fetchRows<SaleRow>(
        'sales',
        'sales?select=id,seller_id,lead_id,course_id,amount,payment_method,installments,sold_at,commission_points&order=sold_at.desc',
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
        commissionPoints: r.commission_points != null ? Number(r.commission_points) : null,
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
        seller_id: s.sellerId,
        lead_id: s.leadId ?? null,
        course_id: s.courseId,
        amount: s.amount,
        payment_method: s.paymentMethod,
        installments: s.installments ?? 1,
        sold_at: s.soldAt ?? new Date().toISOString(),
      };
      if (s.id) return restUpdate('sales', `id=eq.${s.id}`, payload);
      return restInsert('sales', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('sales', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

// ============================================================================
// Traffic Spend
// ============================================================================
type TrafficRow = {
  id: string;
  spend_date: string;
  channel: string;
  amount: number | string;
};

export function useTrafficSpend() {
  return useQuery({
    queryKey: ['traffic_spend'],
    queryFn: async (): Promise<TrafficSpend[]> => {
      const rows = await fetchRows<TrafficRow>(
        'traffic_spend',
        'traffic_spend?select=id,spend_date,channel,amount&order=spend_date.desc',
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
      const payload = { spend_date: t.spendDate, channel: t.channel, amount: t.amount };
      if (t.id) return restUpdate('traffic_spend', `id=eq.${t.id}`, payload);
      return restInsert('traffic_spend', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traffic_spend'] }),
  });
}

export function useDeleteTrafficSpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('traffic_spend', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traffic_spend'] }),
  });
}

// ============================================================================
// Points adjustments (ajustes manuais do admin)
// ============================================================================
type AdjRow = {
  id: string;
  seller_id: string;
  year_month: string;
  points: number | string;
  reason: string;
  created_by: string | null;
  created_at: string;
};

export function usePointsAdjustments() {
  return useQuery({
    queryKey: ['points_adjustments'],
    queryFn: async (): Promise<PointsAdjustment[]> => {
      try {
        const rows = await fetchRows<AdjRow>(
          'points_adjustments',
          'points_adjustments?select=id,seller_id,year_month,points,reason,created_by,created_at&order=created_at.desc',
        );
        return rows.map((r) => ({
          id: r.id,
          sellerId: r.seller_id,
          yearMonth: r.year_month,
          points: Number(r.points),
          reason: r.reason,
          createdBy: r.created_by,
          createdAt: r.created_at,
        }));
      } catch (err) {
        // Tabela pode nao existir ainda (migration 0014 nao rodou) —
        // retorna vazio pra nao quebrar o dashboard
        const msg = (err as Error).message;
        if (msg.includes('404') || msg.includes('does not exist')) return [];
        throw err;
      }
    },
  });
}

export function useAddPointsAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: {
      sellerId: string;
      yearMonth: string;
      points: number;
      reason: string;
    }) =>
      restInsert('points_adjustments', {
        seller_id: a.sellerId,
        year_month: a.yearMonth,
        points: a.points,
        reason: a.reason,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['points_adjustments'] }),
  });
}

export function useDeletePointsAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('points_adjustments', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['points_adjustments'] }),
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
  const adjustments = usePointsAdjustments();

  const queries = [sellers, courses, leads, sales, goals, traffic, adjustments];
  const isLoading = queries.some((q) => q.isLoading);
  const error = (queries.find((q) => q.isError)?.error as Error | undefined) ?? null;
  const refetch = () => {
    queries.forEach((q) => void q.refetch());
  };

  return {
    sellers: sellers.data ?? [],
    courses: courses.data ?? [],
    leads: leads.data ?? [],
    sales: sales.data ?? [],
    goals: goals.data ?? [],
    traffic: traffic.data ?? [],
    adjustments: adjustments.data ?? [],
    isLoading,
    error,
    refetch,
  };
}
