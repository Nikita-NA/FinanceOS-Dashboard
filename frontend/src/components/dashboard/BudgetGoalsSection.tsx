import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useTransactionsInRange } from '@/hooks/useTransactionsInRange';
import { aggregateForMonth } from '@/utils/transactionAggregate';
import { monthDateBounds } from '@/utils/monthBounds';
import {
  loadBudgetGoals,
  saveBudgetGoals,
  type BudgetGoalsState,
} from '@/utils/budgetGoalsStorage';
import { formatCurrency } from '@/utils/formatCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';

function progressBarClassExpense(pct: number, over: boolean) {
  if (over) return 'bg-red-500';
  if (pct < 70) return 'bg-emerald-500';
  if (pct <= 100) return 'bg-amber-400';
  return 'bg-red-500';
}

function progressBarClassSavings(achievedOfGoalPct: number) {
  if (achievedOfGoalPct >= 70) return 'bg-emerald-500';
  if (achievedOfGoalPct >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

function savingsMotivation(achievedOfGoalPct: number, metGoal: boolean) {
  if (metGoal) return { label: 'On track ✓', tone: 'text-emerald-700' };
  if (achievedOfGoalPct >= 70) return { label: 'Almost there!', tone: 'text-amber-700' };
  return { label: 'Keep pushing', tone: 'text-red-700' };
}

function expenseMotivation(spentRatio: number, over: boolean) {
  if (over) return { label: 'Over budget!', tone: 'text-red-700' };
  if (spentRatio < 0.7) return { label: 'On track ✓', tone: 'text-emerald-700' };
  if (spentRatio <= 1) return { label: 'Almost there!', tone: 'text-amber-700' };
  return { label: 'Over budget!', tone: 'text-red-700' };
}

export function BudgetGoalsSection({ compactLink }: { compactLink?: boolean }) {
  const [goals, setGoals] = useState<BudgetGoalsState>(() => loadBudgetGoals());
  const summaryQ = useDashboardSummary();

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setGoals(loadBudgetGoals());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const { from, to } = monthDateBounds(y, m);
  const txQ = useTransactionsInRange(from, to);

  const agg = useMemo(() => aggregateForMonth(txQ.data ?? [], y, m), [txQ.data, y, m]);

  const [editOpen, setEditOpen] = useState(false);
  const [editField, setEditField] = useState<'savings' | 'cap' | 'category' | null>(null);
  const [editCategoryName, setEditCategoryName] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCap, setNewCatCap] = useState('');

  const persist = (next: BudgetGoalsState) => {
    setGoals(next);
    saveBudgetGoals(next);
  };

  const openEdit = (field: 'savings' | 'cap', current: number) => {
    setEditField(field);
    setEditCategoryName(null);
    setDraftValue(String(current));
    setEditOpen(true);
  };

  const openEditCategory = (category: string, cap: number) => {
    setEditField('category');
    setEditCategoryName(category);
    setDraftValue(String(cap));
    setEditOpen(true);
  };

  const saveEdit = () => {
    const n = Number(draftValue);
    if (!Number.isFinite(n) || n < 0) return;
    if (editField === 'savings') persist({ ...goals, savingsRateGoal: n });
    else if (editField === 'cap') persist({ ...goals, monthlyExpenseCap: n });
    else if (editField === 'category' && editCategoryName) {
      persist({
        ...goals,
        categoryBudgets: { ...goals.categoryBudgets, [editCategoryName]: n },
      });
    }
    setEditOpen(false);
  };

  const addCategory = () => {
    const cap = Number(newCatCap);
    const name = newCatName.trim();
    if (!name || !Number.isFinite(cap) || cap < 0) return;
    persist({
      ...goals,
      categoryBudgets: { ...goals.categoryBudgets, [name]: cap },
    });
    setAddCatOpen(false);
    setNewCatName('');
    setNewCatCap('');
  };

  const savingsGoal = goals.savingsRateGoal || 1;
  const actualRate = agg.savingsRate;
  const achievedSavingsPct = Math.min(199, (actualRate / savingsGoal) * 100);
  const metSavings = actualRate >= savingsGoal;
  const savMot = savingsMotivation(achievedSavingsPct, metSavings);

  const cap = goals.monthlyExpenseCap || 1;
  const spent = agg.expense;
  const spentRatio = spent / cap;
  const overCap = spent > cap;
  const capProgressPct = Math.min(100, (spent / cap) * 100);
  const capMot = expenseMotivation(spentRatio, overCap);

  const loading = txQ.isLoading || summaryQ.isLoading;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Budget goals</h2>
          <p className="text-sm text-slate-500">Targets for this month (stored on this device)</p>
        </div>
        {compactLink ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/goals">Open goals page</Link>
          </Button>
        ) : null}
      </div>

      {summaryQ.data ? (
        <p className="text-xs text-slate-500">
          All-time summary: savings rate {summaryQ.data.savingsRate}% · net{' '}
          {formatCurrency(summaryQ.data.netBalance)}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : txQ.isError ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            Could not load this month&apos;s transactions for goal tracking.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <GoalRow
            title="Savings rate goal"
            subtitle={`Target at least ${goals.savingsRateGoal}% saved this month`}
            achievedLabel={`${achievedSavingsPct.toFixed(0)}% of goal achieved`}
            progressPct={Math.min(100, achievedSavingsPct)}
            barClass={progressBarClassSavings(achievedSavingsPct)}
            motivation={savMot}
            detail={`Current: ${actualRate.toFixed(1)}% · Income ${formatCurrency(agg.income)} · Expenses ${formatCurrency(agg.expense)}`}
            onEdit={() => openEdit('savings', goals.savingsRateGoal)}
          />

          <GoalRow
            title="Monthly expense cap"
            subtitle={`Cap: ${formatCurrency(goals.monthlyExpenseCap)}`}
            achievedLabel={`${capProgressPct.toFixed(0)}% of cap used`}
            progressPct={Math.min(100, capProgressPct)}
            barClass={progressBarClassExpense(capProgressPct, overCap)}
            motivation={capMot}
            detail={`Spent ${formatCurrency(spent)} this month`}
            onEdit={() => openEdit('cap', goals.monthlyExpenseCap)}
          />

          {Object.entries(goals.categoryBudgets).map(([cat, maxAmt]) => {
            const actual = agg.expenseByCategory[cat]?.total ?? 0;
            const ratio = maxAmt > 0 ? actual / maxAmt : 0;
            const over = actual > maxAmt;
            const pct = Math.min(100, ratio * 100);
            const mot = expenseMotivation(ratio, over);
            return (
              <GoalRow
                key={cat}
                title={cat}
                subtitle={`Max ${formatCurrency(maxAmt)} / month`}
                achievedLabel={`${pct.toFixed(0)}% of budget used`}
                progressPct={pct}
                barClass={progressBarClassExpense(pct, over)}
                motivation={mot}
                detail={`Spent ${formatCurrency(actual)}`}
                onEdit={() => openEditCategory(cat, maxAmt)}
              />
            );
          })}

          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setAddCatOpen(true)}>
            <Plus className="h-4 w-4" />
            Add category budget
          </Button>

          {!agg.income && !agg.expense ? (
            <p className="text-sm text-slate-500">No transactions this month yet — progress will update as you add data.</p>
          ) : null}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
            <DialogDescription>Update your target value.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="goal-val">Value</Label>
            <Input
              id="goal-val"
              type="number"
              min={0}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category budget</DialogTitle>
            <DialogDescription>Expense category name and monthly maximum.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nc">Category</Label>
              <Input id="nc" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Rent" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ncap">Monthly max ($)</Label>
              <Input
                id="ncap"
                type="number"
                min={0}
                value={newCatCap}
                onChange={(e) => setNewCatCap(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddCatOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addCategory}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function GoalRow({
  title,
  subtitle,
  achievedLabel,
  progressPct,
  barClass,
  motivation,
  detail,
  onEdit,
}: {
  title: string;
  subtitle: string;
  achievedLabel: string;
  progressPct: number;
  barClass: string;
  motivation: { label: string; tone: string };
  detail: string;
  onEdit: () => void;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onEdit} aria-label="Edit goal">
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">{achievedLabel}</span>
          <span className={cn('text-sm font-medium', motivation.tone)}>{motivation.label}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all', barClass)}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}
