import { describe, it, expect } from 'vitest';
import {
  ISSUE_REGISTRY,
  buildIssueContext,
  computeProductIssues,
  computeCatalogHealth,
  getIssueValue,
  type IssueDetectionContext,
} from '@/utils/catalog';
import type { CatalogProduct } from '@/types';

// Allow null overrides to test real-world API responses where backend sends null
function makeProduct(
  overrides: Partial<{ [K in keyof CatalogProduct]: CatalogProduct[K] | null }>,
): CatalogProduct {
  return {
    cscartProductId: 1,
    name: 'Test Product',
    sku: 'TEST-001',
    currentPrice: 100,
    listPrice: 120,
    costPrice: 80,
    status: 'ACTIVE',
    categoryIds: [10],
    stockLevel: 50,
    mainImageUrl: 'https://example.com/img.jpg',
    mainImageWidth: 800,
    mainImageHeight: 600,
    vendorId: 1,
    weight: 5.0,
    trackingMode: 'B',
    minQty: 1,
    maxQty: 100,
    qtyStep: 1,
    basePrice: 100,
    freeShipping: false,
    botswanaMade: false,
    discount: false,
    sameDayDelivery: false,
    seoName: 'test-product',
    seoPath: '10',
    createdAt: '2026-01-01T00:00:00Z',
    // dynamic: a fixed date ages past STALE_THRESHOLD_DAYS and time-bombs the suite
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    storefrontStatus: 'REACHABLE',
    availabilityIssues: [],
    vendorName: 'Test Vendor',
    vendorStatus: 'A',
    mainCategoryName: 'Test Category',
    mainCategoryStatus: 'A',
    ...overrides,
  } as CatalogProduct;
}

const EMPTY_CONTEXT: IssueDetectionContext = {
  duplicateSkus: new Set(),
  categoryMedianPrices: new Map(),
};

// --- Task 1: Registry & Context ---

describe('ISSUE_REGISTRY', () => {
  it('has 14 issue types', () => {
    expect(Object.keys(ISSUE_REGISTRY)).toHaveLength(14);
  });

  it('has 4 critical issues', () => {
    const critical = Object.entries(ISSUE_REGISTRY).filter(([, c]) => c.severity === 'critical');
    expect(critical.map(([k]) => k).sort()).toEqual([
      'BELOW_COST',
      'DUPLICATE_SKU',
      'NO_CATEGORY',
      'OOS_ACTIVE',
    ]);
  });

  it('every issue has label, shortLabel, severity, and group', () => {
    for (const [key, config] of Object.entries(ISSUE_REGISTRY)) {
      expect(config.label, `${key}.label`).toBeTruthy();
      expect(config.shortLabel, `${key}.shortLabel`).toBeTruthy();
      expect(['critical', 'warning', 'info'], `${key}.severity`).toContain(config.severity);
      expect(['data-quality', 'pricing', 'freshness'], `${key}.group`).toContain(config.group);
    }
  });
});

