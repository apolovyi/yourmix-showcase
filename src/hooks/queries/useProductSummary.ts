import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getProductSummary } from '@/services/bff/catalog';
import type { ProductSummary } from '@/types';

export function useProductSummary(): UseQueryResult<ProductSummary, Error> {
  return useQuery({
    queryKey: ['product-summary'],
    queryFn: getProductSummary,
    staleTime: 60_000,
  });
}
