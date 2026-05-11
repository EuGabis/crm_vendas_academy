import type {
  Course,
  Lead,
  LeadStage,
  MonthlyGoal,
  PaymentMethod,
  Sale,
  Seller,
  TrafficSpend,
} from '@/types/domain';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260511);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const betweenF = (min: number, max: number) => min + rand() * (max - min);

export const sellers: Seller[] = [
  {
    id: 's-helena',
    fullName: 'Helena Martins Silva',
    email: 'helena@litoacademy.com',
    team: 'Closer Premium',
    active: true,
    avatarColor: '#8b5cf6',
  },
  {
    id: 's-daniel',
    fullName: 'Daniel Gonçalves',
    email: 'daniel@litoacademy.com',
    team: 'Closer Premium',
    active: true,
    avatarColor: '#10b981',
  },
  {
    id: 's-juan',
    fullName: 'Juan Borges',
    email: 'juan@litoacademy.com',
    team: 'Closer Premium',
    active: true,
    avatarColor: '#f59e0b',
  },
  {
    id: 's-mateus',
    fullName: 'Mateus Eda',
    email: 'mateus@litoacademy.com',
    team: 'Closer Plus',
    active: true,
    avatarColor: '#ef4444',
  },
  {
    id: 's-camila',
    fullName: 'Camila Rocha',
    email: 'camila@litoacademy.com',
    team: 'Closer Plus',
    active: true,
    avatarColor: '#3b82f6',
  },
  {
    id: 's-rafael',
    fullName: 'Rafael Tavares',
    email: 'rafael@litoacademy.com',
    team: 'Closer Plus',
    active: true,
    avatarColor: '#ec4899',
  },
];

export const courses: Course[] = [
  { id: 'c-via-master', name: 'VIA Master', price: 4997 },
  { id: 'c-via-pro', name: 'VIA Pro', price: 2997 },
  { id: 'c-via-start', name: 'VIA Start', price: 997 },
  { id: 'c-mentoria-1on1', name: 'Mentoria 1-on-1', price: 9997 },
  { id: 'c-comunidade-anual', name: 'Comunidade VIA Anual', price: 1497 },
];

const TODAY = new Date(2026, 4, 11);
const MONTH_START = new Date(2026, 4, 1);
const RANGE_START = new Date(2026, 1, 1);

const SOURCES = ['Meta Ads', 'Google Ads', 'Orgânico', 'Indicação', 'YouTube', 'Webinar'];
const CHANNELS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'YouTube Ads'];

const STAGE_DISTRIBUTION: { stage: LeadStage; weight: number }[] = [
  { stage: 'LEAD', weight: 28 },
  { stage: 'MQL', weight: 20 },
  { stage: 'SQL', weight: 14 },
  { stage: 'AGENDADA', weight: 10 },
  { stage: 'REALIZADA', weight: 8 },
  { stage: 'NO_SHOW', weight: 6 },
  { stage: 'VENDA', weight: 10 },
  { stage: 'PERDA', weight: 4 },
];

function weightedStage(): LeadStage {
  const total = STAGE_DISTRIBUTION.reduce((a, b) => a + b.weight, 0);
  let r = rand() * total;
  for (const { stage, weight } of STAGE_DISTRIBUTION) {
    if ((r -= weight) <= 0) return stage;
  }
  return 'LEAD';
}

function sellerWeight(id: string) {
  return id === 's-helena'
    ? 1.35
    : id === 's-daniel'
      ? 1.15
      : id === 's-juan'
        ? 1.0
        : id === 's-mateus'
          ? 0.95
          : id === 's-camila'
            ? 0.85
            : 0.75;
}

function pickSellerWeighted(): Seller {
  const totals = sellers.map((s) => sellerWeight(s.id));
  const sum = totals.reduce((a, b) => a + b, 0);
  let r = rand() * sum;
  for (let i = 0; i < sellers.length; i++) {
    if ((r -= totals[i]) <= 0) return sellers[i];
  }
  return sellers[0];
}

function randomDateBetween(start: Date, end: Date) {
  const t = start.getTime() + rand() * (end.getTime() - start.getTime());
  return new Date(t);
}

// ------- Generate leads (last 90 days) -------
const LEADS_COUNT = 980;
export const leads: Lead[] = [];

