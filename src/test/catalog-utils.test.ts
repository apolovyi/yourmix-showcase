import { describe, it, expect } from 'vitest';
import {
  computeMarginPercent,
  computeCatalogHealth,
  buildIssueContext,
  formatRelativeTime,
  isStale,
  STOREFRONT_STATUS_CONFIG,
  AVAILABILITY_ISSUE_CONFIG,
  type StorefrontStatus,
  type AvailabilityIssue,
} from '@/utils/catalog';
import type { CatalogProduct } from '@/types';

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    cscartProductId: 1,
    name: 'Test Product',
    sku: 'TP-001',
    currentPrice: 100,
    listPrice: 120,
    costPrice: 80,
    status: 'ACTIVE',
    categoryIds: [1],
    stockLevel: 50,
    mainImageUrl: 'https://example.com/img.jpg',
    mainImageWidth: 800,
    mainImageHeight: 600,
    vendorId: 101,
    weight: 1.5,
    trackingMode: 'B',
    minQty: 1,
    maxQty: 100,
    qtyStep: 1,
    basePrice: 100,
    freeShipping: false,
    botswanaMade: true,
    discount: false,
    sameDayDelivery: false,
    seoName: 'test-product',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    storefrontStatus: 'REACHABLE',
    availabilityIssues: [],
    vendorName: 'Test Vendor',
    vendorStatus: 'A',
    mainCategoryName: 'Test Category',
    mainCategoryStatus: 'A',
    ...overrides,
  } as CatalogProduct;
}

const EMPTY_CTX = {
  duplicateSkus: new Set<string>(),
  categoryMedianPrices: new Map<number, number>(),
};

describe('computeMarginPercent', () => {
  it('returns correct margin for normal values', () => {
    expect(computeMarginPercent(100, 80)).toBeCloseTo(20.0);
  });

  it('returns negative margin when cost exceeds price', () => {
    expect(computeMarginPercent(80, 100)).toBeCloseTo(-25.0);
  });

  it('returns null when price is zero', () => {
    expect(computeMarginPercent(0, 80)).toBeNull();
  });

  it('returns null when cost is undefined', () => {
    expect(computeMarginPercent(100, undefined)).toBeNull();
  });

  it('returns null when cost is null', () => {
    expect(computeMarginPercent(100, null as unknown as undefined)).toBeNull();
  });

  it('returns 100% margin when cost is zero', () => {
    expect(computeMarginPercent(100, 0)).toBeCloseTo(100.0);
  });
});

describe('computeCatalogHealth', () => {
  it('returns zero values for empty product list', () => {
    const health = computeCatalogHealth([], EMPTY_CTX);
    expect(health.totalProducts).toBe(0);
    expect(health.activeProducts).toBe(0);
    expect(health.avgMarginPct).toBeNull();
    expect(health.oosActiveCount).toBe(0);
    expect(health.lowStockCount).toBe(0);
    expect(health.issueCounts.NO_SKU).toBe(0);
    expect(health.hiddenCount).toBe(0);
    expect(health.disabledCount).toBe(0);
  });

  it('computes correct counts for mixed products', () => {
    const products = [
      makeProduct({ cscartProductId: 1, status: 'ACTIVE', currentPrice: 100, costPrice: 80 }),
      makeProduct({ cscartProductId: 2, status: 'HIDDEN' }),
      makeProduct({ cscartProductId: 3, status: 'ACTIVE', currentPrice: 50, costPrice: 60 }), // below cost
      makeProduct({
        cscartProductId: 4,
        status: 'ACTIVE',
        sku: undefined,
        mainImageUrl: undefined,
      }),
      makeProduct({ cscartProductId: 5, status: 'DISABLED' }),
    ];
    const ctx = buildIssueContext(products);
    const health = computeCatalogHealth(products, ctx);
    expect(health.totalProducts).toBe(5);
    expect(health.activeProducts).toBe(3);
    expect(health.hiddenCount).toBe(1);
    expect(health.disabledCount).toBe(1);
    expect(health.issueCounts.BELOW_COST).toBe(1);
  });

  it('computes average margin only from products with cost', () => {
    const products = [
      makeProduct({ cscartProductId: 1, currentPrice: 100, costPrice: 80 }), // 20%
      makeProduct({ cscartProductId: 2, currentPrice: 200, costPrice: 100 }), // 50%
      makeProduct({ cscartProductId: 3, currentPrice: 100, costPrice: undefined }), // excluded
    ];
    const health = computeCatalogHealth(products, EMPTY_CTX);
    // avg of 20% and 50% = 35%
    expect(health.avgMarginPct).toBeCloseTo(35.0);
    expect(health.issueCounts.NO_COST).toBe(1);
  });

  it('counts unreachable products', () => {
    const products = [
      makeProduct({ cscartProductId: 1, storefrontStatus: 'REACHABLE' }),
      makeProduct({ cscartProductId: 2, storefrontStatus: 'UNREACHABLE' }),
      makeProduct({ cscartProductId: 3, storefrontStatus: 'UNREACHABLE' }),
      makeProduct({ cscartProductId: 4, storefrontStatus: 'HIDDEN' }),
    ];
    const health = computeCatalogHealth(products, EMPTY_CTX);
    expect(health.unreachableCount).toBe(2);
  });

  it('returns zero unreachable for empty list', () => {
    const health = computeCatalogHealth([], EMPTY_CTX);
    expect(health.unreachableCount).toBe(0);
  });

  it('counts OOS+Active and low stock correctly', () => {
    const products = [
      makeProduct({ cscartProductId: 1, stockLevel: 0, status: 'ACTIVE', minQty: 5 }),
      makeProduct({ cscartProductId: 2, stockLevel: 3, status: 'ACTIVE', minQty: 5 }), // low stock
      makeProduct({ cscartProductId: 3, stockLevel: 50, status: 'ACTIVE', minQty: 5 }),
    ];
    const health = computeCatalogHealth(products, EMPTY_CTX);
    expect(health.oosActiveCount).toBe(1);
    expect(health.lowStockCount).toBe(1);
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent times', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns minutes for times less than an hour ago', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(thirtyMinAgo)).toBe('30m ago');
  });

  it('returns hours for times less than a day ago', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveHoursAgo)).toBe('5h ago');
  });

  it('returns days for times less than 30 days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns months for times 30+ days ago', () => {
    const twoMonthsAgo = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoMonthsAgo)).toBe('2mo ago');
  });

  it('returns years for times 365+ days ago', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoYearsAgo)).toBe('2y ago');
  });
});

