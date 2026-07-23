/**
 * Camada pura de cálculo de métricas / KPIs.
 * Recebe datasets como parâmetro — agnóstica de origem (mock ou Supabase).
 */
import type {
  Lead,
  LeadStage,
  MonthlyGoal,
  PaymentMethod,
  PointsAdjustment,
  Sale,
  Seller,
  TrafficSpend,
} from '@/types/domain';
import { businessDaysElapsed, businessDaysInMonth } from '@/lib/utils';

export interface Datasets {
  sellers: Seller[];
  leads: Lead[];
  sales: Sale[];
  goals: MonthlyGoal[];
  traffic: TrafficSpend[];
  adjustments?: PointsAdjustment[];
}

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

export function getGoalsForMonth(ds: Datasets, year: number, month: number) {
  const ym = new Date(year, month, 1).toISOString().slice(0, 10);
  return ds.goals.filter((g) => g.yearMonth === ym);
}

export function getGoalForSeller(
  ds: Datasets,
  year: number,
  month: number,
  sellerId: string,
) {
  return getGoalsForMonth(ds, year, month).find((g) => g.sellerId === sellerId);
}

export function getConsolidatedGoal(ds: Datasets, filter: PeriodFilter) {
  const goals = getGoalsForMonth(ds, filter.year, filter.month);
  if (filter.sellerId && filter.sellerId !== 'all') {
    const g = goals.find((x) => x.sellerId === filter.sellerId);
    return {
      pointsGoal: g?.pointsGoal ?? 0,
      revenueGoal: g?.revenueGoal ?? 0,
      coursesGoal: g?.coursesGoal ?? 0,
      businessDays: g?.businessDays ?? 21,
    };
  }
  return {
    pointsGoal: goals.reduce((a, b) => a + (b.pointsGoal ?? 0), 0),
    revenueGoal: goals.reduce((a, b) => a + (b.revenueGoal ?? 0), 0),
    coursesGoal: goals.reduce((a, b) => a + b.coursesGoal, 0),
    businessDays: goals[0]?.businessDays ?? 21,
  };
}

export function getMonthSales(ds: Datasets, filter: PeriodFilter): Sale[] {
  return filterSeller(
    ds.sales.filter((s) => inMonth(s.soldAt, filter.year, filter.month)),
    filter.sellerId,
  );
}

export function getMonthLeads(ds: Datasets, filter: PeriodFilter): Lead[] {
  return filterSeller(
    ds.leads.filter((l) => inMonth(l.createdAt, filter.year, filter.month)),
    filter.sellerId,
  );
}

export function getStageCount(ds: Datasets, filter: PeriodFilter, stage: LeadStage) {
  return getMonthLeads(ds, filter).filter((l) => l.stage === stage).length;
}

