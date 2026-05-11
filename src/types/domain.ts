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
