import type { Transaction, TransactionType } from '@/types';

export interface MonthAggregate {
  year: number;
  month: number;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  expenseByCategory: Record<string, { total: number; count: number }>;
  incomeByCategory: Record<string, { total: number; count: number }>;
}

function ymPrefix(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function aggregateForMonth(transactions: Transaction[], year: number, month: number): MonthAggregate {
  const prefix = ymPrefix(year, month);
  const expenseByCategory: MonthAggregate['expenseByCategory'] = {};
  const incomeByCategory: MonthAggregate['incomeByCategory'] = {};
  let income = 0;
  let expense = 0;

  for (const tx of transactions) {
    const s = typeof tx.date === 'string' ? tx.date : String(tx.date);
    if (!s.startsWith(prefix)) continue;
    const amt = Number(tx.amount);
    if (tx.type === 'INCOME') {
      income += amt;
      const row = incomeByCategory[tx.category] ?? { total: 0, count: 0 };
      row.total += amt;
      row.count += 1;
      incomeByCategory[tx.category] = row;
    } else {
      expense += amt;
      const row = expenseByCategory[tx.category] ?? { total: 0, count: 0 };
      row.total += amt;
      row.count += 1;
      expenseByCategory[tx.category] = row;
    }
  }

  const net = income - expense;
  const savingsRate = income > 0 ? Number(((net / income) * 100).toFixed(2)) : 0;

  return {
    year,
    month,
    income,
    expense,
    net,
    savingsRate,
    expenseByCategory,
    incomeByCategory,
  };
}

export function topExpenseCategory(agg: MonthAggregate): { category: string; amount: number } | null {
  let best: { category: string; amount: number } | null = null;
  for (const [category, row] of Object.entries(agg.expenseByCategory)) {
    if (!best || row.total > best.amount) best = { category, amount: row.total };
  }
  return best;
}

export function expenseTotalsByCategory(agg: MonthAggregate): { category: string; total: number; count: number }[] {
  return Object.entries(agg.expenseByCategory)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export function incomeTotalsByCategory(agg: MonthAggregate): { category: string; total: number; count: number }[] {
  return Object.entries(agg.incomeByCategory)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
}

/** For unusual activity: average expense per category from a pool of transactions */
export function averageExpenseByCategory(transactions: Transaction[]): Map<string, { avg: number; count: number }> {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    const amt = Number(tx.amount);
    const prev = sums.get(tx.category) ?? { sum: 0, count: 0 };
    prev.sum += amt;
    prev.count += 1;
    sums.set(tx.category, prev);
  }
  const out = new Map<string, { avg: number; count: number }>();
  for (const [cat, { sum, count }] of sums) {
    out.set(cat, { avg: count > 0 ? sum / count : 0, count });
  }
  return out;
}

export function transactionMonthKey(tx: Transaction): string | null {
  const s = typeof tx.date === 'string' ? tx.date : String(tx.date);
  const m = /^(\d{4}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

export function filterTransactionsByType(transactions: Transaction[], type: TransactionType) {
  return transactions.filter((t) => t.type === type);
}