export function getFunnelMetrics(ds: Datasets, filter: PeriodFilter) {
  const monthLeads = getMonthLeads(ds, filter);
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

export function getDailyRevenue(ds: Datasets, filter: PeriodFilter) {
  const monthSales = getMonthSales(ds, filter);
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

export function getAccumulatedVsGoal(
  ds: Datasets,
  filter: PeriodFilter,
  today: Date = new Date(),
) {
  const daily = getDailyRevenue(ds, filter);
  const { revenueGoal } = getConsolidatedGoal(ds, filter);
  const daysInMonth = daily.length;
  const businessDays = businessDaysInMonth(filter.year, filter.month);
  const dailyGoal = businessDays > 0 ? revenueGoal / businessDays : 0;
  let cumulative = 0;
  let cumulativeGoal = 0;
  const todayDay =
    filter.year === today.getFullYear() && filter.month === today.getMonth()
      ? today.getDate()
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

export function getRevenueSum(ds: Datasets, filter: PeriodFilter) {
  return getMonthSales(ds, filter).reduce((a, s) => a + s.amount, 0);
}

/** Retorna ajustes manuais do mes filtrado (opcionalmente por vendedor). */
export function getMonthAdjustments(ds: Datasets, filter: PeriodFilter) {
  const ym = new Date(filter.year, filter.month, 1).toISOString().slice(0, 10);
  const all = ds.adjustments ?? [];
  const filtered = all.filter((a) => a.yearMonth === ym);
  if (filter.sellerId && filter.sellerId !== 'all') {
    return filtered.filter((a) => a.sellerId === filter.sellerId);
  }
  return filtered;
}

/** Soma de commissionPoints das vendas + ajustes manuais do periodo. */
export function getPointsSum(ds: Datasets, filter: PeriodFilter) {
  const fromSales = getMonthSales(ds, filter).reduce(
    (a, s) => a + (s.commissionPoints ?? 0),
    0,
  );
  const fromAdj = getMonthAdjustments(ds, filter).reduce((a, x) => a + x.points, 0);
  return fromSales + fromAdj;
}

export function getCoursesSold(ds: Datasets, filter: PeriodFilter) {
  return getMonthSales(ds, filter).length;
}

export function getPaymentMethodBreakdown(ds: Datasets, filter: PeriodFilter) {
  const monthSales = getMonthSales(ds, filter);
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

export function getSellerCards(ds: Datasets, filter: PeriodFilter) {
  return ds.sellers.map((seller) => {
    const goal = getGoalForSeller(ds, filter.year, filter.month, seller.id);
    const sellerSales = ds.sales.filter(
      (s) => s.sellerId === seller.id && inMonth(s.soldAt, filter.year, filter.month),
    );
    const revenue = sellerSales.reduce((a, s) => a + s.amount, 0);
    const salesPoints = sellerSales.reduce((a, s) => a + (s.commissionPoints ?? 0), 0);
    const adjPoints = getMonthAdjustments(ds, { ...filter, sellerId: seller.id })
      .reduce((a, x) => a + x.points, 0);
    const points = salesPoints + adjPoints;
    const sellerLeads = ds.leads.filter(
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
      pointsGoal: goal?.pointsGoal ?? 0,
      revenue,
      points,
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

export function getMonthTrafficSpend(ds: Datasets, filter: PeriodFilter) {
  return ds.traffic.filter((t) =>
    inMonth(new Date(t.spendDate).toISOString(), filter.year, filter.month),
  );
}

export function getMarketingMetrics(ds: Datasets, filter: PeriodFilter) {
  const monthSpend = getMonthTrafficSpend(ds, filter);
  const investment = monthSpend.reduce((a, t) => a + t.amount, 0);
  const monthSales = getMonthSales(ds, { ...filter, sellerId: 'all' });
  const revenue = monthSales.reduce((a, s) => a + s.amount, 0);
  const monthLeads = getMonthLeads(ds, { ...filter, sellerId: 'all' });
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

export function getSpendByDay(ds: Datasets, filter: PeriodFilter) {
  const monthSpend = getMonthTrafficSpend(ds, filter);
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

export function getProjection(ds: Datasets, filter: PeriodFilter, today: Date = new Date()) {
  const revenue = getRevenueSum(ds, filter);
  const elapsed = businessDaysElapsed(filter.year, filter.month, today);
  const total = businessDaysInMonth(filter.year, filter.month);
  if (!elapsed) return 0;
  return (revenue / elapsed) * total;
}

export function getAccumulatedGoalToToday(
  ds: Datasets,
  filter: PeriodFilter,
  today: Date = new Date(),
) {
  const { revenueGoal } = getConsolidatedGoal(ds, filter);
  const businessDays = businessDaysInMonth(filter.year, filter.month);
  const elapsed = businessDaysElapsed(filter.year, filter.month, today);
  return businessDays > 0 ? (revenueGoal / businessDays) * elapsed : 0;
}

/** Meta em PONTOS acumulada ate hoje (proporcional aos dias uteis) */
export function getAccumulatedPointsGoalToToday(
  ds: Datasets,
  filter: PeriodFilter,
  today: Date = new Date(),
) {
  const { pointsGoal } = getConsolidatedGoal(ds, filter);
  const businessDays = businessDaysInMonth(filter.year, filter.month);
  const elapsed = businessDaysElapsed(filter.year, filter.month, today);
  return businessDays > 0 ? (pointsGoal / businessDays) * elapsed : 0;
}

/** Projecao de pontos no fim do mes com base no ritmo atual */
export function getPointsProjection(ds: Datasets, filter: PeriodFilter, today: Date = new Date()) {
  const points = getPointsSum(ds, filter);
  const elapsed = businessDaysElapsed(filter.year, filter.month, today);
  const total = businessDaysInMonth(filter.year, filter.month);
  if (!elapsed) return 0;
  return (points / elapsed) * total;
}

/**
 * Curva acumulada de pontos vs meta em pontos ao longo do mes.
 * Emite tres series:
 *   - meta: linha de meta acumulada dia a dia (constante)
 *   - vendido: acumulado real ate hoje (null nos dias futuros)
 *   - projecao: extensao linear de hoje ate o fim do mes seguindo
 *     o ritmo atual (null nos dias passados)
 * A "projecao" e "vendido" se encontram no dia atual (mesmo valor)
 * pra a linha nao ter buraco visual.
 */
export function getAccumulatedPointsVsGoal(
  ds: Datasets,
  filter: PeriodFilter,
  today: Date = new Date(),
) {
  const monthSales = getMonthSales(ds, filter);
  const monthAdj = getMonthAdjustments(ds, filter);
  const daysInMonth = new Date(filter.year, filter.month + 1, 0).getDate();
  const byDay: Record<number, number> = {};
  for (const s of monthSales) {
    const day = new Date(s.soldAt).getDate();
    byDay[day] = (byDay[day] ?? 0) + (s.commissionPoints ?? 0);
  }
  // Ajustes manuais entram no dia do created_at
  for (const a of monthAdj) {
    const day = new Date(a.createdAt).getDate();
    byDay[day] = (byDay[day] ?? 0) + a.points;
  }
  const { pointsGoal } = getConsolidatedGoal(ds, filter);
  const businessDays = businessDaysInMonth(filter.year, filter.month);
  const dailyGoal = businessDays > 0 ? pointsGoal / businessDays : 0;

  const todayDay =
    filter.year === today.getFullYear() && filter.month === today.getMonth()
      ? today.getDate()
      : daysInMonth;

  // 1a passada: acumula pontos ate hoje
  let cumulative = 0;
  const cumulativeByDay: number[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    const day = i + 1;
    if (day <= todayDay) cumulative += byDay[day] ?? 0;
    cumulativeByDay.push(cumulative);
  }
  const pointsToday = cumulativeByDay[Math.min(todayDay, daysInMonth) - 1] ?? 0;

  // Projecao final: extrapola ritmo dos dias uteis passados
  const elapsed = businessDaysElapsed(filter.year, filter.month, today);
  const projectionEnd = elapsed > 0 ? (pointsToday / elapsed) * businessDays : pointsToday;
  const daysAfterToday = daysInMonth - todayDay;

  // 2a passada: monta series
  let cumulativeGoal = 0;
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(filter.year, filter.month, day);
    const isBusiness = date.getDay() !== 0 && date.getDay() !== 6;
    if (isBusiness) cumulativeGoal += dailyGoal;

    const vendido = day <= todayDay ? Math.round(cumulativeByDay[i] * 10) / 10 : null;

    // Projecao: linear entre pointsToday (dia atual) e projectionEnd (ultimo dia)
    let projecao: number | null = null;
    if (day >= todayDay && daysAfterToday > 0) {
      const progress = (day - todayDay) / daysAfterToday;
      projecao = Math.round((pointsToday + (projectionEnd - pointsToday) * progress) * 10) / 10;
    } else if (day === todayDay && daysAfterToday === 0) {
      projecao = Math.round(pointsToday * 10) / 10;
    }

    return {
      day,
      label: day.toString().padStart(2, '0'),
      vendido,
      meta: Math.round(cumulativeGoal * 10) / 10,
      projecao,
    };
  });
}

export function getDailyLeads(ds: Datasets, filter: PeriodFilter) {
  const monthLeads = getMonthLeads(ds, filter);
  const daysInMonth = new Date(filter.year, filter.month + 1, 0).getDate();
  const byDay: Record<number, number> = {};
  for (const l of monthLeads) {
    const day = new Date(l.createdAt).getDate();
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    label: (i + 1).toString().padStart(2, '0'),
    leads: byDay[i + 1] ?? 0,
  }));
}
