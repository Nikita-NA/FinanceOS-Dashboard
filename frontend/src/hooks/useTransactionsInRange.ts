import { useQuery } from '@tanstack/react-query';
import * as txApi from '@/api/transactions';
import type { Transaction } from '@/types';

async function fetchAllInRange(dateFrom: string, dateTo: string, maxPages = 20): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = 1;
  const limit = 100;
  for (let i = 0; i < maxPages; i++) {
    const res = await txApi.listTransactions({
      dateFrom,
      dateTo,
      page,
      limit,
      sortBy: 'date',
      order: 'asc',
    });
    all.push(...res.items);
    if (!res.meta.hasNextPage) break;
    page += 1;
  }
  return all;
}

export function useTransactionsInRange(dateFrom: string | undefined, dateTo: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['transactions', 'inRange', dateFrom, dateTo],
    queryFn: () => fetchAllInRange(dateFrom!, dateTo!),
    enabled: enabled && !!dateFrom && !!dateTo,
  });
}
