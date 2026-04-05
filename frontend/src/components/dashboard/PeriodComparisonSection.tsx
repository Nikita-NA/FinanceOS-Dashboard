import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  compareMonths,
  compareWeeks,
  compareYears,
  isImprovement,
  mergeMonthlyRows,
  percentChange,
  type PeriodMode,
  type PeriodMetrics,
} from '@/utils/periodComparison';
import { useMonthlyTrends, useWeeklyTrends } from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/utils/cn';
import { MiniSparkline } from './MiniSparkline';

type MetricKey = 'income' | 'expense' | 'net' | 'savingsRate';

function MetricCard({
  label,
  metric,
  current,
  previous,
  spark,
  sparkColor,
}: {
  label: string;
  metric: MetricKey;
  current: PeriodMetrics | null;
  previous: PeriodMetrics | null;
  spark: { income: number; expense: number; net?: number }[];
  sparkColor: string;
}) {
  const curVal = current ? current[metric] : null;
  const prevVal = previous ? previous[metric] : null;
  const pct = curVal != null && prevVal != null ? percentChange(curVal, prevVal) : null;
  const improved =
    curVal != null && prevVal != null ? isImprovement(metric, curVal, prevVal) : null;

  const sparkValues = useMemo(() => {
    if (metric === 'income') return spark.map((s) => s.income);
    if (metric === 'expense') return spark.map((s) => s.expense);
    if (metric === 'net') return spark.map((s) => s.income - s.expense);
    return spark.map((s) => (s.income > 0 ? ((s.income - s.expense) / s.income) * 100 : 0));
  }, [spark, metric]);

  const fmt =
    metric === 'savingsRate'
      ? (n: number) => `${Number.isFinite(n) ? n.toFixed(1) : '0'}%`
      : (n: number) => formatCurrency(n);

  const emptyBoth = curVal == null && prevVal == null;

  if (emptyBoth) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardDescription>{label}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No comparison data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-bold tabular-nums text-slate-900">
          {curVal != null ? fmt(curVal) : '—'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Last period:{' '}
            <span className="font-medium text-slate-700">{prevVal != null ? fmt(prevVal) : '—'}</span>
          </p>
          {pct != null && improved != null ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums',
                improved ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {improved ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {pct > 0 ? '+' : ''}
              {pct}%
            </span>
          ) : (
            <span className="text-xs text-slate-400">No % change</span>
          )}
        </div>
        <MiniSparkline values={sparkValues} color={sparkColor} />
      </CardContent>
    </Card>
  );
}

export function PeriodComparisonSection() {
  const [mode, setMode] = useState<PeriodMode>('month');
  const refDate = useMemo(() => new Date(), []);
  const y = refDate.getFullYear();

  const weeklyQ = useWeeklyTrends(8);
  const monthY = useMonthlyTrends(y);
  const monthPrevY = useMonthlyTrends(y - 1);
  const yearCur = useMonthlyTrends(y);
  const yearPrev = useMonthlyTrends(y - 1);

  const merged = useMemo(
    () => mergeMonthlyRows(monthY.data ?? [], monthPrevY.data ?? []),
    [monthY.data, monthPrevY.data],
  );

  const weekCmp = useMemo(() => compareWeeks(weeklyQ.data ?? []), [weeklyQ.data]);
  const monthCmp = useMemo(() => compareMonths(merged, refDate), [merged, refDate]);
  const yearCmp = useMemo(
    () => compareYears(yearCur.data ?? [], yearPrev.data ?? []),
    [yearCur.data, yearPrev.data],
  );

  const active =
    mode === 'week' ? weekCmp : mode === 'month' ? monthCmp : yearCmp;
  const loading =
    mode === 'week'
      ? weeklyQ.isLoading
      : mode === 'month'
        ? monthY.isLoading || monthPrevY.isLoading
        : yearCur.isLoading || yearPrev.isLoading;
  const error =
    mode === 'week'
      ? weeklyQ.isError
      : mode === 'month'
        ? monthY.isError || monthPrevY.isError
        : yearCur.isError || yearPrev.isError;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Period comparison</h2>
          <p className="text-sm text-slate-500">This period vs last period</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? 'default' : 'outline'}
              className={mode === m ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              onClick={() => setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-800">Could not load trend data.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Income"
            metric="income"
            current={active.current}
            previous={active.previous}
            spark={active.spark}
            sparkColor="#059669"
          />
          <MetricCard
            label="Expenses"
            metric="expense"
            current={active.current}
            previous={active.previous}
            spark={active.spark}
            sparkColor="#dc2626"
          />
          <MetricCard
            label="Net balance"
            metric="net"
            current={active.current}
            previous={active.previous}
            spark={active.spark}
            sparkColor="#4f46e5"
          />
          <MetricCard
            label="Savings rate"
            metric="savingsRate"
            current={active.current}
            previous={active.previous}
            spark={active.spark}
            sparkColor="#7c3aed"
          />
        </div>
      )}
    </section>
  );
}