describe('buildIssueContext', () => {
  it('detects duplicate SKUs', () => {
    const products = [
      makeProduct({ cscartProductId: 1, sku: 'DUPE-001' }),
      makeProduct({ cscartProductId: 2, sku: 'DUPE-001' }),
      makeProduct({ cscartProductId: 3, sku: 'UNIQUE-001' }),
    ];
    const ctx = buildIssueContext(products);
    expect(ctx.duplicateSkus.has('DUPE-001')).toBe(true);
    expect(ctx.duplicateSkus.has('UNIQUE-001')).toBe(false);
  });

  it('ignores null/empty SKUs for duplicate detection', () => {
    const products = [
      makeProduct({ cscartProductId: 1, sku: null }),
      makeProduct({ cscartProductId: 2, sku: null }),
      makeProduct({ cscartProductId: 3, sku: '' }),
    ];
    const ctx = buildIssueContext(products);
    expect(ctx.duplicateSkus.size).toBe(0);
  });

  it('computes category median prices for odd count', () => {
    const products = [
      makeProduct({ cscartProductId: 1, categoryIds: [10], currentPrice: 100 }),
      makeProduct({ cscartProductId: 2, categoryIds: [10], currentPrice: 200 }),
      makeProduct({ cscartProductId: 3, categoryIds: [10], currentPrice: 300 }),
    ];
    const ctx = buildIssueContext(products);
    expect(ctx.categoryMedianPrices.get(10)).toBe(200);
  });

  it('computes median for even number of products', () => {
    const products = [
      makeProduct({ cscartProductId: 1, categoryIds: [10], currentPrice: 100 }),
      makeProduct({ cscartProductId: 2, categoryIds: [10], currentPrice: 200 }),
      makeProduct({ cscartProductId: 3, categoryIds: [10], currentPrice: 300 }),
      makeProduct({ cscartProductId: 4, categoryIds: [10], currentPrice: 400 }),
    ];
    const ctx = buildIssueContext(products);
    expect(ctx.categoryMedianPrices.get(10)).toBe(250);
  });

  it('skips categories with fewer than 3 products', () => {
    const products = [
      makeProduct({ cscartProductId: 1, categoryIds: [10], currentPrice: 100 }),
      makeProduct({ cscartProductId: 2, categoryIds: [10], currentPrice: 200 }),
    ];
    const ctx = buildIssueContext(products);
    expect(ctx.categoryMedianPrices.has(10)).toBe(false);
  });

  it('uses first categoryId as primary category', () => {
    const products = [
      makeProduct({ cscartProductId: 1, categoryIds: [10, 20], currentPrice: 100 }),
      makeProduct({ cscartProductId: 2, categoryIds: [10], currentPrice: 200 }),
      makeProduct({ cscartProductId: 3, categoryIds: [10, 30], currentPrice: 300 }),
    ];
    const ctx = buildIssueContext(products);
    expect(ctx.categoryMedianPrices.has(10)).toBe(true);
    expect(ctx.categoryMedianPrices.has(20)).toBe(false);
  });

  it('returns empty context for empty product list', () => {
    const ctx = buildIssueContext([]);
    expect(ctx.duplicateSkus.size).toBe(0);
    expect(ctx.categoryMedianPrices.size).toBe(0);
  });
});

// --- Task 2: Per-product issue detection ---

