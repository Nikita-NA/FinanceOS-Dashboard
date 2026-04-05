import { BudgetGoalsSection } from '@/components/dashboard/BudgetGoalsSection';

export function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Goals</h1>
        <p className="text-slate-500">Monthly budget targets stored locally on your device</p>
      </div>
      <BudgetGoalsSection />
    </div>
  );
}
