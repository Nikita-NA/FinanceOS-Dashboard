import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useHealthScore } from '@/hooks/useHealthScore';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import type { HealthScoreBreakdownPart, HealthScoreResponse } from '@/types';

function gradeTextClass(grade: string): string {
  switch (grade) {
    case 'A':
      return 'text-emerald-600';
    case 'B':
      return 'text-blue-600';
    case 'C':
      return 'text-amber-600';
    case 'D':
      return 'text-orange-600';
    case 'F':
      return 'text-red-600';
    default:
      return 'text-slate-600';
  }
}

function ScoreArc({ score, gradId, className }: { score: number; gradId: string; className?: string }) {
  const w = 200;
  const h = 110;
  const r = 78;
  const cx = w / 2;
  const cy = h - 8;
  const arcLen = Math.PI * r;
  const dash = Math.max(0, Math.min(100, score)) / 100;

  return (
    <svg
      className={cn('mx-auto block', className)}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </linearGradient>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#e2e8f8"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${dash * arcLen} ${arcLen}`}
      />
    </svg>
  );
}

const BREAKDOWN_ROWS: { key: keyof HealthScoreResponse['breakdown']; label: string }[] = [
  { key: 'savingsRate', label: 'Savings rate' },
  { key: 'expenseConsistency', label: 'Expense consistency' },
  { key: 'incomeDiversity', label: 'Income diversity' },
  { key: 'housingCostRatio', label: 'Housing cost ratio' },
  { key: 'trend', label: 'Trend' },
];

function BreakdownRows({ data }: { data: HealthScoreResponse }) {
  return (
    <ul className="space-y-3">
      {BREAKDOWN_ROWS.map(({ key, label }) => {
        const part: HealthScoreBreakdownPart = data.breakdown[key];
        const pct = part.max > 0 ? (part.score / part.max) * 100 : 0;
        return (
          <li key={key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-700">{label}</span>
              <span className="tabular-nums text-slate-500">
                {part.score}/{part.max}{' '}
                <span className="text-slate-400">· {part.label}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TipsBox({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-950">
      <p className="mb-2 font-medium text-indigo-900">Tips</p>
      <ul className="list-disc space-y-1 pl-5 text-indigo-900/90">
        {tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function FinancialHealthScoreSection({
  variant,
}: {
  variant: 'dashboard' | 'insights';
}) {
  const { canViewAnalytics } = useAuth();
  const q = useHealthScore();
  const [open, setOpen] = useState(variant === 'insights');
  const arcGradId = useId().replace(/:/g, '');

  if (!canViewAnalytics) return null;

  const isLarge = variant === 'insights';

  return (
    <Card className={cn(isLarge && 'border-indigo-100 shadow-sm')}>
      <CardHeader className="pb-2">
        <CardTitle className={cn(isLarge ? 'text-xl' : 'text-lg')}>Financial Health Score</CardTitle>
        <CardDescription>
          Composite score from savings, spending patterns, income mix, housing load, and recent trend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="mx-auto h-24 w-48" />
            <Skeleton className="h-10 w-full max-w-xs mx-auto" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : q.isError ? (
          <p className="py-6 text-center text-sm text-slate-500">Score unavailable</p>
        ) : q.data ? (
          <>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-6">
              <ScoreArc
                gradId={arcGradId}
                score={q.data.score}
                className={isLarge ? 'scale-110' : ''}
              />
              <div className="flex items-baseline justify-center gap-3">
                <span
                  className={cn(
                    'font-bold tabular-nums tracking-tight',
                    isLarge ? 'text-5xl' : 'text-4xl',
                    'text-slate-900',
                  )}
                >
                  {q.data.score}
                </span>
                <span
                  className={cn(
                    'rounded-md border border-slate-200 bg-white px-2.5 py-1 text-2xl font-bold tabular-nums shadow-sm',
                    gradeTextClass(q.data.grade),
                    isLarge && 'text-3xl px-3 py-1.5',
                  )}
                >
                  {q.data.grade}
                </span>
              </div>
            </div>

            {(variant === 'insights' || open) && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <BreakdownRows data={q.data} />
                <TipsBox tips={q.data.tips} />
              </div>
            )}

            {variant === 'dashboard' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full gap-1 text-indigo-700 hover:text-indigo-900"
                onClick={() => setOpen((o) => !o)}
              >
                {open ? (
                  <>
                    Hide details <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show details <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
