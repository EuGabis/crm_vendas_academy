import { describe, expect, it } from 'vitest';
import type { Datasets, PeriodFilter } from './queries';
import {
  getConsolidatedGoal,
  getCoursesSold,
  getFunnelMetrics,
  getMarketingMetrics,
  getMonthSales,
  getPaymentMethodBreakdown,
  getProjection,
  getRevenueSum,
  getSellerCards,
} from './queries';

// Maio/2026 (monthIndex = 4). yearMonth das metas é derivado do mesmo modo que
// o código (getGoalsForMonth) para casar independente do timezone.
const YEAR = 2026;
const MONTH = 4;
const YM = new Date(YEAR, MONTH, 1).toISOString().slice(0, 10);
const FILTER: PeriodFilter = { year: YEAR, month: MONTH, sellerId: 'all' };

function makeDatasets(): Datasets {
  return {
    sellers: [
      { id: 's1', fullName: 'Ana', email: 'a@x.com', team: 'Closer', active: true, avatarColor: '#fff' },
      { id: 's2', fullName: 'Bia', email: 'b@x.com', team: 'Closer', active: true, avatarColor: '#fff' },
    ],
    goals: [
      { sellerId: 's1', yearMonth: YM, revenueGoal: 10000, coursesGoal: 10, businessDays: 20 },
      { sellerId: 's2', yearMonth: YM, revenueGoal: 5000, coursesGoal: 5, businessDays: 20 },
    ],
    sales: [
      { id: 'sa1', sellerId: 's1', leadId: null, courseId: 'c1', amount: 3000, paymentMethod: 'PIX', installments: 1, soldAt: '2026-05-10T12:00:00' },
      { id: 'sa2', sellerId: 's1', leadId: null, courseId: 'c1', amount: 2000, paymentMethod: 'AVISTA', installments: 1, soldAt: '2026-05-20T12:00:00' },
      { id: 'sa3', sellerId: 's2', leadId: null, courseId: 'c1', amount: 5000, paymentMethod: 'CARTAO_PARCELADO', installments: 6, soldAt: '2026-05-05T12:00:00' },
      // Venda de abril — deve ser ignorada no filtro de maio
      { id: 'sa4', sellerId: 's1', leadId: null, courseId: 'c1', amount: 9999, paymentMethod: 'PIX', installments: 1, soldAt: '2026-04-10T12:00:00' },
    ],
    leads: [
      { id: 'l1', sellerId: 's1', source: 'Meta', stage: 'LEAD', createdAt: '2026-05-02T12:00:00', stageChangedAt: '2026-05-02T12:00:00' },
      { id: 'l2', sellerId: 's1', source: 'Meta', stage: 'MQL', createdAt: '2026-05-03T12:00:00', stageChangedAt: '2026-05-03T12:00:00' },
      { id: 'l3', sellerId: 's1', source: 'Meta', stage: 'VENDA', createdAt: '2026-05-04T12:00:00', stageChangedAt: '2026-05-04T12:00:00' },
      { id: 'l4', sellerId: 's1', source: 'Meta', stage: 'NO_SHOW', createdAt: '2026-05-06T12:00:00', stageChangedAt: '2026-05-06T12:00:00' },
      { id: 'l5', sellerId: 's2', source: 'Google', stage: 'SQL', createdAt: '2026-05-07T12:00:00', stageChangedAt: '2026-05-07T12:00:00' },
      { id: 'l6', sellerId: 's2', source: 'Google', stage: 'AGENDADA', createdAt: '2026-05-08T12:00:00', stageChangedAt: '2026-05-08T12:00:00' },
      // Lead de abril — ignorado
      { id: 'l7', sellerId: 's1', source: 'Meta', stage: 'VENDA', createdAt: '2026-04-09T12:00:00', stageChangedAt: '2026-04-09T12:00:00' },
    ],
    traffic: [
      { id: 't1', spendDate: '2026-05-10', channel: 'Meta Ads', amount: 1000 },
      { id: 't2', spendDate: '2026-05-20', channel: 'Google Ads', amount: 1000 },
    ],
  };
}

describe('filtros de período', () => {
  it('getMonthSales ignora vendas de outros meses', () => {
    const ds = makeDatasets();
    expect(getMonthSales(ds, FILTER)).toHaveLength(3);
  });

  it('getMonthSales respeita o filtro por vendedor', () => {
    const ds = makeDatasets();
    expect(getMonthSales(ds, { ...FILTER, sellerId: 's1' })).toHaveLength(2);
  });
});

