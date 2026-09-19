import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCatalogProducts, getCatalogProduct } from '@/services';
import type { ProductFilter, ProductPage, CatalogProduct } from '@/types';

export function useCatalogProducts(filter: ProductFilter = {}): UseQueryResult<ProductPage, Error> {
  return useQuery({
    queryKey: ['catalog-products', filter],
    queryFn: () => getCatalogProducts(filter),
  });
}

export function useCatalogProduct(id: number | null): UseQueryResult<CatalogProduct, Error> {
  return useQuery({
    queryKey: ['catalog-product', id],
    queryFn: () => getCatalogProduct(id!),
    enabled: id !== null,
  });
}
