import { useQuery } from '@tanstack/react-query';
import * as dashboardApi from '@/api/dashboard';
import { useAuth } from '@/context/AuthContext';

export function useHealthScore() {
  const { canViewAnalytics } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'health-score'],
    queryFn: dashboardApi.getHealthScore,
    enabled: canViewAnalytics,
  });
}