describe('computeProductIssues', () => {
  it('returns empty array for a clean product', () => {
    const product = makeProduct({});
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toEqual([]);
  });

  // Data Quality
  it('detects NO_CATEGORY', () => {
    const product = makeProduct({ categoryIds: [] });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('NO_CATEGORY');
  });

  it('detects DUPLICATE_SKU', () => {
    const product = makeProduct({ sku: 'DUPE-001' });
    const ctx: IssueDetectionContext = {
      duplicateSkus: new Set(['DUPE-001']),
      categoryMedianPrices: new Map(),
    };
    expect(computeProductIssues(product, ctx)).toContain('DUPLICATE_SKU');
  });

  it('does not flag DUPLICATE_SKU for unique SKU', () => {
    const product = makeProduct({ sku: 'UNIQUE-001' });
    const ctx: IssueDetectionContext = {
      duplicateSkus: new Set(['DUPE-001']),
      categoryMedianPrices: new Map(),
    };
    expect(computeProductIssues(product, ctx)).not.toContain('DUPLICATE_SKU');
  });

  it('detects NO_IMAGE', () => {
    const product = makeProduct({ mainImageUrl: null });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('NO_IMAGE');
  });

  it('detects NO_COST', () => {
    const product = makeProduct({ costPrice: null });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('NO_COST');
  });

  it('detects NO_SKU', () => {
    const product = makeProduct({ sku: null });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('NO_SKU');
  });

  it('detects NO_SKU for empty string', () => {
    const product = makeProduct({ sku: '' });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('NO_SKU');
  });

  it('detects ZERO_WEIGHT for null weight', () => {
    const product = makeProduct({ weight: null });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('ZERO_WEIGHT');
  });

  it('detects ZERO_WEIGHT for zero weight', () => {
    const product = makeProduct({ weight: 0 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('ZERO_WEIGHT');
  });

  // Pricing
  it('detects BELOW_COST', () => {
    const product = makeProduct({ currentPrice: 80, costPrice: 100 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('BELOW_COST');
  });

  it('does not flag BELOW_COST when cost is null', () => {
    const product = makeProduct({ currentPrice: 80, costPrice: null });
    const issues = computeProductIssues(product, EMPTY_CONTEXT);
    expect(issues).not.toContain('BELOW_COST');
    expect(issues).toContain('NO_COST');
  });

  it('detects PRICE_EQUALS_COST', () => {
    const product = makeProduct({ currentPrice: 100, costPrice: 100 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('PRICE_EQUALS_COST');
  });

  it('does not flag both BELOW_COST and PRICE_EQUALS_COST', () => {
    const product = makeProduct({ currentPrice: 80, costPrice: 100 });
    const issues = computeProductIssues(product, EMPTY_CONTEXT);
    expect(issues).toContain('BELOW_COST');
    expect(issues).not.toContain('PRICE_EQUALS_COST');
  });

  it('detects LIST_BELOW_CURRENT', () => {
    const product = makeProduct({ currentPrice: 150, listPrice: 100 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('LIST_BELOW_CURRENT');
  });

  it('does not flag LIST_BELOW_CURRENT when list equals current', () => {
    const product = makeProduct({ currentPrice: 100, listPrice: 100 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).not.toContain('LIST_BELOW_CURRENT');
  });

  it('detects PRICE_OUTLIER_LOW', () => {
    const product = makeProduct({ cscartProductId: 1, categoryIds: [10], currentPrice: 50 });
    const ctx: IssueDetectionContext = {
      duplicateSkus: new Set(),
      categoryMedianPrices: new Map([[10, 200]]),
    };
    expect(computeProductIssues(product, ctx)).toContain('PRICE_OUTLIER_LOW');
  });

  it('detects PRICE_OUTLIER_HIGH', () => {
    const product = makeProduct({ cscartProductId: 1, categoryIds: [10], currentPrice: 500 });
    const ctx: IssueDetectionContext = {
      duplicateSkus: new Set(),
      categoryMedianPrices: new Map([[10, 100]]),
    };
    expect(computeProductIssues(product, ctx)).toContain('PRICE_OUTLIER_HIGH');
  });

  it('does not flag outlier when no median for category', () => {
    const product = makeProduct({ cscartProductId: 1, categoryIds: [99], currentPrice: 1 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).not.toContain('PRICE_OUTLIER_LOW');
    expect(computeProductIssues(product, EMPTY_CONTEXT)).not.toContain('PRICE_OUTLIER_HIGH');
  });

  it('detects NO_LIST_PRICE', () => {
    const product = makeProduct({ listPrice: null });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('NO_LIST_PRICE');
  });

  // Freshness / Stock
  it('detects OOS_ACTIVE', () => {
    const product = makeProduct({ status: 'ACTIVE', stockLevel: 0 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('OOS_ACTIVE');
  });

  it('does not flag OOS_ACTIVE for HIDDEN status', () => {
    const product = makeProduct({ status: 'HIDDEN', stockLevel: 0 });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).not.toContain('OOS_ACTIVE');
  });

  it('detects STALE', () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const product = makeProduct({ updatedAt: old });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).toContain('STALE');
  });

  it('does not flag STALE for recent product', () => {
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const product = makeProduct({ updatedAt: recent });
    expect(computeProductIssues(product, EMPTY_CONTEXT)).not.toContain('STALE');
  });

  it('detects multiple issues on one product', () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const product = makeProduct({
      sku: null,
      mainImageUrl: null,
      costPrice: null,
      weight: null,
      listPrice: null,
      status: 'ACTIVE',
      stockLevel: 0,
      updatedAt: old,
    });
    const issues = computeProductIssues(product, EMPTY_CONTEXT);
    expect(issues).toContain('NO_SKU');
    expect(issues).toContain('NO_IMAGE');
    expect(issues).toContain('NO_COST');
    expect(issues).toContain('ZERO_WEIGHT');
    expect(issues).toContain('NO_LIST_PRICE');
    expect(issues).toContain('OOS_ACTIVE');
    expect(issues).toContain('STALE');
  });
});

// --- Task 3: Catalog Health ---

describe('computeCatalogHealth', () => {
  it('returns zeroed health for empty product list', () => {
    const health = computeCatalogHealth([], EMPTY_CONTEXT);
    expect(health.totalProducts).toBe(0);
    expect(health.issueCounts.NO_SKU).toBe(0);
    expect(health.groupCounts['data-quality'].critical).toBe(0);
  });

  it('computes issueCounts from product list', () => {
    const products = [
      makeProduct({ cscartProductId: 1, sku: null, mainImageUrl: null }),
      makeProduct({ cscartProductId: 2, sku: null }),
      makeProduct({ cscartProductId: 3 }),
    ];
    const health = computeCatalogHealth(products, EMPTY_CONTEXT);
    expect(health.issueCounts.NO_SKU).toBe(2);
    expect(health.issueCounts.NO_IMAGE).toBe(1);
  });

  it('computes groupCounts correctly', () => {
    const products = [
      makeProduct({ cscartProductId: 1, categoryIds: [] }),
      makeProduct({ cscartProductId: 2, sku: null }),
      makeProduct({ cscartProductId: 3, currentPrice: 80, costPrice: 100 }),
    ];
    const health = computeCatalogHealth(products, EMPTY_CONTEXT);
    expect(health.groupCounts['data-quality'].critical).toBe(1); // NO_CATEGORY
    expect(health.groupCounts['data-quality'].info).toBe(1); // NO_SKU
    expect(health.groupCounts['pricing'].critical).toBe(1); // BELOW_COST
  });

  it('preserves oosActiveCount and lowStockCount', () => {
    const products = [
      makeProduct({ cscartProductId: 1, status: 'ACTIVE', stockLevel: 0 }),
      makeProduct({ cscartProductId: 2, status: 'ACTIVE', stockLevel: 3, minQty: 5 }),
      makeProduct({ cscartProductId: 3, status: 'ACTIVE', stockLevel: 50 }),
    ];
    const health = computeCatalogHealth(products, EMPTY_CONTEXT);
    expect(health.oosActiveCount).toBe(1);
    expect(health.lowStockCount).toBe(1);
  });

  it('computes avgMarginPct', () => {
    const products = [
      makeProduct({ cscartProductId: 1, currentPrice: 200, costPrice: 100 }), // 50%
      makeProduct({ cscartProductId: 2, currentPrice: 100, costPrice: 50 }), // 50%
    ];
    const health = computeCatalogHealth(products, EMPTY_CONTEXT);
    expect(health.avgMarginPct).toBe(50);
  });
});

// --- Task: Impact field and getIssueValue ---

describe('ISSUE_REGISTRY impact field', () => {
  it('every issue has an impact string', () => {
    for (const [key, config] of Object.entries(ISSUE_REGISTRY)) {
      expect(config.impact, `${key}.impact`).toBeTruthy();
      expect(typeof config.impact, `${key}.impact type`).toBe('string');
    }
  });
});

describe('getIssueValue', () => {
  it('returns cost comparison for BELOW_COST', () => {
    const product = makeProduct({ currentPrice: 80, costPrice: 100 });
    const value = getIssueValue('BELOW_COST', product);
    expect(value).toContain('P80');
    expect(value).toContain('P100');
  });

  it('returns stock info with OOS action for OOS_ACTIVE', () => {
    const product = makeProduct({ stockLevel: 0, status: 'ACTIVE', outOfStockActions: 'S' });
    const value = getIssueValue('OOS_ACTIVE', product);
    expect(value).toContain('0');
    expect(value).toContain('Sign up for notification');
  });

  it('returns null-related info for NO_COST', () => {
    const product = makeProduct({ costPrice: null });
    const value = getIssueValue('NO_COST', product);
    expect(value).toContain('null');
  });

  it('returns weight for ZERO_WEIGHT', () => {
    const product = makeProduct({ weight: 0 });
    const value = getIssueValue('ZERO_WEIGHT', product);
    expect(value).toContain('0');
  });

  it('returns updatedAt info for STALE', () => {
    const product = makeProduct({});
    const value = getIssueValue('STALE', product);
    expect(value).toBeTruthy();
  });
});
