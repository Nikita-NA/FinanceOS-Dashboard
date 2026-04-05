import type { MonthlyTrendRow, WeeklyTrendRow } from '@/types';

export type PeriodMode = 'week' | 'month' | 'year';

export interface PeriodMetrics {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
}

function savingsRate(income: number, expense: number): number {
  const net = income - expense;
  return income > 0 ? Number(((net / income) * 100).toFixed(2)) : 0;
}

function metricsFrom(income: number, expense: number): PeriodMetrics {
  const net = income - expense;
  return {
    income,
    expense,
    net,
    savingsRate: savingsRate(income, expense),
  };
}

/** Sort weekly rows by week key ascending */
export function compareWeeks(weekly: WeeklyTrendRow[]): {
  current: PeriodMetrics | null;
  previous: PeriodMetrics | null;
  spark: { income: number; expense: number }[];
} {
  const sorted = [...weekly].sort((a, b) => a.week.localeCompare(b.week));
  if (sorted.length < 2) {
    return {
      current: sorted.length === 1 ? metricsFrom(sorted[0].income, sorted[0].expense) : null,
      previous: null,
      spark: sorted.map((w) => ({ income: w.income, expense: w.expense })),
    };
  }
  const cur = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const spark = sorted.slice(-4).map((w) => ({ income: w.income, expense: w.expense }));
  return {
    current: metricsFrom(cur.income, cur.expense),
    previous: metricsFrom(prev.income, prev.expense),
    spark,
  };
}

/** Merge monthly rows from two calendar years (YYYY-MM sorted) */
export function mergeMonthlyRows(a: MonthlyTrendRow[], b: MonthlyTrendRow[]): MonthlyTrendRow[] {
  const map = new Map<string, MonthlyTrendRow>();
  for (const r of [...a, ...b]) {
    map.set(r.month, r);
  }
  return [...map.values()].sort((x, y) => x.month.localeCompare(y.month));
}

export function compareMonths(
  mergedMonthly: MonthlyTrendRow[],
  refDate: Date = new Date(),
): {
  current: PeriodMetrics | null;
  previous: PeriodMetrics | null;
  spark: { income: number; expense: number }[];
} {
  const y = refDate.getFullYear();
  const m = refDate.getMonth() + 1;
  const curKey = `${y}-${String(m).padStart(2, '0')}`;
  let prevY = y;
  let prevM = m - 1;
  if (prevM < 1) {
    prevM = 12;
    prevY -= 1;
  }
  const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;

  const curRow = mergedMonthly.find((r) => r.month === curKey);
  const prevRow = mergedMonthly.find((r) => r.month === prevKey);

  const idx = mergedMonthly.findIndex((r) => r.month === curKey);
  const sparkStart = Math.max(0, idx - 5);
  const sparkSlice =
    idx >= 0 ? mergedMonthly.slice(sparkStart, idx + 1) : mergedMonthly.slice(-6);
  const spark = sparkSlice.map((r) => ({ income: r.income, expense: r.expense }));

  return {
    current: curRow ? metricsFrom(curRow.income, curRow.expense) : null,
    previous: prevRow ? metricsFrom(prevRow.income, prevRow.expense) : null,
    spark,
  };
}

export function compareYears(
  monthlyThisYear: MonthlyTrendRow[],
  monthlyPrevYear: MonthlyTrendRow[],
  _refDate: Date = new Date(),
): {
  current: PeriodMetrics | null;
  previous: PeriodMetrics | null;
  spark: { income: number; expense: number }[];
} {
  const cur = monthlyThisYear.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
    }),
    { income: 0, expense: 0 },
  );
  const prev = monthlyPrevYear.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
    }),
    { income: 0, expense: 0 },
  );

  const hasCur = cur.income > 0 || cur.expense > 0;
  const hasPrev = prev.income > 0 || prev.expense > 0;

  const merged = mergeMonthlyRows(monthlyThisYear, monthlyPrevYear);
  const spark = merged.slice(-12).map((r) => ({ income: r.income, expense: r.expense }));

  return {
    current: hasCur ? metricsFrom(cur.income, cur.expense) : null,
    previous: hasPrev ? metricsFrom(prev.income, prev.expense) : null,
    spark,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

/** For income & net & savingsRate: higher is better. For expense: lower is better. */
export function isImprovement(metric: 'income' | 'expense' | 'net' | 'savingsRate', current: number, previous: number) {
  if (metric === 'expense') return current < previous;
  return current > previous;
}
