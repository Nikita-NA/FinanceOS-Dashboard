import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Download, Loader2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/api/client';
import type { Transaction, TransactionType } from '@/types';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useRestoreTransaction,
  useTransactionsList,
  useUpdateTransaction,
} from '@/hooks/useTransactions';
import { exportTransactionsFile } from '@/api/transactions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/utils/cn';

const txSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1, 'Category required').max(100),
  date: z.string().min(1, 'Date required'),
  notes: z.string().max(500).optional(),
});

type TxForm = z.infer<typeof txSchema>;

function toFormDefaults(t?: Transaction | null): TxForm {
  if (!t) {
    return {
      amount: 0,
      type: 'EXPENSE',
      category: '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    };
  }
  return {
    amount: Number(t.amount),
    type: t.type,
    category: t.category,
    date: t.date.slice(0, 10),
    notes: t.notes ?? '',
  };
}

export function TransactionsPage() {
  const { isAdmin, user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ANALYST';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'createdAt'>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleted, setShowDeleted] = useState(false);
  const limit = 10;

  const query = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      category: category || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      order,
      ...(isAdmin && showDeleted ? { includeDeleted: true as const } : {}),
    }),
    [page, limit, search, typeFilter, category, dateFrom, dateTo, sortBy, order, isAdmin, showDeleted],
  );

  const listQ = useTransactionsList(query);
  const createM = useCreateTransaction();
  const updateM = useUpdateTransaction();
  const deleteM = useDeleteTransaction();
  const restoreM = useRestoreTransaction();

  const exportParams = useMemo(
    () => ({
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      category: category || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [typeFilter, category, dateFrom, dateTo],
  );

  const exportCsvM = useMutation({
    mutationFn: () => exportTransactionsFile({ format: 'csv', ...exportParams }),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => {
      toast.error('Export failed. Please try again.');
    },
  });

  const exportJsonM = useMutation({
    mutationFn: () => exportTransactionsFile({ format: 'json', ...exportParams }),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => {
      toast.error('Export failed. Please try again.');
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const createForm = useForm<TxForm>({
    resolver: zodResolver(txSchema) as Resolver<TxForm>,
    defaultValues: toFormDefaults(),
  });

  const editForm = useForm<TxForm>({
    resolver: zodResolver(txSchema) as Resolver<TxForm>,
    values: editTx ? toFormDefaults(editTx) : toFormDefaults(),
  });

  const onCreate = createForm.handleSubmit(async (data) => {
    try {
      await createM.mutateAsync({
        amount: data.amount,
        type: data.type,
        category: data.category,
        date: data.date,
        notes: data.notes || undefined,
      });
      toast.success('Transaction created');
      setCreateOpen(false);
      createForm.reset(toFormDefaults());
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  });

  const onUpdate = editForm.handleSubmit(async (data) => {
    if (!editTx) return;
    try {
      await updateM.mutateAsync({
        id: editTx.id,
        payload: {
          amount: data.amount,
          type: data.type,
          category: data.category,
          date: data.date,
          notes: data.notes || undefined,
        },
      });
      toast.success('Transaction updated');
      setEditTx(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  });

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteM.mutateAsync(deleteId);
      toast.success('Transaction deleted');
      setDeleteId(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onRestore = async () => {
    if (!restoreId) return;
    try {
      await restoreM.mutateAsync(restoreId);
      toast.success('Transaction restored successfully');
      setRestoreId(null);
    } catch {
      toast.error('Failed to restore transaction');
    }
  };

  const items = listQ.data?.items ?? [];
  const meta = listQ.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-slate-500">Manage income and expenses</p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={exportCsvM.isPending || exportJsonM.isPending}
              onClick={() => exportCsvM.mutate()}
            >
              {exportCsvM.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={exportCsvM.isPending || exportJsonM.isPending}
              onClick={() => exportJsonM.mutate()}
            >
              {exportJsonM.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export JSON
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New transaction
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Notes or category"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as TransactionType | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Sort</Label>
            <div className="flex gap-2">
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as 'date' | 'amount' | 'createdAt')}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="createdAt">Created</SelectItem>
                </SelectContent>
              </Select>
              <Select value={order} onValueChange={(v) => setOrder(v as 'asc' | 'desc')}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 md:col-span-2 lg:col-span-4 xl:col-span-6">
              <input
                type="checkbox"
                id="show-deleted-tx"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={showDeleted}
                onChange={(e) => {
                  setShowDeleted(e.target.checked);
                  setPage(1);
                }}
              />
              <Label htmlFor="show-deleted-tx" className="cursor-pointer font-normal text-slate-700">
                Show deleted transactions
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 pt-4">
          {listQ.isLoading ? (
            <div className="p-6">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : listQ.isError ? (
            <p className="p-6 text-sm text-red-600">Failed to load transactions.</p>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-medium">No transactions match your filters</p>
              <p className="mt-1 text-sm">Try adjusting filters or create a new transaction.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  {(canWrite || isAdmin) && <TableHead className="w-28 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => {
                  const isRowDeleted = !!t.deletedAt;
                  return (
                    <TableRow
                      key={t.id}
                      className={cn(
                        isRowDeleted
                          ? 'border-red-100 bg-red-50/90 hover:bg-red-50'
                          : t.type === 'INCOME'
                            ? 'bg-emerald-50/40'
                            : 'bg-red-50/40',
                      )}
                    >
                      <TableCell className={cn(isRowDeleted && 'text-slate-500 line-through')}>
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell
                        className={cn('font-medium', isRowDeleted && 'text-slate-500 line-through')}
                      >
                        {t.category}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={t.type === 'INCOME' ? 'success' : 'destructive'}>{t.type}</Badge>
                          {isRowDeleted && (
                            <Badge variant="outline" className="border-red-200 bg-red-100/80 text-red-800">
                              Deleted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold tabular-nums',
                          isRowDeleted
                            ? 'text-slate-500 line-through'
                            : t.type === 'INCOME'
                              ? 'text-emerald-700'
                              : 'text-red-700',
                        )}
                      >
                        {t.type === 'EXPENSE' ? '−' : '+'}
                        {formatCurrency(Number(t.amount))}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'max-w-[200px] truncate text-slate-600',
                          isRowDeleted && 'text-slate-500 line-through',
                        )}
                      >
                        {t.notes ?? '—'}
                      </TableCell>
                      {(canWrite || isAdmin) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {isRowDeleted && isAdmin ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
                                onClick={() => setRestoreId(t.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                                Restore
                              </Button>
                            ) : (
                              <>
                                {canWrite && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => setEditTx(t)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => setDeleteId(t.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-500">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
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
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New transaction</DialogTitle>
            <DialogDescription>Add an income or expense record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" {...createForm.register('amount')} />
                {createForm.formState.errors.amount && (
                  <p className="text-xs text-red-600">{createForm.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={createForm.watch('type')}
                  onValueChange={(v) => createForm.setValue('type', v as TransactionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input {...createForm.register('category')} />
              {createForm.formState.errors.category && (
                <p className="text-xs text-red-600">{createForm.formState.errors.category.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...createForm.register('date')} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input {...createForm.register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createM.isPending}>
                {createM.isPending ? 'Saving…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTx} onOpenChange={(o) => !o && setEditTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
            <DialogDescription>Update this record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" {...editForm.register('amount')} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editForm.watch('type')}
                  onValueChange={(v) => editForm.setValue('type', v as TransactionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input {...editForm.register('category')} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...editForm.register('date')} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input {...editForm.register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTx(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateM.isPending}>
                {updateM.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete transaction?</DialogTitle>
            <DialogDescription>This soft-deletes the record. This action is for admins.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleteM.isPending}>
              {deleteM.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restoreId} onOpenChange={(o) => !o && setRestoreId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this transaction?</DialogTitle>
            <DialogDescription>
              This will make the record visible again in the main list and reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onRestore}
              disabled={restoreM.isPending}
            >
              {restoreM.isPending ? 'Restoring…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
