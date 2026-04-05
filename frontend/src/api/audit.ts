import { api } from './client';
import type { AuditLogEntry, Paginated } from '@/types';

export interface AuditLogQuery {
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(q: AuditLogQuery): Promise<Paginated<AuditLogEntry>> {
  const { data } = await api.get<Paginated<AuditLogEntry>>('/audit-logs', { params: q });
  return data;
}
