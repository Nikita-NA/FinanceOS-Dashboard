import type { MonthlyTrendRow } from '@/types';
import type { MonthAggregate } from '@/utils/transactionAggregate';

export function incomeStabilityFromLastMonths(
  monthly: MonthlyTrendRow[],
  count = 3,
  ref: Date = new Date(),
) {
  const maxKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  const sorted = [...monthly]
    .filter((m) => m.month <= maxKey)
    .sort((a, b) => a.month.localeCompare(b.month));
  const last = sorted.slice(-count);
  const incomes = last.map((m) => m.income);
  const vals = incomes.filter((x) => x > 0);
  if (vals.length < 2) {
    return { score: 55, label: 'Moderate' as const, variancePct: 0 };
  }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const stdev = Math.sqrt(variance);
  const cv = mean > 0 ? stdev / mean : 0;
  const variancePct = Number((cv * 100).toFixed(1));
  const score = Math.max(0, Math.min(100, Math.round(100 - cv * 85)));
  let label: 'Stable' | 'Moderate' | 'Variable' = 'Variable';
  if (score >= 70) label = 'Stable';
  else if (score >= 40) label = 'Moderate';
  return { score, label, variancePct };
}

export function topExpenseDelta(
  cur: MonthAggregate,
  prev: MonthAggregate,
): { biggestIncrease: { category: string; delta: number } | null; biggestDecrease: { category: string; delta: number } | null } {
  const cats = new Set([
    ...Object.keys(cur.expenseByCategory),
    ...Object.keys(prev.expenseByCategory),
  ]);
  let biggestIncrease: { category: string; delta: number } | null = null;
  let biggestDecrease: { category: string; delta: number } | null = null;

  for (const c of cats) {
    const a = cur.expenseByCategory[c]?.total ?? 0;
    const b = prev.expenseByCategory[c]?.total ?? 0;
    const delta = a - b;
    if (delta > 0) {
      if (!biggestIncrease || delta > biggestIncrease.delta) biggestIncrease = { category: c, delta };
    } else if (delta < 0) {
      const dec = -delta;
      if (!biggestDecrease || dec > biggestDecrease.delta) biggestDecrease = { category: c, delta: dec };
    }
  }

  return { biggestIncrease, biggestDecrease };
}

export function savingsRateImproved(cur: MonthAggregate, prev: MonthAggregate) {
  return cur.savingsRate > prev.savingsRate;
}
