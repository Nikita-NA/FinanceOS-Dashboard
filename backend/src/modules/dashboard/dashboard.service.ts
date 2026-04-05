import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TransactionType } from '@prisma/client';

export interface HealthScoreBreakdownPart {
  score: number;
  max: number;
  label: string;
}

export interface HealthScoreResponse {
  score: number;
  grade: string;
  breakdown: {
    savingsRate: HealthScoreBreakdownPart;
    expenseConsistency: HealthScoreBreakdownPart;
    incomeDiversity: HealthScoreBreakdownPart;
    housingCostRatio: HealthScoreBreakdownPart;
    trend: HealthScoreBreakdownPart;
  };
  tips: string[];
  calculatedAt: string;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ─── Main Summary ────────────────────────────────────────────────────────────
  async getSummary() {
    const [incomeAgg, expenseAgg, transactionCount] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: { type: TransactionType.INCOME, deletedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { type: TransactionType.EXPENSE, deletedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.count({ where: { deletedAt: null } }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
    const netBalance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      transactionCount,
      incomeTransactionCount: incomeAgg._count,
      expenseTransactionCount: expenseAgg._count,
      savingsRate:
        totalIncome > 0
          ? Number(((netBalance / totalIncome) * 100).toFixed(2))
          : 0,
    };
  }

  // ─── Category Breakdown ───────────────────────────────────────────────────────
  async getCategoryBreakdown(type?: TransactionType) {
    const where: any = { deletedAt: null };
    if (type) where.type = type;

    const rows = await this.prisma.transaction.groupBy({
      by: ['category', 'type'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Compute total for percentage calculation
    const grandTotal = rows.reduce((acc, r) => acc + Number(r._sum.amount ?? 0), 0);

    return rows.map((r) => ({
      category: r.category,
      type: r.type,
      total: Number(r._sum.amount ?? 0),
      count: r._count,
      percentage: grandTotal > 0
        ? Number(((Number(r._sum.amount ?? 0) / grandTotal) * 100).toFixed(2))
        : 0,
    }));
  }

  // ─── Monthly Trends ───────────────────────────────────────────────────────────
  async getMonthlyTrends(year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    const transactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: new Date(`${targetYear}-01-01`),
          lte: new Date(`${targetYear}-12-31T23:59:59.999Z`),
        },
      },
      select: { amount: true, type: true, date: true },
    });

    // Build month buckets
    const months: Record<
      string,
      { month: string; income: number; expense: number; net: number }
    > = {};

    for (let m = 1; m <= 12; m++) {
      const key = `${targetYear}-${String(m).padStart(2, '0')}`;
      months[key] = { month: key, income: 0, expense: 0, net: 0 };
    }

    for (const tx of transactions) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) continue;
      if (tx.type === TransactionType.INCOME) {
        months[key].income += Number(tx.amount);
      } else {
        months[key].expense += Number(tx.amount);
      }
      months[key].net = months[key].income - months[key].expense;
    }

