import { useQuery } from '@tanstack/react-query';
import {
  fetchTransactions,
  fetchSubscriptions,
  fetchContacts,
  fetchTransaction,
  fetchSubscription,
  fetchSubscriptionInvoices,
  fetchInvoice,
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

export function useGuruTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['guru', 'transaction', id],
    enabled: !!id,
    queryFn: () => fetchTransaction(id!),
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useGuruSubscription(id: string | undefined) {
  return useQuery({
    queryKey: ['guru', 'subscription', id],
    enabled: !!id,
    queryFn: () => fetchSubscription(id!),
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useGuruSubscriptionInvoices(id: string | undefined) {
  return useQuery({
    queryKey: ['guru', 'subscription', id, 'invoices'],
    enabled: !!id,
    queryFn: () => fetchSubscriptionInvoices(id!),
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useGuruInvoice(id: string | undefined, subscriptionId?: string) {
  return useQuery({
    queryKey: ['guru', 'invoice', id, subscriptionId],
    enabled: !!id,
    queryFn: () => fetchInvoice(id!, subscriptionId),
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
