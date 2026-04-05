import { api } from './client';
import type {
  CategoryBreakdownRow,
  DashboardSummary,
  HealthScoreResponse,
  IncomeExpenseRatio,
  MonthlyTrendRow,
  TopCategoryRow,
  Transaction,
  WeeklyTrendRow,
} from '@/types';

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary');
  return data;
}

export async function getCategoryBreakdown(type?: string): Promise<CategoryBreakdownRow[]> {
  const { data } = await api.get<CategoryBreakdownRow[]>('/dashboard/categories', {
    params: type ? { type } : undefined,
  });
  return data;
}

export async function getMonthlyTrends(year?: number): Promise<MonthlyTrendRow[]> {
  const { data } = await api.get<MonthlyTrendRow[]>('/dashboard/trends/monthly', {
    params: year != null ? { year } : undefined,
  });
  return data;
}

export async function getWeeklyTrends(weeks = 8): Promise<WeeklyTrendRow[]> {
  const { data } = await api.get<WeeklyTrendRow[]>('/dashboard/trends/weekly', {
    params: { weeks },
  });
  return data;
}

export async function getRecent(limit = 10): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>('/dashboard/recent', {
    params: { limit },
  });
  return data;
}

export async function getRatio(): Promise<IncomeExpenseRatio> {
  const { data } = await api.get<IncomeExpenseRatio>('/dashboard/ratio');
  return data;
}

export async function getTopCategories(limit = 5): Promise<TopCategoryRow[]> {
  const { data } = await api.get<TopCategoryRow[]>('/dashboard/top-categories', {
    params: { limit },
  });
  return data;
}

export async function getHealthScore(): Promise<HealthScoreResponse> {
  const { data } = await api.get<HealthScoreResponse>('/dashboard/health-score');
  return data;
}
