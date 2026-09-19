import { api } from '@/services/api-client';
import { NotFoundError } from '@/services/errors';
import type {
  CatalogProduct,
  ProductFilter,
  ProductPage,
  ProductSummary,
  InventoryFilter,
  CatalogCategory,
  CatalogVendor,
  CatalogIdentityProjection,
  CatalogIdentityProjectionSummary,
} from '@/types';

type CatalogIdentityApiClient = {
  GET: (
    path: '/api/catalog/identities/{cscartProductId}',
    init: { params: { path: { cscartProductId: number } } },
  ) => Promise<{ data?: CatalogIdentityProjection }>;
};

type CatalogIdentitySummaryApiClient = {
  GET: (path: '/api/catalog/identities/summary') => Promise<{
    data?: CatalogIdentityProjectionSummary;
  }>;
};

const catalogIdentityApi = api as unknown as CatalogIdentityApiClient;
const catalogIdentitySummaryApi = api as unknown as CatalogIdentitySummaryApiClient;

export async function getCatalogProducts(filter: ProductFilter = {}): Promise<ProductPage> {
  const { data } = await api.GET('/api/catalog/products', {
    params: {
      query: {
        page: filter.page,
        pageSize: filter.pageSize,
        search: filter.search,
        category: filter.category,
        status: filter.status,
        identityStatus: filter.identityStatus,
        priceMin: filter.priceMin,
        priceMax: filter.priceMax,
      },
    },
  });
  return data!;
}

export async function getCatalogProduct(id: number): Promise<CatalogProduct> {
  const { data } = await api.GET('/api/catalog/products/{id}', {
    params: { path: { id } },
  });
  return data!;
}

export async function searchProductBySku(sku: string): Promise<CatalogProduct> {
  const { data } = await api.GET('/api/catalog/products/search', {
    params: { query: { sku } },
  });
  return data!;
}

export async function getCatalogIdentity(
  cscartProductId: number,
): Promise<CatalogIdentityProjection | null> {
  try {
    const { data } = await catalogIdentityApi.GET('/api/catalog/identities/{cscartProductId}', {
      params: { path: { cscartProductId } },
    });
    return data ?? null;
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function getCatalogIdentitySummary(): Promise<CatalogIdentityProjectionSummary> {
  const { data } = await catalogIdentitySummaryApi.GET('/api/catalog/identities/summary');
  return data!;
}

export async function getCatalogCategories(): Promise<CatalogCategory[]> {
  const { data } = await api.GET('/api/catalog/categories');
  return data!.categories;
}

export async function getCatalogVendors(): Promise<CatalogVendor[]> {
  const { data } = await api.GET('/api/catalog/vendors');
  return data!.vendors;
}

export async function getProductSummary(): Promise<ProductSummary> {
  const { data } = await api.GET('/api/catalog/products/summary');
  return data!;
}

export async function getServerProducts(filter: InventoryFilter): Promise<ProductPage> {
  const { data } = await api.GET('/api/catalog/products', {
    params: {
      query: {
        page: filter.page,
        pageSize: filter.pageSize,
        search: filter.search || undefined,
        category: (filter.category || undefined) as number | undefined,
        vendor: (filter.vendor || undefined) as number | undefined,
        storefrontStatus:
          (filter.storefrontStatus as
            | 'REACHABLE'
            | 'UNREACHABLE'
            | 'HIDDEN'
            | 'DISABLED'
            | undefined) || undefined,
        issue: filter.issue || undefined,
        sortBy: filter.sortBy,
        sortDir: filter.sortDir,
      },
    },
  });
  return data!;
}
