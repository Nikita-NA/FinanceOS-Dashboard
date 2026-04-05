import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  Briefcase,
  Car,
  CircleDot,
  Gift,
  Heart,
  Home,
  Laptop,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import { useTransactionsInRange } from '@/hooks/useTransactionsInRange';
import { aggregateForMonth, expenseTotalsByCategory, incomeTotalsByCategory } from '@/utils/transactionAggregate';
import { monthDateBounds, prevMonth } from '@/utils/monthBounds';
import { formatCurrency } from '@/utils/formatCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

const FLOW_COLORS = ['#4f46e5', '#7c3aed', '#6366f1', '#8b5cf6', '#a78bfa', '#059669', '#0d9488', '#dc2626', '#f97316'];

function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('salary') || n.includes('wage')) return Briefcase;
  if (n.includes('freelance') || n.includes('contract')) return Laptop;
  if (n.includes('rent') || n.includes('housing') || n.includes('mortgage')) return Home;
  if (n.includes('food') || n.includes('grocery') || n.includes('dining')) return Utensils;
  if (n.includes('shop') || n.includes('retail')) return ShoppingCart;
  if (n.includes('car') || n.includes('auto') || n.includes('fuel')) return Car;
  if (n.includes('health') || n.includes('medical')) return Heart;
  if (n.includes('gift')) return Gift;
  if (n.includes('invest') || n.includes('dividend')) return Banknote;
  return CircleDot;
}

function fmtMoneyTooltip(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return formatCurrency(Number.isFinite(n) ? n : 0);
}

function expenseShareColor(pctOfTotal: number) {
  if (pctOfTotal > 30) return 'text-red-600';
  if (pctOfTotal >= 15) return 'text-amber-600';
  return 'text-emerald-600';
}

export function BreakdownPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { from, to } = monthDateBounds(year, month);
  const txQ = useTransactionsInRange(from, to);

  const { year: py, month: pm } = prevMonth(year, month);
  const prevBounds = monthDateBounds(py, pm);
  const prevQ = useTransactionsInRange(prevBounds.from, prevBounds.to);

  const agg = useMemo(() => aggregateForMonth(txQ.data ?? [], year, month), [txQ.data, year, month]);
  const prevAgg = useMemo(() => aggregateForMonth(prevQ.data ?? [], py, pm), [prevQ.data, py, pm]);

  const incomeRows = useMemo(() => incomeTotalsByCategory(agg), [agg]);
  const expenseRows = useMemo(() => expenseTotalsByCategory(agg), [agg]);

  const incomeTotal = agg.income || 1;
  const expenseTotal = agg.expense || 1;

  const flowIncomeRow = useMemo(() => {
    const row: Record<string, string | number> = { name: 'Income sources' };
    incomeRows.forEach((r, i) => {
      row[`i${i}`] = r.total;
    });
    return row;
  }, [incomeRows]);

  const flowExpenseRow = useMemo(() => {
    const row: Record<string, string | number> = { name: 'Expenses' };
    expenseRows.forEach((r, i) => {
      row[`e${i}`] = r.total;
    });
    return row;
  }, [expenseRows]);

  const flowData = useMemo(() => [flowIncomeRow, flowExpenseRow], [flowIncomeRow, flowExpenseRow]);

  const incomeKeys = incomeRows.map((_, i) => `i${i}`);
  const expenseKeys = expenseRows.map((_, i) => `e${i}`);

  const loading = txQ.isLoading || prevQ.isLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Breakdown</h1>
          <p className="text-slate-500">Income sources and expense categories for a selected month</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : txQ.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-800">Could not load transactions for this period.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Income sources</CardTitle>
                <CardDescription>{formatCurrency(agg.income)} total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {incomeRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No income recorded this month.</p>
                ) : (
                  incomeRows.map((row) => {
                    const pct = (row.total / incomeTotal) * 100;
                    const prevAmt = prevAgg.incomeByCategory[row.category]?.total ?? 0;
                    const delta = row.total - prevAmt;
                    const Icon = categoryIcon(row.category);
                    return (
                      <div key={row.category} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0 text-indigo-600" />
                            <span className="truncate font-medium text-slate-900">{row.category}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {delta !== 0 ? (
                              delta > 0 ? (
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )
                            ) : null}
                            <span className="tabular-nums text-sm font-semibold text-slate-900">
                              {formatCurrency(row.total)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{pct.toFixed(1)}% of income</span>
                          <span>{row.count} tx</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Expense categories</CardTitle>
                <CardDescription>{formatCurrency(agg.expense)} total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No expenses recorded this month.</p>
                ) : (
                  expenseRows.map((row) => {
                    const pctOfExp = (row.total / expenseTotal) * 100;
                    const prevAmt = prevAgg.expenseByCategory[row.category]?.total ?? 0;
                    const delta = row.total - prevAmt;
                    const Icon = categoryIcon(row.category);
                    return (
                      <div key={row.category} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className={cn('h-4 w-4 shrink-0', expenseShareColor(pctOfExp))} />
                            <span className="truncate font-medium text-slate-900">{row.category}</span>
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {row.count}
                            </Badge>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {delta !== 0 ? (
                              delta > 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-emerald-600" />
                              )
                            ) : null}
                            <span className="tabular-nums text-sm font-semibold text-slate-900">
                              {formatCurrency(row.total)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn('font-medium', expenseShareColor(pctOfExp))}>
                            {pctOfExp.toFixed(1)}% of expenses
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${Math.min(100, pctOfExp)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly flow snapshot</CardTitle>
              <CardDescription>
                Stacked bars: how income sources compare in size to expense categories (same month)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56">
              {incomeRows.length === 0 && expenseRows.length === 0 ? (
                <p className="text-sm text-slate-500">No data to visualize for this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} layout="vertical" margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => fmtMoneyTooltip(v)} />
                    <Legend />
                    {incomeKeys.map((k, i) => (
                      <Bar key={k} dataKey={k} stackId="inc" fill={FLOW_COLORS[i % FLOW_COLORS.length]} name={incomeRows[i]?.category ?? k} />
                    ))}
                    {expenseKeys.map((k, i) => (
                      <Bar
                        key={k}
                        dataKey={k}
                        stackId="exp"
                        fill={FLOW_COLORS[(i + 3) % FLOW_COLORS.length]}
                        name={expenseRows[i]?.category ?? k}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
