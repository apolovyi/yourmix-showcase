import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import { getServerProducts } from '@/services/bff/catalog';
import type { InventoryFilter, ProductPage } from '@/types';

export function useServerProducts(filter: InventoryFilter): UseQueryResult<ProductPage, Error> {
  return useQuery({
    queryKey: ['server-products', filter],
    queryFn: () => getServerProducts(filter),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
