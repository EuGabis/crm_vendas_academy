import {
  leads,
  sales,
  sellers,
  monthlyGoals,
  trafficSpend,
  courses,
  todayDate,
} from './seed-data';
import type { LeadStage, PaymentMethod, Sale } from '@/types/domain';
import { businessDaysElapsed, businessDaysInMonth } from '@/lib/utils';

export interface PeriodFilter {
  year: number;
  month: number;
  sellerId?: string | 'all';
}

function inMonth(iso: string, year: number, month: number) {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

function filterSeller<T extends { sellerId: string }>(arr: T[], sellerId?: string | 'all') {
  if (!sellerId || sellerId === 'all') return arr;
  return arr.filter((x) => x.sellerId === sellerId);
}

export function getSellers() {
  return sellers;
}

export function getCourses() {
  return courses;
}

export function getGoalsForMonth(year: number, month: number) {
  const ym = new Date(year, month, 1).toISOString().slice(0, 10);
  return monthlyGoals.filter((g) => g.yearMonth === ym);
}

export function getGoalForSeller(year: number, month: number, sellerId: string) {
  return getGoalsForMonth(year, month).find((g) => g.sellerId === sellerId);
}

export function getConsolidatedGoal(filter: PeriodFilter) {
  const goals = getGoalsForMonth(filter.year, filter.month);
  if (filter.sellerId && filter.sellerId !== 'all') {
    const g = goals.find((x) => x.sellerId === filter.sellerId);
    return {
      revenueGoal: g?.revenueGoal ?? 0,
      coursesGoal: g?.coursesGoal ?? 0,
      businessDays: g?.businessDays ?? 21,
    };
  }
  return {
    revenueGoal: goals.reduce((a, b) => a + b.revenueGoal, 0),
    coursesGoal: goals.reduce((a, b) => a + b.coursesGoal, 0),
    businessDays: goals[0]?.businessDays ?? 21,
  };
}

export function getMonthSales(filter: PeriodFilter): Sale[] {
  return filterSeller(
    sales.filter((s) => inMonth(s.soldAt, filter.year, filter.month)),
    filter.sellerId,
  );
}

export function getMonthLeads(filter: PeriodFilter) {
  return filterSeller(
    leads.filter((l) => inMonth(l.createdAt, filter.year, filter.month)),
    filter.sellerId,
  );
}

export function getStageCount(filter: PeriodFilter, stage: LeadStage) {
  return getMonthLeads(filter).filter((l) => l.stage === stage).length;
}

export function getFunnelMetrics(filter: PeriodFilter) {
  const monthLeads = getMonthLeads(filter);
  const total = monthLeads.length;
  const mqls = monthLeads.filter((l) =>
    ['MQL', 'SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'].includes(l.stage),
  ).length;
  const sqls = monthLeads.filter((l) =>
    ['SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'].includes(l.stage),
  ).length;
  const agendadas = monthLeads.filter((l) =>
    ['AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA'].includes(l.stage),
  ).length;
  const realizadas = monthLeads.filter((l) =>
    ['REALIZADA', 'VENDA'].includes(l.stage),
  ).length;
  const noShows = monthLeads.filter((l) => l.stage === 'NO_SHOW').length;
  const vendas = monthLeads.filter((l) => l.stage === 'VENDA').length;
  return { total, mqls, sqls, agendadas, realizadas, noShows, vendas };
}

export function getDailyRevenue(filter: PeriodFilter) {
  const monthSales = getMonthSales(filter);
  const daysInMonth = new Date(filter.year, filter.month + 1, 0).getDate();
  const byDay: Record<number, number> = {};
  for (const s of monthSales) {
    const day = new Date(s.soldAt).getDate();
    byDay[day] = (byDay[day] ?? 0) + s.amount;
  }
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return { day, revenue: byDay[day] ?? 0 };
  });
}

export function getAccumulatedVsGoal(filter: PeriodFilter) {
  const daily = getDailyRevenue(filter);
  const { revenueGoal } = getConsolidatedGoal(filter);
  const daysInMonth = daily.length;
  const businessDays = businessDaysInMonth(filter.year, filter.month);
  const dailyGoal = revenueGoal / businessDays;
  let cumulative = 0;
  let cumulativeGoal = 0;
  const todayDay =
    filter.year === todayDate.getFullYear() && filter.month === todayDate.getMonth()
      ? todayDate.getDate()
      : daysInMonth;

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(filter.year, filter.month, day);
    const isBusiness = date.getDay() !== 0 && date.getDay() !== 6;
    if (isBusiness) cumulativeGoal += dailyGoal;
    if (day <= todayDay) cumulative += daily[i].revenue;
    return {
      day,
      label: day.toString().padStart(2, '0'),
      vendido: day <= todayDay ? Math.round(cumulative) : null,
      meta: Math.round(cumulativeGoal),
    };
  });
}

export function getRevenueSum(filter: PeriodFilter) {
  return getMonthSales(filter).reduce((a, s) => a + s.amount, 0);
}

