export type LeadStage =
  | 'LEAD'
  | 'MQL'
  | 'SQL'
  | 'AGENDADA'
  | 'REALIZADA'
  | 'NO_SHOW'
  | 'VENDA'
  | 'PERDA';

export type PaymentMethod =
  | 'AVISTA'
  | 'CARTAO_PARCELADO'
  | 'CARTAO_RECORRENCIA'
  | 'BOLETO'
  | 'PIX';

export interface Seller {
  id: string;
  fullName: string;
  email: string;
  team: string;
  active: boolean;
  avatarColor: string;
}

export interface MonthlyGoal {
  sellerId: string;
  yearMonth: string;
  revenueGoal: number;
  coursesGoal: number;
  businessDays: number;
}

export interface Lead {
  id: string;
  sellerId: string;
  source: string;
  stage: LeadStage;
  createdAt: string;
  stageChangedAt: string;
}

export interface Sale {
  id: string;
  sellerId: string;
  leadId: string | null;
  courseId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  installments: number;
  soldAt: string;
}

export interface Course {
  id: string;
  name: string;
  price: number;
}

export interface TrafficSpend {
  id: string;
  spendDate: string;
  channel: string;
  amount: number;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  AVISTA: 'À vista',
  CARTAO_PARCELADO: 'Cartão parcelado',
  CARTAO_RECORRENCIA: 'Cartão recorrência',
  BOLETO: 'Boleto',
  PIX: 'Pix',
};

// ============================================================================
// Customer Success
// ============================================================================

export type EnrollmentStatus = 'active' | 'cancelled' | 'overdue' | 'paused';

export type TicketCategory =
  | 'duvida_conteudo'
  | 'duvida_tecnica'
  | 'financeiro'
  | 'sugestao'
  | 'reclamacao'
  | 'outros';

export type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
export type TicketPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Student {
  id: string;
  fullName: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  sellerId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  saleId: string | null;
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  status: EnrollmentStatus;
  nextRenewalAt: string | null;
  enrolledAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface CSTicket {
  id: string;
  studentId: string;
  category: TicketCategory;
  subject: string;
  body: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface CSNote {
  id: string;
  studentId: string;
  body: string;
  createdBy: string | null;
  createdAt: string;
}

export interface NPSResponse {
  id: string;
  studentId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface OnboardingStep {
  id: string;
  studentId: string;
  stepKey: string;
  completedAt: string | null;
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: 'Ativa',
  cancelled: 'Cancelada',
  overdue: 'Atrasada',
  paused: 'Pausada',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  duvida_conteudo: 'Dúvida de conteúdo',
  duvida_tecnica: 'Dúvida técnica',
  financeiro: 'Financeiro',
  sugestao: 'Sugestão',
  reclamacao: 'Reclamação',
  outros: 'Outros',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const ONBOARDING_DEFAULT_STEPS: { key: string; label: string }[] = [
  { key: 'welcome', label: 'Boas-vindas enviadas' },
  { key: 'first_contact', label: 'Primeiro contato realizado' },
  { key: 'access_given', label: 'Acesso ao curso entregue' },
  { key: 'community', label: 'Convite para comunidade' },
  { key: 'first_checkin', label: 'Primeiro check-in (30 dias)' },
];

// ============================================================================
// Workspace
// ============================================================================

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export type MaterialCategory =
  | 'script'
  | 'apresentacao'
  | 'video'
  | 'faq'
  | 'objecao'
  | 'politica'
  | 'outros';

export interface WorkspaceTask {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  relatedStudentId: string | null;
  relatedLeadId: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WorkspaceMaterial {
  id: string;
  title: string;
  description: string | null;
  category: MaterialCategory;
  url: string | null;
  body: string | null;
  tags: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em andamento',
  done: 'Concluída',
  cancelled: 'Cancelada',
};

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  script: 'Script de venda',
  apresentacao: 'Apresentação',
  video: 'Vídeo',
  faq: 'FAQ',
  objecao: 'Quebra de objeção',
  politica: 'Política',
  outros: 'Outros',
};

export const STAGE_LABELS: Record<LeadStage, string> = {
  LEAD: 'Leads',
  MQL: 'MQLs',
  SQL: 'SQLs',
  AGENDADA: 'Agendadas',
  REALIZADA: 'Realizadas',
  NO_SHOW: 'No-Shows',
  VENDA: 'Vendas',
  PERDA: 'Perdas',
};
