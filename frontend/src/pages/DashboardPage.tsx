import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import {
  useCategoryBreakdown,
  useDashboardSummary,
  useIncomeExpenseRatio,
  useMonthlyTrends,
  useRecentTransactions,
  useTopCategories,
  useWeeklyTrends,
} from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FinancialHealthScoreSection } from '@/components/dashboard/FinancialHealthScoreSection';
import { PeriodComparisonSection } from '@/components/dashboard/PeriodComparisonSection';
import { BudgetGoalsSection } from '@/components/dashboard/BudgetGoalsSection';
import type { CategoryBreakdownRow } from '@/types';

const INCOME_DONUT_FILLS = ['#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'];
const EXPENSE_DONUT_FILLS = ['#7f1d1d', '#b91c1c', '#dc2626', '#ea580c', '#f97316', '#fb923c'];

type CategorySlice = {
  name: string;
  value: number;
  percent: number;
  fill: string;
};

function buildTop5PlusOthers(
  rows: CategoryBreakdownRow[],
  type: 'INCOME' | 'EXPENSE',
  fills: string[],
): CategorySlice[] {
  const filtered = rows.filter((r) => r.type === type).sort((a, b) => b.total - a.total);
  const total = filtered.reduce((s, r) => s + r.total, 0);
  if (total <= 0) return [];
  const top5 = filtered.slice(0, 5);
  const rest = filtered.slice(5);
  const othersTotal = rest.reduce((s, r) => s + r.total, 0);
  const out: CategorySlice[] = top5.map((r, i) => ({
    name: r.category,
    value: r.total,
    percent: (r.total / total) * 100,
    fill: fills[Math.min(i, 4)]!,
  }));
  if (othersTotal > 0) {
    out.push({
      name: 'Others',
      value: othersTotal,
      percent: (othersTotal / total) * 100,
      fill: fills[5]!,
    });
  }
  return out;
}

function makeActivePieShape(extraOuter: number) {
  return function ActivePieShape(props: PieSectorDataItem) {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    const safeFill = fill ?? '#94a3b8';
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + extraOuter}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={safeFill}
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
      />
    );
  };
}

function CategorySliceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CategorySlice }>;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg">
      <p className="font-semibold text-slate-900">{d.name}</p>
      <p className="tabular-nums text-slate-700">{formatCurrency(d.value)}</p>
      <p className="text-xs text-slate-500">{d.percent.toFixed(1)}% of this chart total</p>
    </div>
  );
}