    return Object.values(months);
  }

  // ─── Weekly Trends (last N weeks) ────────────────────────────────────────────
  async getWeeklyTrends(weeks: number = 8) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - weeks * 7);

    const transactions = await this.prisma.transaction.findMany({
      where: { deletedAt: null, date: { gte: from } },
      select: { amount: true, type: true, date: true },
    });

    const buckets: Record<
      string,
      { week: string; income: number; expense: number; net: number }
    > = {};

    for (const tx of transactions) {
      const d = new Date(tx.date);
      // ISO week start = Monday
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const key = monday.toISOString().split('T')[0];

      if (!buckets[key]) {
        buckets[key] = { week: key, income: 0, expense: 0, net: 0 };
      }
      if (tx.type === TransactionType.INCOME) {
        buckets[key].income += Number(tx.amount);
      } else {
        buckets[key].expense += Number(tx.amount);
      }
      buckets[key].net = buckets[key].income - buckets[key].expense;
    }

    return Object.values(buckets).sort((a, b) => a.week.localeCompare(b.week));
  }

  // ─── Recent Activity ──────────────────────────────────────────────────────────
  async getRecentActivity(limit: number = 10) {
    return this.prisma.transaction.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  // ─── Income vs Expense Ratio ──────────────────────────────────────────────────
  async getIncomeExpenseRatio() {
    const summary = await this.getSummary();
    const total = summary.totalIncome + summary.totalExpenses;
    return {
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      total,
      incomeRatio: total > 0 ? Number(((summary.totalIncome / total) * 100).toFixed(2)) : 0,
      expenseRatio: total > 0 ? Number(((summary.totalExpenses / total) * 100).toFixed(2)) : 0,
    };
  }

  // ─── Top Categories ───────────────────────────────────────────────────────────
  async getTopCategories(limit: number = 5) {
    const rows = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: Number(limit),
    });

    return rows.map((r) => ({
      category: r.category,
      total: Number(r._sum.amount ?? 0),
      count: r._count,
    }));
  }

  async getHealthScore(): Promise<HealthScoreResponse> {
    const calculatedAt = new Date().toISOString();

    const [incomeAgg, expenseAgg] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: { type: TransactionType.INCOME, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: TransactionType.EXPENSE, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

    let savingsRate: HealthScoreBreakdownPart;
    if (totalIncome <= 0) {
      savingsRate = { score: 0, max: 30, label: 'Critical' };
    } else {
      const rate = ((totalIncome - totalExpenses) / totalIncome) * 100;
      if (rate >= 50) savingsRate = { score: 30, max: 30, label: 'Excellent' };
      else if (rate >= 30) savingsRate = { score: 20, max: 30, label: 'Good' };
      else if (rate >= 10) savingsRate = { score: 10, max: 30, label: 'Needs Work' };
      else savingsRate = { score: 0, max: 30, label: 'Critical' };
    }

    const now = new Date();
    const monthStarts: Date[] = [];
    for (let i = 2; i >= 0; i--) {
      monthStarts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    const windowStart = monthStarts[0]!;
    const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const windowTx = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: { gte: windowStart, lte: windowEnd },
      },
      select: { amount: true, type: true, date: true, category: true },
    });

    const expenseByMonthKey = new Map<string, number>();
    for (const m of monthStarts) {
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      expenseByMonthKey.set(key, 0);
    }
    for (const t of windowTx) {
      if (t.type !== TransactionType.EXPENSE) continue;
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      if (expenseByMonthKey.has(key)) {
        expenseByMonthKey.set(key, (expenseByMonthKey.get(key) ?? 0) + Number(t.amount));
      }
    }
    const monthlyExpenses = [...expenseByMonthKey.values()];
    const monthsWithExpense = monthlyExpenses.filter((v) => v > 0).length;

    let expenseConsistency: HealthScoreBreakdownPart;
    if (monthsWithExpense < 2) {
      expenseConsistency = { score: 10, max: 20, label: 'Insufficient Data' };
    } else {
      const mean = monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length;
      if (mean <= 0) {
        expenseConsistency = { score: 10, max: 20, label: 'Insufficient Data' };
      } else {
        const variance =
          monthlyExpenses.reduce((acc, x) => acc + (x - mean) ** 2, 0) / monthlyExpenses.length;
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / mean) * 100;
        if (cv < 10) expenseConsistency = { score: 20, max: 20, label: 'Very Consistent' };
        else if (cv <= 25) expenseConsistency = { score: 12, max: 20, label: 'Moderate' };
        else expenseConsistency = { score: 5, max: 20, label: 'Inconsistent' };
      }
    }

    const incomeCategories = new Set<string>();
    for (const t of windowTx) {
      if (t.type === TransactionType.INCOME) incomeCategories.add(t.category);
    }
    const nSources = incomeCategories.size;
    let incomeDiversity: HealthScoreBreakdownPart;
    if (nSources >= 3) incomeDiversity = { score: 20, max: 20, label: 'Diversified' };
    else if (nSources === 2) incomeDiversity = { score: 12, max: 20, label: 'Moderate' };
    else if (nSources === 1) incomeDiversity = { score: 5, max: 20, label: 'Concentrated' };
    else incomeDiversity = { score: 0, max: 20, label: 'No Income' };

    const housingRows = await this.prisma.transaction.findMany({
      where: { deletedAt: null, type: TransactionType.EXPENSE },
      select: { amount: true, category: true },
    });
    let housingTotal = 0;
    for (const r of housingRows) {
      const c = r.category.toLowerCase();
      if (c.includes('rent') || c.includes('housing')) housingTotal += Number(r.amount);
    }

    let housingCostRatio: HealthScoreBreakdownPart;
    if (housingTotal <= 0) {
      housingCostRatio = { score: 15, max: 15, label: 'No Housing Cost Detected' };
    } else if (totalIncome <= 0) {
      housingCostRatio = { score: 0, max: 15, label: 'Critical' };
    } else {
      const housingRatio = (housingTotal / totalIncome) * 100;
      if (housingRatio < 25) housingCostRatio = { score: 15, max: 15, label: 'Healthy' };
      else if (housingRatio <= 35) housingCostRatio = { score: 10, max: 15, label: 'Moderate' };
      else if (housingRatio <= 50) housingCostRatio = { score: 5, max: 15, label: 'High' };
      else housingCostRatio = { score: 0, max: 15, label: 'Critical' };
    }

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);

    const trendTx = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        OR: [
          { date: { gte: lastMonthStart, lte: lastMonthEnd } },
          { date: { gte: prevMonthStart, lte: prevMonthEnd } },
        ],
      },
      select: { amount: true, type: true, date: true },
    });

    const netForRange = (start: Date, end: Date) => {
      let inc = 0;
      let exp = 0;
      for (const t of trendTx) {
        if (t.date < start || t.date > end) continue;
        if (t.type === TransactionType.INCOME) inc += Number(t.amount);
        else exp += Number(t.amount);
      }
      return inc - exp;
    };

    const lastMonthNet = netForRange(lastMonthStart, lastMonthEnd);
    const prevMonthNet = netForRange(prevMonthStart, prevMonthEnd);

    let trend: HealthScoreBreakdownPart;
    if (Math.abs(prevMonthNet) < 1e-9) {
      trend = { score: 8, max: 15, label: 'Insufficient Data' };
    } else {
      const change = ((lastMonthNet - prevMonthNet) / Math.abs(prevMonthNet)) * 100;
      if (change > 5) trend = { score: 15, max: 15, label: 'Improving' };
      else if (change >= -5) trend = { score: 8, max: 15, label: 'Stable' };
      else trend = { score: 0, max: 15, label: 'Declining' };
    }

    const breakdown = {
      savingsRate,
      expenseConsistency,
      incomeDiversity,
      housingCostRatio,
      trend,
    };

    const score =
      breakdown.savingsRate.score +
      breakdown.expenseConsistency.score +
      breakdown.incomeDiversity.score +
      breakdown.housingCostRatio.score +
      breakdown.trend.score;

    let grade: string;
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 45) grade = 'D';
    else grade = 'F';

    const tips: string[] = [];
    if (breakdown.savingsRate.score < 20) {
      tips.push('Increase your savings rate. Try to save at least 30% of income.');
    }
    if (breakdown.expenseConsistency.score < 12) {
      tips.push(
        'Your expenses vary significantly month to month. Try to maintain a consistent budget.',
      );
    }
    if (breakdown.incomeDiversity.score < 12) {
      tips.push('Consider adding a second income source to reduce financial risk.');
    }
    if (breakdown.housingCostRatio.score < 10) {
      tips.push('Housing costs are consuming a large portion of your income.');
    }
    if (breakdown.trend.score === 0) {
      tips.push('Your financial position declined last month. Review your recent expenses.');
    }
    if (score >= 75) {
      tips.push('Great financial health! Keep maintaining these habits.');
    }

    return {
      score,
      grade,
      breakdown,
      tips,
      calculatedAt,
    };
  }
}
