import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import type { AuditLogEntry } from '@/types';

const fmtTs = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatAuditDetails(details: Record<string, unknown> | null): string {
  if (!details || typeof details !== 'object') return '—';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    const label = k
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
    parts.push(`${label}: ${String(v)}`);
  }
  return parts.length ? parts.join(', ') : '—';
}

function actionBadgeClass(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'UPDATE':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'DELETE':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'RESTORE':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-800';
  }
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('ALL');
  const [entity, setEntity] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 20;

  const query = useMemo(
    () => ({
      page,
      limit,
      action: action === 'ALL' ? undefined : action,
      entity: entity === 'ALL' ? undefined : entity,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [page, limit, action, entity, dateFrom, dateTo],
  );

  const listQ = useAuditLogs(query);
  const items = listQ.data?.items ?? [];
  const meta = listQ.data?.meta;

  const clearFilters = () => {
    setAction('ALL');
    setEntity('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-slate-500">System activity history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="RESTORE">RESTORE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select
              value={entity}
              onValueChange={(v) => {
                setEntity(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="transaction">transaction</SelectItem>
                <SelectItem value="user">user</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date from</Label>
            <Input
              type="date"
              className="w-[180px]"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Date to</Label>
            <Input
              type="date"
              className="w-[180px]"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="min-w-[240px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : listQ.isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-red-600">
                      Could not load audit logs.
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-slate-500">
                      <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="font-medium text-slate-700">No audit logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row: AuditLogEntry) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm text-slate-700">
                        {fmtTs.format(new Date(row.createdAt))}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-slate-900">{row.performedByEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('font-medium', actionBadgeClass(row.action))}
                        >
                          {row.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{row.entity}</TableCell>
                      <TableCell className="max-w-md text-sm text-slate-600">
                        {formatAuditDetails(row.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
