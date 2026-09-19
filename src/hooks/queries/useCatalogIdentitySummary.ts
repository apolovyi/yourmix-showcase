import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCatalogIdentitySummary } from '@/services';
import type { CatalogIdentityProjectionSummary } from '@/types';

export function useCatalogIdentitySummary(): UseQueryResult<
  CatalogIdentityProjectionSummary,
  Error
> {
  return useQuery({
    queryKey: ['catalog-identity-summary'],
    queryFn: getCatalogIdentitySummary,
    staleTime: 60_000,
  });
}
