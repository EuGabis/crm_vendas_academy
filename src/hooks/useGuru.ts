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

/**
 * Busca multiplas paginas de transactions em paralelo e agrega.
 * Resolve o caso do Dashboard onde a 1a pagina nao cobre o periodo inteiro.
 *
 * Estratégia:
 *  - busca page 1
 *  - se meta.last_page > 1, busca pages 2..min(last_page, maxPages) em paralelo
 *  - retorna { data: [...todas], meta: { total, last_page, fetched_pages } }
 */
export function useGuruTransactionsAll(
  params: GuruTransactionsParams & { maxPages?: number },
) {
  const { maxPages = 5, ...rest } = params;
  return useQuery({
    queryKey: ['guru', 'transactions', 'all', rest, maxPages],
    staleTime: STALE_5M,
    retry: 1,
    queryFn: async () => {
      const first = await fetchTransactions({ ...rest, page: 1 });
      const lastPage = Math.min(first.meta?.last_page ?? 1, maxPages);
      if (lastPage <= 1) {
        return {
          data: first.data ?? [],
          meta: {
            ...(first.meta ?? {}),
            fetched_pages: 1,
            truncated: (first.meta?.last_page ?? 1) > 1,
          },
        };
      }
      const pages = [];
      for (let p = 2; p <= lastPage; p++) pages.push(p);
      const rest_results = await Promise.all(
        pages.map((p) => fetchTransactions({ ...rest, page: p })),
      );
      const all = [
        ...(first.data ?? []),
        ...rest_results.flatMap((r) => r.data ?? []),
      ];
      return {
        data: all,
        meta: {
          ...(first.meta ?? {}),
          fetched_pages: lastPage,
          truncated: (first.meta?.last_page ?? 1) > lastPage,
        },
      };
    },
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
  phone?: string;
  kind?: 'auto' | 'name' | 'email' | 'doc' | 'phone';
}) {
  return useQuery({
    queryKey: ['guru', 'contacts', params],
    queryFn: () => fetchContacts(params),
    staleTime: STALE_5M,
    retry: 1,
  });
}
