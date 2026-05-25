import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restGet, restInsert, restUpdate, restDelete } from '@/lib/supabase';
import type {
  Student,
  Enrollment,
  CSTicket,
  CSNote,
  NPSResponse,
  OnboardingStep,
} from '@/types/domain';

const TIMEOUT = 15000;

async function safe<T>(label: string, p: PromiseLike<T[]>): Promise<T[]> {
  const start = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const rows = await p;
    console.info(
      `[REST] ${label} OK em ${Math.round(performance.now() - start)}ms (${rows.length} rows)`,
    );
    return rows;
  } catch (err) {
    console.warn(`[REST] ${label} falhou:`, (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// Students
// ============================================================================
type StudentRow = {
  id: string;
  full_name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  seller_id: string | null;
  notes: string | null;
  created_at: string;
};

const mapStudent = (r: StudentRow): Student => ({
  id: r.id,
  fullName: r.full_name,
  cpf: r.cpf,
  email: r.email,
  phone: r.phone,
  sellerId: r.seller_id,
  notes: r.notes,
  createdAt: r.created_at,
});

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async (): Promise<Student[]> => {
      const rows = await safe<StudentRow>(
        'students',
        restGet<StudentRow[]>(
          'students?select=id,full_name,cpf,email,phone,seller_id,notes,created_at&order=full_name.asc',
        ),
      );
      return rows.map(mapStudent);
    },
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ['students', id],
    enabled: !!id,
    queryFn: async (): Promise<Student | null> => {
      if (!id) return null;
      const rows = await restGet<StudentRow[]>(
        `students?id=eq.${id}&select=id,full_name,cpf,email,phone,seller_id,notes,created_at&limit=1`,
      );
      return rows[0] ? mapStudent(rows[0]) : null;
    },
  });
}

export function useUpsertStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<Student> & { fullName: string }) => {
      const payload: Record<string, unknown> = {
        full_name: s.fullName,
        cpf: s.cpf || null,
        email: s.email || null,
        phone: s.phone || null,
        seller_id: s.sellerId || null,
        notes: s.notes || null,
      };
      if (s.id) return restUpdate<StudentRow>('students', `id=eq.${s.id}`, payload);
      return restInsert<StudentRow>('students', payload);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      if (vars.id) qc.invalidateQueries({ queryKey: ['students', vars.id] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('students', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

// ============================================================================
// Enrollments
// ============================================================================
type EnrollmentRow = {
  id: string;
  student_id: string;
  course_id: string;
  sale_id: string | null;
  payment_method: Enrollment['paymentMethod'];
  is_recurring: boolean;
  status: Enrollment['status'];
  next_renewal_at: string | null;
  enrolled_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

const mapEnrollment = (r: EnrollmentRow): Enrollment => ({
  id: r.id,
  studentId: r.student_id,
  courseId: r.course_id,
  saleId: r.sale_id,
  paymentMethod: r.payment_method,
  isRecurring: r.is_recurring,
  status: r.status,
  nextRenewalAt: r.next_renewal_at,
  enrolledAt: r.enrolled_at,
  cancelledAt: r.cancelled_at,
  cancellationReason: r.cancellation_reason,
});

export function useEnrollments(studentId?: string) {
  return useQuery({
    queryKey: ['enrollments', studentId ?? 'all'],
    queryFn: async (): Promise<Enrollment[]> => {
      const filter = studentId ? `&student_id=eq.${studentId}` : '';
      const rows = await safe<EnrollmentRow>(
        `enrollments${studentId ? `(${studentId.slice(0, 8)})` : ''}`,
        restGet<EnrollmentRow[]>(
          `enrollments?select=*${filter}&order=enrolled_at.desc`,
        ),
      );
      return rows.map(mapEnrollment);
    },
  });
}

export function useUpsertEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<Enrollment> & {
      studentId: string;
      courseId: string;
      paymentMethod: Enrollment['paymentMethod'];
    }) => {
      const payload: Record<string, unknown> = {
        student_id: e.studentId,
        course_id: e.courseId,
        sale_id: e.saleId ?? null,
        payment_method: e.paymentMethod,
        is_recurring: e.isRecurring ?? false,
        status: e.status ?? 'active',
        next_renewal_at: e.nextRenewalAt ?? null,
      };
      if (e.id) return restUpdate('enrollments', `id=eq.${e.id}`, payload);
      return restInsert('enrollments', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

export function useDeleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('enrollments', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}

// ============================================================================
// Tickets
// ============================================================================
type TicketRow = {
  id: string;
  student_id: string;
  category: CSTicket['category'];
  subject: string;
  body: string | null;
  status: CSTicket['status'];
  priority: CSTicket['priority'];
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

const mapTicket = (r: TicketRow): CSTicket => ({
  id: r.id,
  studentId: r.student_id,
  category: r.category,
  subject: r.subject,
  body: r.body,
  status: r.status,
  priority: r.priority,
  assignedTo: r.assigned_to,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
  resolutionNote: r.resolution_note,
});

export function useTickets(studentId?: string) {
  return useQuery({
    queryKey: ['cs_tickets', studentId ?? 'all'],
    queryFn: async (): Promise<CSTicket[]> => {
      const filter = studentId ? `&student_id=eq.${studentId}` : '';
      const rows = await safe<TicketRow>(
        'cs_tickets',
        restGet<TicketRow[]>(`cs_tickets?select=*${filter}&order=created_at.desc`),
      );
      return rows.map(mapTicket);
    },
  });
}

export function useUpsertTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<CSTicket> & { studentId: string; subject: string }) => {
      const payload: Record<string, unknown> = {
        student_id: t.studentId,
        category: t.category ?? 'outros',
        subject: t.subject,
        body: t.body ?? null,
        status: t.status ?? 'aberto',
        priority: t.priority ?? 'media',
        assigned_to: t.assignedTo ?? null,
        resolution_note: t.resolutionNote ?? null,
      };
      if (t.status === 'resolvido' || t.status === 'fechado') {
        payload.resolved_at = new Date().toISOString();
      }
      if (t.id) return restUpdate('cs_tickets', `id=eq.${t.id}`, payload);
      return restInsert('cs_tickets', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs_tickets'] }),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('cs_tickets', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs_tickets'] }),
  });
}

// ============================================================================
// Notes
// ============================================================================
type NoteRow = {
  id: string;
  student_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

export function useNotes(studentId?: string) {
  return useQuery({
    queryKey: ['cs_notes', studentId ?? 'all'],
    enabled: !!studentId,
    queryFn: async (): Promise<CSNote[]> => {
      if (!studentId) return [];
      const rows = await safe<NoteRow>(
        'cs_notes',
        restGet<NoteRow[]>(
          `cs_notes?student_id=eq.${studentId}&select=*&order=created_at.desc`,
        ),
      );
      return rows.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        body: r.body,
        createdBy: r.created_by,
        createdAt: r.created_at,
      }));
    },
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: { studentId: string; body: string; createdBy?: string }) => {
      const payload = {
        student_id: n.studentId,
        body: n.body,
        created_by: n.createdBy ?? null,
      };
      return restInsert('cs_notes', payload);
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['cs_notes', vars.studentId] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('cs_notes', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs_notes'] }),
  });
}

// ============================================================================
// NPS
// ============================================================================
type NPSRow = {
  id: string;
  student_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

export function useNPSResponses() {
  return useQuery({
    queryKey: ['nps_responses'],
    queryFn: async (): Promise<NPSResponse[]> => {
      const rows = await safe<NPSRow>(
        'nps_responses',
        restGet<NPSRow[]>('nps_responses?select=*&order=created_at.desc'),
      );
      return rows.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        score: r.score,
        comment: r.comment,
        createdAt: r.created_at,
      }));
    },
  });
}