function CategoryTypeDonut({ title, data }: { title: string; data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center px-2">
        <h4 className="mb-2 text-center text-sm font-semibold text-slate-800">{title}</h4>
        <p className="text-center text-sm text-slate-500">No data for this type.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <h4 className="mb-1 text-center text-sm font-semibold tracking-tight text-slate-800">{title}</h4>
      <div className="h-[220px] w-full max-w-[300px] px-2 pt-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 12, right: 8, left: 8, bottom: 8 }}>
            <Tooltip
              content={<CategorySliceTooltip />}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 50 }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={4}
              cursor="pointer"
              activeShape={makeActivePieShape(12)}
              isAnimationActive
            >
              {data.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={entry.fill} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        className="mt-4 flex w-full max-w-[340px] flex-row flex-wrap justify-center gap-x-5 gap-y-2.5 px-2"
        aria-label={`${title} legend`}
      >
        {data.map((s) => (
          <li
            key={s.name}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-slate-700"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-200/80" style={{ backgroundColor: s.fill }} />
            <span className="max-w-[120px] truncate font-medium" title={s.name}>
              {s.name}
            </span>
            <span className="tabular-nums text-slate-500">{s.percent.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmtMoneyTooltip(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return formatCurrency(Number.isFinite(n) ? n : 0);
}

function fmtPercentTooltip(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return `${Number.isFinite(n) ? n : 0}%`;
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { canViewAnalytics } = useAuth();
  const [year, setYear] = useState(2024);

  const summaryQ = useDashboardSummary();
  const recentQ = useRecentTransactions(10);
  const monthlyQ = useMonthlyTrends(year);
  const weeklyQ = useWeeklyTrends(8);
  const categoriesQ = useCategoryBreakdown();
  const ratioQ = useIncomeExpenseRatio();
  const topCatQ = useTopCategories(5);

  const monthlyChart = useMemo(() => {
    const rows = monthlyQ.data ?? [];
    return rows.map((r) => ({
      ...r,
      label: r.month.slice(5) === '01' ? 'Jan' : undefined,
      short: r.month.slice(5, 7),
    }));
  }, [monthlyQ.data]);

  const weeklyChart = useMemo(() => {
    return (weeklyQ.data ?? []).map((w) => ({
      ...w,
      label: w.week.slice(5),
    }));
  }, [weeklyQ.data]);

  const incomeSlices = useMemo(
    () => buildTop5PlusOthers(categoriesQ.data ?? [], 'INCOME', INCOME_DONUT_FILLS),
    [categoriesQ.data],
  );
  const expenseSlices = useMemo(
    () => buildTop5PlusOthers(categoriesQ.data ?? [], 'EXPENSE', EXPENSE_DONUT_FILLS),
    [categoriesQ.data],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Overview of your finances</p>
      </div>

      {summaryQ.isLoading ? (
        <SummarySkeleton />
      ) : summaryQ.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-800">Could not load summary.</CardContent>
        </Card>
      ) : summaryQ.data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total income</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summaryQ.data.totalIncome)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total expenses</CardDescription>
                <CardTitle className="text-2xl font-bold text-red-600">
                  {formatCurrency(summaryQ.data.totalExpenses)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net balance</CardDescription>
                <CardTitle
                  className={cn(
                    'text-2xl font-bold',
                    summaryQ.data.netBalance >= 0 ? 'text-indigo-600' : 'text-red-600',
                  )}
                >
                  {formatCurrency(summaryQ.data.netBalance)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Savings rate</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {summaryQ.data.savingsRate}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <FinancialHealthScoreSection variant="dashboard" />
        </div>
      ) : null}

      {canViewAnalytics ? <PeriodComparisonSection /> : null}

      <BudgetGoalsSection compactLink />

      {!canViewAnalytics && (
        <Card className="border-indigo-100 bg-indigo-50/50">
          <CardContent className="pt-6 text-sm text-indigo-900">
            Charts and category analytics are available for <strong>Analyst</strong> and{' '}
            <strong>Admin</strong> roles. You still have access to summary totals and recent
            transactions below.
          </CardContent>
        </Card>
      )}

      {canViewAnalytics && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Monthly trends</CardTitle>
                <CardDescription>Income vs expenses by month</CardDescription>
              </div>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-80">
              {monthlyQ.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : monthlyQ.isError ? (
                <p className="text-sm text-red-600">Failed to load monthly data.</p>
              ) : monthlyChart.length === 0 || monthlyChart.every((m) => m.income === 0 && m.expense === 0) ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No transactions for this year. Try another year or add data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m) => String(m).slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value) => fmtMoneyTooltip(value)}
                      labelFormatter={(l) => `Month ${l}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#059669" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expense" name="Expense" stroke="#dc2626" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Category breakdown</CardTitle>
              <CardDescription>Top five income and expense categories (remainder grouped as Others)</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[320px] px-4 py-6 md:px-6">
              {categoriesQ.isLoading ? (
                <Skeleton className="min-h-[280px] w-full rounded-lg" />
              ) : categoriesQ.isError ? (
                <p className="text-sm text-red-600">Failed to load categories.</p>
              ) : incomeSlices.length === 0 && expenseSlices.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
                  No category data yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-8">
                  <CategoryTypeDonut title="Income Sources" data={incomeSlices} />
                  <CategoryTypeDonut title="Expense Categories" data={expenseSlices} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly trends</CardTitle>
              <CardDescription>Last 8 weeks</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {weeklyQ.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : weeklyQ.isError ? (
                <p className="text-sm text-red-600">Failed to load weekly data.</p>
              ) : weeklyChart.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No weekly data in range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={(w) => String(w).slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value) => fmtMoneyTooltip(value)} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Income vs expense ratio</CardTitle>
              <CardDescription>Composition of total flow</CardDescription>
            </CardHeader>
            <CardContent className="h-48">
              {ratioQ.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : ratioQ.isError || !ratioQ.data ? (
                <p className="text-sm text-red-600">Could not load ratio.</p>
              ) : ratioQ.data.total === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No data.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={[
                      { name: 'Income', value: ratioQ.data.incomeRatio, fill: '#059669' },
                      { name: 'Expenses', value: ratioQ.data.expenseRatio, fill: '#dc2626' },
                    ]}
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => fmtPercentTooltip(v)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Top categories by volume</CardTitle>
              <CardDescription>
                Highest combined transaction totals (income + expense), excluding soft-deleted rows
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topCatQ.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : topCatQ.isError ? (
                <p className="text-sm text-red-600">Could not load top categories.</p>
              ) : !topCatQ.data?.length ? (
                <p className="text-sm text-slate-500">No category data yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {topCatQ.data.map((row, i) => (
                    <li
                      key={row.category}
                      className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {i + 1}
                        </span>
                        <span className="font-medium text-slate-900">{row.category}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-600">
                        {formatCurrency(row.total)}{' '}
                        <span className="text-xs text-slate-400">({row.count} tx)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Latest 10 records</CardDescription>
        </CardHeader>
        <CardContent>
          {recentQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : recentQ.isError ? (
            <p className="text-sm text-red-600">Failed to load recent activity.</p>
          ) : !recentQ.data?.length ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQ.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDate(t.date)}</TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'INCOME' ? 'success' : 'destructive'}>{t.type}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium tabular-nums',
                        t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {t.type === 'EXPENSE' ? '−' : '+'}
                      {formatCurrency(Number(t.amount))}
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
