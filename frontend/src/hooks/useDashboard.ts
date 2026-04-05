import { useQuery } from '@tanstack/react-query';
import * as dashboardApi from '@/api/dashboard';
import { useAuth } from '@/context/AuthContext';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.getSummary,
  });
}

export function useCategoryBreakdown(type?: string) {
  const { canViewAnalytics } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'categories', type],
    queryFn: () => dashboardApi.getCategoryBreakdown(type),
    enabled: canViewAnalytics,
  });
}

export function useMonthlyTrends(year?: number) {
  const { canViewAnalytics } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'monthly', year],
    queryFn: () => dashboardApi.getMonthlyTrends(year),
    enabled: canViewAnalytics,
  });
}

export function useWeeklyTrends(weeks = 8) {
  const { canViewAnalytics } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'weekly', weeks],
    queryFn: () => dashboardApi.getWeeklyTrends(weeks),
    enabled: canViewAnalytics,
  });
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'recent', limit],
    queryFn: () => dashboardApi.getRecent(limit),
  });
}

export function useIncomeExpenseRatio() {
  const { canViewAnalytics } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'ratio'],
    queryFn: dashboardApi.getRatio,
    enabled: canViewAnalytics,
  });
}

export function useTopCategories(limit = 5) {
  const { canViewAnalytics } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'top-categories', limit],
    queryFn: () => dashboardApi.getTopCategories(limit),
    enabled: canViewAnalytics,
  });
}
