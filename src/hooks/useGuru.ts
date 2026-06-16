import { useQuery } from '@tanstack/react-query';
import {
  fetchTransactions,
  fetchSubscriptions,
  fetchContacts,
  type GuruTransactionsParams,
} from '@/lib/guru';

const STALE_5M = 1000 * 60 * 5;

export function useGuruTransactions(params?: GuruTransactionsParams) {
  return useQuery({
    queryKey: ['guru', 'transactions', params],
    queryFn: () => fetchTransactions(params),
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useGuruSubscriptions(params?: {
  per_page?: number;
  page?: number;
  status?: string;
  contact_id?: string;
  product_id?: string;
}) {
  return useQuery({
    queryKey: ['guru', 'subscriptions', params],
    queryFn: () => fetchSubscriptions(params),
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useGuruContacts(params?: {
  per_page?: number;
  page?: number;
  search?: string;
  name?: string;
  email?: string;
  doc?: string;
}) {
  return useQuery({
    queryKey: ['guru', 'contacts', params],
    queryFn: () => fetchContacts(params),
    staleTime: STALE_5M,
    retry: 1,
  });
}
