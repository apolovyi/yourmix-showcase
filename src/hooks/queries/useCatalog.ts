import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCatalogCategories, getCatalogVendors } from '@/services';
import type { CatalogCategory, CatalogVendor } from '@/types';

export function useCatalogCategories(): UseQueryResult<CatalogCategory[], Error> {
  return useQuery({
    queryKey: ['catalog-categories'],
    queryFn: getCatalogCategories,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCatalogVendors(): UseQueryResult<CatalogVendor[], Error> {
  return useQuery({
    queryKey: ['catalog-vendors'],
    queryFn: getCatalogVendors,
    staleTime: 10 * 60 * 1000,
  });
}