describe('isStale', () => {
  it('returns true when date is older than threshold', () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(oldDate, 90)).toBe(true);
  });

  it('returns false when date is within threshold', () => {
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(recentDate, 90)).toBe(false);
  });

  it('returns false for undefined date', () => {
    expect(isStale(undefined, 90)).toBe(false);
  });
});

describe('STOREFRONT_STATUS_CONFIG', () => {
  it('has config for all 4 statuses', () => {
    const statuses: StorefrontStatus[] = ['REACHABLE', 'UNREACHABLE', 'HIDDEN', 'DISABLED'];
    for (const status of statuses) {
      expect(STOREFRONT_STATUS_CONFIG[status]).toBeDefined();
      expect(STOREFRONT_STATUS_CONFIG[status].label).toBeTruthy();
      expect(STOREFRONT_STATUS_CONFIG[status].color).toBeTruthy();
      expect(STOREFRONT_STATUS_CONFIG[status].dot).toBeTruthy();
    }
  });

  it('REACHABLE uses emerald/green', () => {
    expect(STOREFRONT_STATUS_CONFIG.REACHABLE.dot).toContain('emerald');
  });

  it('UNREACHABLE uses red', () => {
    expect(STOREFRONT_STATUS_CONFIG.UNREACHABLE.dot).toContain('red');
  });

  it('DISABLED uses slate/gray', () => {
    expect(STOREFRONT_STATUS_CONFIG.DISABLED.dot).toContain('slate');
  });
});

describe('AVAILABILITY_ISSUE_CONFIG', () => {
  it('has config for all 6 issue types', () => {
    const issues: AvailabilityIssue[] = [
      'VENDOR_INACTIVE',
      'CATEGORY_DISABLED',
      'ORPHAN_VARIATION',
      'ZERO_PRICE',
      'VIEW_ONLY',
      'OOS_BLOCKED',
    ];
    for (const issue of issues) {
      expect(AVAILABILITY_ISSUE_CONFIG[issue]).toBeDefined();
      expect(AVAILABILITY_ISSUE_CONFIG[issue].label).toBeTruthy();
      expect(AVAILABILITY_ISSUE_CONFIG[issue].severity).toBeTruthy();
    }
  });

  it('VENDOR_INACTIVE and CATEGORY_DISABLED are critical', () => {
    expect(AVAILABILITY_ISSUE_CONFIG.VENDOR_INACTIVE.severity).toBe('critical');
    expect(AVAILABILITY_ISSUE_CONFIG.CATEGORY_DISABLED.severity).toBe('critical');
  });

  it('VIEW_ONLY and OOS_BLOCKED are high', () => {
    expect(AVAILABILITY_ISSUE_CONFIG.VIEW_ONLY.severity).toBe('high');
    expect(AVAILABILITY_ISSUE_CONFIG.OOS_BLOCKED.severity).toBe('high');
  });
});
