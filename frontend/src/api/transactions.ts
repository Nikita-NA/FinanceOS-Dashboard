import { api } from './client';
import type { Paginated, Transaction, TransactionType } from '@/types';

export interface TransactionQuery {
  type?: TransactionType;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  /** ADMIN only; backend ignores for other roles */
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateTransactionPayload {
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  notes?: string;
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>;

export async function listTransactions(q: TransactionQuery): Promise<Paginated<Transaction>> {
  const { data } = await api.get<Paginated<Transaction>>('/transactions', { params: q });
  return data;
}

export async function getTransaction(id: string): Promise<Transaction> {
  const { data } = await api.get<Transaction>(`/transactions/${id}`);
  return data;
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  const { data } = await api.post<Transaction>('/transactions', payload);
  return data;
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload,
): Promise<Transaction> {
  const { data } = await api.patch<Transaction>(`/transactions/${id}`, payload);
  return data;
}

export async function deleteTransaction(id: string): Promise<Transaction> {
  const { data } = await api.delete<Transaction>(`/transactions/${id}`);
  return data;
}

export async function restoreTransaction(id: string): Promise<Transaction> {
  const { data } = await api.patch<Transaction>(`/transactions/${id}/restore`);
  return data;
}

export interface ExportTransactionsParams {
  format: 'csv' | 'json';
  type?: TransactionType;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

function parseFilenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header);
  if (m?.[1]) return decodeURIComponent(m[1].trim());
  return fallback;
}

export async function exportTransactionsFile(
  params: ExportTransactionsParams,
): Promise<{ blob: Blob; filename: string }> {
  const fallback =
    params.format === 'json'
      ? `transactions-${new Date().toISOString().slice(0, 10)}.json`
      : `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  const res = await api.get<Blob>('/transactions/export', {
    params: {
      format: params.format,
      type: params.type,
      category: params.category,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    },
    responseType: 'blob',
  });
  const filename = parseFilenameFromDisposition(
    res.headers['content-disposition'],
    fallback,
  );
  return { blob: res.data, filename };
}