for (let i = 0; i < LEADS_COUNT; i++) {
  const seller = pickSellerWeighted();
  const createdAt = randomDateBetween(RANGE_START, TODAY);
  const stage = weightedStage();
  const stageChangedAt = new Date(
    createdAt.getTime() + between(0, 14) * 24 * 3600 * 1000,
  );
  leads.push({
    id: `l-${i.toString().padStart(4, '0')}`,
    sellerId: seller.id,
    source: pick(SOURCES),
    stage,
    createdAt: createdAt.toISOString(),
    stageChangedAt: (stageChangedAt > TODAY ? TODAY : stageChangedAt).toISOString(),
  });
}

// ------- Generate sales -------
const saleLeads = leads.filter((l) => l.stage === 'VENDA');
export const sales: Sale[] = saleLeads.map((lead, idx) => {
  const course = pick(courses);
  const paymentRoll = rand();
  let paymentMethod: PaymentMethod;
  let installments = 1;
  if (paymentRoll < 0.22) {
    paymentMethod = 'AVISTA';
  } else if (paymentRoll < 0.6) {
    paymentMethod = 'CARTAO_PARCELADO';
    installments = pick([6, 10, 12, 12, 12, 18]);
  } else if (paymentRoll < 0.78) {
    paymentMethod = 'CARTAO_RECORRENCIA';
    installments = 12;
  } else if (paymentRoll < 0.9) {
    paymentMethod = 'PIX';
  } else {
    paymentMethod = 'BOLETO';
  }
  const discount = betweenF(0.85, 1.0);
  return {
    id: `sale-${idx.toString().padStart(4, '0')}`,
    sellerId: lead.sellerId,
    leadId: lead.id,
    courseId: course.id,
    amount: Math.round(course.price * discount),
    paymentMethod,
    installments,
    soldAt: lead.stageChangedAt,
  };
});

// Extra sales for current month so dashboards look alive
for (let i = 0; i < 38; i++) {
  const seller = pickSellerWeighted();
  const course = pick(courses);
  const soldAt = randomDateBetween(MONTH_START, TODAY);
  const paymentRoll = rand();
  let paymentMethod: PaymentMethod;
  let installments = 1;
  if (paymentRoll < 0.22) {
    paymentMethod = 'AVISTA';
  } else if (paymentRoll < 0.6) {
    paymentMethod = 'CARTAO_PARCELADO';
    installments = pick([6, 10, 12, 12, 18]);
  } else if (paymentRoll < 0.78) {
    paymentMethod = 'CARTAO_RECORRENCIA';
    installments = 12;
  } else if (paymentRoll < 0.9) {
    paymentMethod = 'PIX';
  } else {
    paymentMethod = 'BOLETO';
  }
  sales.push({
    id: `sale-extra-${i.toString().padStart(3, '0')}`,
    sellerId: seller.id,
    leadId: null,
    courseId: course.id,
    amount: Math.round(course.price * betweenF(0.85, 1.0)),
    paymentMethod,
    installments,
    soldAt: soldAt.toISOString(),
  });
}

// ------- Monthly goals (current month) -------
export const monthlyGoals: MonthlyGoal[] = sellers.map((s) => {
  const baseGoal =
    s.id === 's-helena'
      ? 95000
      : s.id === 's-daniel'
        ? 78000
        : s.id === 's-juan'
          ? 65000
          : s.id === 's-mateus'
            ? 60000
            : s.id === 's-camila'
              ? 50000
              : 42000;
  return {
    sellerId: s.id,
    yearMonth: MONTH_START.toISOString().slice(0, 10),
    revenueGoal: baseGoal,
    coursesGoal: Math.round(baseGoal / 3500),
    businessDays: 21,
  };
});

// ------- Traffic spend (current month) -------
export const trafficSpend: TrafficSpend[] = [];
const daysInRange = Math.ceil((TODAY.getTime() - MONTH_START.getTime()) / (24 * 3600 * 1000)) + 1;
for (let d = 0; d < daysInRange; d++) {
  const day = new Date(MONTH_START.getTime() + d * 24 * 3600 * 1000);
  for (const channel of CHANNELS) {
    const base =
      channel === 'Meta Ads' ? 1100 : channel === 'Google Ads' ? 800 : channel === 'YouTube Ads' ? 350 : 250;
    trafficSpend.push({
      id: `ts-${d}-${channel}`,
      spendDate: day.toISOString().slice(0, 10),
      channel,
      amount: Math.round(base * betweenF(0.75, 1.3)),
    });
  }
}

export const todayDate = TODAY;
export const monthStart = MONTH_START;
