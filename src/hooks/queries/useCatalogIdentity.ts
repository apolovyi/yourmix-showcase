import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCatalogIdentity } from '@/services';
import type { CatalogIdentityProjection } from '@/types';

export function useCatalogIdentity(
  cscartProductId: number | null,
): UseQueryResult<CatalogIdentityProjection | null, Error> {
  return useQuery({
    queryKey: ['catalog-identity', cscartProductId],
    queryFn: () => getCatalogIdentity(cscartProductId!),
    enabled: cscartProductId !== null,
    staleTime: 60 * 1000,
  });
}
