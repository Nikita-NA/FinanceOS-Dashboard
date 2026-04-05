export interface BudgetGoalsState {
  savingsRateGoal: number;
  monthlyExpenseCap: number;
  categoryBudgets: Record<string, number>;
}

const STORAGE_KEY = 'financeOS_budgetGoals';

const defaultState: BudgetGoalsState = {
  savingsRateGoal: 40,
  monthlyExpenseCap: 3000,
  categoryBudgets: {},
};

export function loadBudgetGoals(): BudgetGoalsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, categoryBudgets: {} };
    const parsed = JSON.parse(raw) as Partial<BudgetGoalsState>;
    return {
      savingsRateGoal: typeof parsed.savingsRateGoal === 'number' ? parsed.savingsRateGoal : defaultState.savingsRateGoal,
      monthlyExpenseCap:
        typeof parsed.monthlyExpenseCap === 'number' ? parsed.monthlyExpenseCap : defaultState.monthlyExpenseCap,
      categoryBudgets:
        parsed.categoryBudgets && typeof parsed.categoryBudgets === 'object' ? parsed.categoryBudgets : {},
    };
  } catch {
    return { ...defaultState, categoryBudgets: {} };
  }
}

export function saveBudgetGoals(state: BudgetGoalsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