describe('receita e cursos', () => {
  it('soma a receita do mês (todos os vendedores)', () => {
    expect(getRevenueSum(makeDatasets(), FILTER)).toBe(10000);
  });

  it('soma a receita de um único vendedor', () => {
    expect(getRevenueSum(makeDatasets(), { ...FILTER, sellerId: 's1' })).toBe(5000);
  });

  it('conta cursos vendidos no mês', () => {
    expect(getCoursesSold(makeDatasets(), FILTER)).toBe(3);
  });
});

describe('getConsolidatedGoal', () => {
  it('consolida metas de todos os vendedores', () => {
    const goal = getConsolidatedGoal(makeDatasets(), FILTER);
    expect(goal.revenueGoal).toBe(15000);
    expect(goal.coursesGoal).toBe(15);
    expect(goal.businessDays).toBe(20);
  });

  it('retorna a meta individual quando filtrado por vendedor', () => {
    const goal = getConsolidatedGoal(makeDatasets(), { ...FILTER, sellerId: 's2' });
    expect(goal.revenueGoal).toBe(5000);
  });
});

describe('getFunnelMetrics', () => {
  it('faz o rollup correto dos estágios do funil', () => {
    const m = getFunnelMetrics(makeDatasets(), FILTER);
    expect(m.total).toBe(6);
    expect(m.mqls).toBe(5); // tudo menos o LEAD puro
    expect(m.sqls).toBe(4);
    expect(m.agendadas).toBe(3);
    expect(m.realizadas).toBe(1);
    expect(m.noShows).toBe(1);
    expect(m.vendas).toBe(1);
  });
});

describe('getPaymentMethodBreakdown', () => {
  it('calcula valor, contagem e share por método; shares somam 1', () => {
    const breakdown = getPaymentMethodBreakdown(makeDatasets(), FILTER);
    const byMethod = Object.fromEntries(breakdown.map((b) => [b.method, b]));
    expect(byMethod.PIX.amount).toBe(3000);
    expect(byMethod.AVISTA.amount).toBe(2000);
    expect(byMethod.CARTAO_PARCELADO.amount).toBe(5000);
    expect(byMethod.PIX.count).toBe(1);
    const totalShare = breakdown.reduce((a, b) => a + b.share, 0);
    expect(totalShare).toBeCloseTo(1, 5);
  });
});

describe('getMarketingMetrics', () => {
  it('calcula CAC, CPL, ROI e ticket médio', () => {
    const m = getMarketingMetrics(makeDatasets(), FILTER);
    expect(m.investment).toBe(2000);
    expect(m.revenue).toBe(10000);
    expect(m.cac).toBeCloseTo(2000 / 3, 5);
    expect(m.cpl).toBeCloseTo(2000 / 6, 5);
    expect(m.roi).toBeCloseTo(4, 5); // (10000-2000)/2000
    expect(m.ticketMedio).toBeCloseTo(10000 / 3, 5);
  });
});

describe('getProjection', () => {
  it('com a data de referência após o mês, projeta ≈ receita realizada', () => {
    const projection = getProjection(makeDatasets(), FILTER, new Date(2026, 5, 15));
    expect(projection).toBeCloseTo(10000, 5);
  });

  it('retorna 0 quando não há dias úteis decorridos', () => {
    // 1º de fevereiro de 2026 é domingo → nenhum dia útil decorrido nesse dia
    const febFilter: PeriodFilter = { year: 2026, month: 1, sellerId: 'all' };
    const projection = getProjection(makeDatasets(), febFilter, new Date(2026, 1, 1));
    expect(projection).toBe(0);
  });
});

describe('getSellerCards', () => {
  it('monta um card por vendedor com receita e conversão', () => {
    const cards = getSellerCards(makeDatasets(), FILTER);
    expect(cards).toHaveLength(2);
    const ana = cards.find((c) => c.seller.id === 's1')!;
    expect(ana.revenue).toBe(5000);
    expect(ana.coursesSold).toBe(2);
    expect(ana.vendas).toBe(1); // 1 lead em estágio VENDA em maio
    expect(ana.goal).toBe(10000);
  });
});