export function getCoursesSold(filter: PeriodFilter) {
  return getMonthSales(filter).length;
}

export function getPaymentMethodBreakdown(filter: PeriodFilter) {
  const monthSales = getMonthSales(filter);
  const methods: PaymentMethod[] = [
    'AVISTA',
    'CARTAO_PARCELADO',
    'CARTAO_RECORRENCIA',
    'BOLETO',
    'PIX',
  ];
  const totalAmount = monthSales.reduce((a, s) => a + s.amount, 0) || 1;
  return methods.map((m) => {
    const filtered = monthSales.filter((s) => s.paymentMethod === m);
    const amount = filtered.reduce((a, s) => a + s.amount, 0);
    return {
      method: m,
      count: filtered.length,
      amount,
      share: amount / totalAmount,
    };
  });
}

export function getSellerCards(filter: PeriodFilter) {
  return sellers.map((seller) => {
    const goal = getGoalForSeller(filter.year, filter.month, seller.id);
    const sellerSales = sales.filter(
      (s) => s.sellerId === seller.id && inMonth(s.soldAt, filter.year, filter.month),
    );
    const revenue = sellerSales.reduce((a, s) => a + s.amount, 0);
    const sellerLeads = leads.filter(
      (l) => l.sellerId === seller.id && inMonth(l.createdAt, filter.year, filter.month),
    );
    const vendas = sellerLeads.filter((l) => l.stage === 'VENDA').length;
    const mqls = sellerLeads.filter((l) =>
      ['MQL', 'SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'].includes(l.stage),
    ).length;
    const sqls = sellerLeads.filter((l) =>
      ['SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'].includes(l.stage),
    ).length;
    const agendadas = sellerLeads.filter((l) =>
      ['AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA'].includes(l.stage),
    ).length;
    const realizadas = sellerLeads.filter((l) =>
      ['REALIZADA', 'VENDA'].includes(l.stage),
    ).length;
    const noShows = sellerLeads.filter((l) => l.stage === 'NO_SHOW').length;
    return {
      seller,
      goal: goal?.revenueGoal ?? 0,
      revenue,
      leadsCount: sellerLeads.length,
      mqls,
      sqls,
      agendadas,
      realizadas,
      noShows,
      vendas,
      coursesSold: sellerSales.length,
      conversion: sellerLeads.length ? vendas / sellerLeads.length : 0,
    };
  });
}

export function getMonthTrafficSpend(filter: PeriodFilter) {
  return trafficSpend.filter((t) =>
    inMonth(new Date(t.spendDate).toISOString(), filter.year, filter.month),
  );
}

export function getMarketingMetrics(filter: PeriodFilter) {
  const monthSpend = getMonthTrafficSpend(filter);
  const investment = monthSpend.reduce((a, t) => a + t.amount, 0);
  const monthSales = getMonthSales({ ...filter, sellerId: 'all' });
  const revenue = monthSales.reduce((a, s) => a + s.amount, 0);
  const monthLeads = getMonthLeads({ ...filter, sellerId: 'all' });
  const totalLeads = monthLeads.length;
  const mqls = monthLeads.filter((l) =>
    ['MQL', 'SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'].includes(l.stage),
  ).length;
  const sqls = monthLeads.filter((l) =>
    ['SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'].includes(l.stage),
  ).length;
  const vendasCount = monthSales.length;
  return {
    investment,
    revenue,
    cac: vendasCount ? investment / vendasCount : 0,
    cpl: totalLeads ? investment / totalLeads : 0,
    cpm: mqls ? investment / mqls : 0,
    cps: sqls ? investment / sqls : 0,
    roi: investment ? (revenue - investment) / investment : 0,
    ticketMedio: vendasCount ? revenue / vendasCount : 0,
  };
}

export function getSpendByDay(filter: PeriodFilter) {
  const monthSpend = getMonthTrafficSpend(filter);
  const daysInMonth = new Date(filter.year, filter.month + 1, 0).getDate();
  const byDay: Record<number, number> = {};
  for (const t of monthSpend) {
    const day = new Date(t.spendDate).getDate();
    byDay[day] = (byDay[day] ?? 0) + t.amount;
  }
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    label: (i + 1).toString().padStart(2, '0'),
    amount: byDay[i + 1] ?? 0,
  }));
}

export function getProjection(filter: PeriodFilter) {
  const revenue = getRevenueSum(filter);
  const elapsed = businessDaysElapsed(filter.year, filter.month, todayDate);
  const total = businessDaysInMonth(filter.year, filter.month);
  if (!elapsed) return 0;
  return (revenue / elapsed) * total;
}

export function getAccumulatedGoalToToday(filter: PeriodFilter) {
  const { revenueGoal } = getConsolidatedGoal(filter);
  const businessDays = businessDaysInMonth(filter.year, filter.month);
  const elapsed = businessDaysElapsed(filter.year, filter.month, todayDate);
  return (revenueGoal / businessDays) * elapsed;
}
