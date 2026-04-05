import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Trophy } from 'lucide-react';
import { FinancialHealthScoreSection } from '@/components/dashboard/FinancialHealthScoreSection';
import { useMonthlyTrends } from '@/hooks/useDashboard';
import { useTransactionsInRange } from '@/hooks/useTransactionsInRange';
import {
  aggregateForMonth,
  averageExpenseByCategory,
  expenseTotalsByCategory,
} from '@/utils/transactionAggregate';
import {
  incomeStabilityFromLastMonths,
  savingsRateImproved,
  topExpenseDelta,
} from '@/utils/insightsMath';
import { monthDateBounds, prevMonth } from '@/utils/monthBounds';
import { formatCurrency } from '@/utils/formatCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Transaction } from '@/types';

function fmtMoneyTooltip(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return formatCurrency(Number.isFinite(n) ? n : 0);
}

function unusualExpenses(transactions: Transaction[]) {
  const avgMap = averageExpenseByCategory(transactions);
  const out: { tx: Transaction; ratio: number; avg: number }[] = [];
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    const a = avgMap.get(tx.category);
    if (!a || a.count < 2 || a.avg <= 0) continue;
    const amt = Number(tx.amount);
    if (amt > 2 * a.avg) out.push({ tx, ratio: amt / a.avg, avg: a.avg });
  }
  return out.sort((a, b) => b.ratio - a.ratio).slice(0, 12);
}