export function useNPSForStudent(studentId?: string) {
  return useQuery({
    queryKey: ['nps_responses', studentId ?? 'all'],
    enabled: !!studentId,
    queryFn: async (): Promise<NPSResponse[]> => {
      if (!studentId) return [];
      const rows = await restGet<NPSRow[]>(
        `nps_responses?student_id=eq.${studentId}&select=*&order=created_at.desc`,
      );
      return rows.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        score: r.score,
        comment: r.comment,
        createdAt: r.created_at,
      }));
    },
  });
}

export function useAddNPS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: { studentId: string; score: number; comment?: string }) => {
      const payload = {
        student_id: n.studentId,
        score: n.score,
        comment: n.comment ?? null,
      };
      return restInsert('nps_responses', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nps_responses'] }),
  });
}

// ============================================================================
// Onboarding
// ============================================================================
type OnboardingRow = {
  id: string;
  student_id: string;
  step_key: string;
  completed_at: string | null;
};

export function useOnboarding(studentId?: string) {
  return useQuery({
    queryKey: ['onboarding_steps', studentId ?? 'all'],
    enabled: !!studentId,
    queryFn: async (): Promise<OnboardingStep[]> => {
      if (!studentId) return [];
      const rows = await restGet<OnboardingRow[]>(
        `onboarding_steps?student_id=eq.${studentId}&select=*`,
      );
      return rows.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        stepKey: r.step_key,
        completedAt: r.completed_at,
      }));
    },
  });
}

export function useToggleOnboardingStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { studentId: string; stepKey: string; completed: boolean }) => {
      // tenta update primeiro
      const existing = await restGet<OnboardingRow[]>(
        `onboarding_steps?student_id=eq.${vars.studentId}&step_key=eq.${vars.stepKey}&limit=1`,
      );
      const completed_at = vars.completed ? new Date().toISOString() : null;
      if (existing[0]) {
        return restUpdate(
          'onboarding_steps',
          `id=eq.${existing[0].id}`,
          { completed_at },
        );
      }
      return restInsert('onboarding_steps', {
        student_id: vars.studentId,
        step_key: vars.stepKey,
        completed_at,
      });
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['onboarding_steps', vars.studentId] }),
  });
}

// ============================================================================
// Health Score (calculado client-side)
// Inputs: enrollments do aluno, tickets abertos, ultimo NPS, % onboarding
// ============================================================================
export function computeHealthScore(input: {
  enrollments: Enrollment[];
  openTickets: number;
  lastNPS: number | null;
  onboardingPct: number;
}): { score: number; level: 'saudavel' | 'atencao' | 'critico' } {
  let score = 100;
  const { enrollments, openTickets, lastNPS, onboardingPct } = input;

  if (enrollments.some((e) => e.status === 'overdue')) score -= 30;
  if (enrollments.some((e) => e.status === 'cancelled') && !enrollments.some((e) => e.status === 'active'))
    score -= 40;
  if (openTickets >= 3) score -= 25;
  else if (openTickets >= 1) score -= 10;
  if (lastNPS !== null && lastNPS <= 6) score -= 25;
  if (onboardingPct < 0.6) score -= 10;

  score = Math.max(0, Math.min(100, score));
  const level = score >= 80 ? 'saudavel' : score >= 50 ? 'atencao' : 'critico';
  return { score, level };
}
