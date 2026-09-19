import { describe, it, expect } from 'vitest';
import type { CatalogProduct } from '@/types';

describe('CatalogProduct storefront fields', () => {
  it('has storefrontStatus on the type', () => {
    const product: Partial<CatalogProduct> = {
      storefrontStatus: 'REACHABLE',
      availabilityIssues: [],
      vendorName: 'Test Vendor',
      vendorStatus: 'A',
      mainCategoryName: 'Beer',
      mainCategoryStatus: 'A',
    };
    expect(product.storefrontStatus).toBe('REACHABLE');
    expect(product.availabilityIssues).toEqual([]);
  });

  it('accepts UNREACHABLE with availability issues', () => {
    const product: Partial<CatalogProduct> = {
      storefrontStatus: 'UNREACHABLE',
      availabilityIssues: ['VENDOR_INACTIVE', 'ZERO_PRICE'],
    };
    expect(product.storefrontStatus).toBe('UNREACHABLE');
    expect(product.availabilityIssues).toHaveLength(2);
  });
});