export function InsightsPage() {
  const ref = useMemo(() => new Date(), []);
  const y = ref.getFullYear();
  const m = ref.getMonth() + 1;
  const { year: py, month: pm } = prevMonth(y, m);

  const monthlyQ = useMonthlyTrends(y);
  const longFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 120);
    return d.toISOString().slice(0, 10);
  }, []);
  const longTo = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const txLongQ = useTransactionsInRange(longFrom, longTo);
  const { from: cFrom, to: cTo } = monthDateBounds(y, m);
  const { from: pFrom, to: pTo } = monthDateBounds(py, pm);
  const spanFrom = pFrom < cFrom ? pFrom : cFrom;
  const spanTo = cTo > pTo ? cTo : pTo;
  const txTwoMoQ = useTransactionsInRange(spanFrom, spanTo);

  const curAgg = useMemo(() => aggregateForMonth(txTwoMoQ.data ?? [], y, m), [txTwoMoQ.data, y, m]);
  const prevAgg = useMemo(() => aggregateForMonth(txTwoMoQ.data ?? [], py, pm), [txTwoMoQ.data, py, pm]);

  const stability = useMemo(
    () => incomeStabilityFromLastMonths(monthlyQ.data ?? [], 3, ref),
    [monthlyQ.data, ref],
  );

  const cashFlowData = useMemo(() => {
    const rows = monthlyQ.data ?? [];
    const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
    const nets = sorted.map((r) => r.net);
    const avgNet = nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0;
    return sorted.map((r) => ({
      month: r.month.slice(5),
      net: r.net,
      avgNet,
    }));
  }, [monthlyQ.data]);

  const top5Chart = useMemo(() => {
    const curEx = expenseTotalsByCategory(curAgg);
    const top = curEx.slice(0, 5);
    return top.map((row) => ({
      category: row.category,
      thisMonth: row.total,
      lastMonth: prevAgg.expenseByCategory[row.category]?.total ?? 0,
    }));
  }, [curAgg, prevAgg]);

  const delta = useMemo(() => topExpenseDelta(curAgg, prevAgg), [curAgg, prevAgg]);
  const savingsWin = useMemo(() => savingsRateImproved(curAgg, prevAgg), [curAgg, prevAgg]);

  const unusual = useMemo(() => unusualExpenses(txLongQ.data ?? []), [txLongQ.data]);

  const worstIncreaseCat = delta.biggestIncrease?.category ?? null;

  const loading = monthlyQ.isLoading || txLongQ.isLoading || txTwoMoQ.isLoading;

  const hasError = monthlyQ.isError && txTwoMoQ.isError;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (hasError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-red-800">Could not load insights.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Insights</h1>
        <p className="text-slate-500">Patterns and signals from your dashboard data</p>
      </div>

      <FinancialHealthScoreSection variant="insights" />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Spending patterns</CardTitle>
            <CardDescription>Top 5 expense categories — this month vs last month</CardDescription>
          </div>
          {worstIncreaseCat ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Largest increase: {worstIncreaseCat}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="h-80">
          {top5Chart.length === 0 ? (
            <p className="text-sm text-slate-500">No expense data for this month to compare.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Chart} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => fmtMoneyTooltip(v)} />
                <Legend />
                <Bar dataKey="thisMonth" name="This month" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastMonth" name="Last month" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income stability score</CardTitle>
            <CardDescription>Consistency of income over the last 3 months</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {(monthlyQ.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No monthly trend data for this year.</p>
            ) : (
              <>
                <div
                  className="flex h-36 w-36 items-center justify-center rounded-full border-8 border-indigo-100 bg-indigo-50 text-center"
                  style={{
                    background: `conic-gradient(#4f46e5 ${stability.score * 3.6}deg, #e0e7ff 0deg)`,
                  }}
                >
                  <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                    <span className="text-3xl font-bold text-slate-900">{stability.score}</span>
                    <span className="text-xs font-medium text-indigo-600">{stability.label}</span>
                  </div>
                </div>
                <p className="text-center text-sm text-slate-600">
                  Your income varied by approximately <strong>{stability.variancePct}%</strong> (coefficient of variation)
                  across recent months.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-emerald-200 bg-emerald-50/60">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base text-emerald-900">Biggest win</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-emerald-900">
              {delta.biggestDecrease ? (
                <p>
                  Spending on <strong>{delta.biggestDecrease.category}</strong> fell by{' '}
                  {formatCurrency(delta.biggestDecrease.delta)} vs last month.
                </p>
              ) : (
                <p>No month-over-month spending decrease detected.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/60">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base text-red-900">Top risk</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-red-900">
              {delta.biggestIncrease ? (
                <p>
                  <strong>{delta.biggestIncrease.category}</strong> spending rose by{' '}
                  {formatCurrency(delta.biggestIncrease.delta)} vs last month.
                </p>
              ) : (
                <p>No spending increases vs last month.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base text-emerald-900">Savings momentum</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-emerald-900">
              {savingsWin ? (
                <p>
                  Savings rate improved to <strong>{curAgg.savingsRate.toFixed(1)}%</strong> from{' '}
                  {prevAgg.savingsRate.toFixed(1)}% last month.
                </p>
              ) : (
                <p>Savings rate did not improve vs last month ({curAgg.savingsRate.toFixed(1)}% now).</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly cash flow timeline</CardTitle>
          <CardDescription>Net balance (income − expenses) by month</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {cashFlowData.length === 0 ? (
            <p className="text-sm text-slate-500">No monthly data for {y}.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashFlowData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => fmtMoneyTooltip(v)} />
                <Legend />
                <ReferenceLine
                  y={cashFlowData[0]?.avgNet ?? 0}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                />
                <Bar dataKey="net" name="Net balance" radius={[4, 4, 0, 0]}>
                  {cashFlowData.map((e, i) => (
                    <Cell key={i} fill={e.net >= 0 ? '#059669' : '#dc2626'} />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="avgNet"
                  name="Average net"
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  dot={false}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unusual activity</CardTitle>
          <CardDescription>Transactions more than 2× your average for that category (last ~120 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {txLongQ.isError ? (
            <p className="text-sm text-red-600">Could not load transactions.</p>
          ) : unusual.length === 0 ? (
            <p className="text-sm text-slate-500">No unusually large expenses detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unusual.map(({ tx, ratio, avg }) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{tx.date.slice(0, 10)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        {tx.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600 tabular-nums">
                      {formatCurrency(Number(tx.amount))}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      This {tx.category} spend is about {ratio.toFixed(1)}× your average ({formatCurrency(avg)}).
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
