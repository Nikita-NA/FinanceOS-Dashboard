import { useQuery } from '@tanstack/react-query';
import type { AuditLogQuery } from '@/api/audit';
import * as auditApi from '@/api/audit';
import { useAuth } from '@/context/AuthContext';

export function useAuditLogs(query: AuditLogQuery) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => auditApi.listAuditLogs(query),
    enabled: isAdmin,
  });
}
