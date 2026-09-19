import { describe, it, expect } from 'vitest';
import { buildStorefrontUrl, STOREFRONT_BASE } from '@/utils/storefront-url';
import type { CatalogProduct, CatalogCategory } from '@/types';

// Mirrors real CS-Cart category hierarchy
const CATEGORIES: CatalogCategory[] = [
  {
    id: 272,
    name: 'Food',
    parentId: undefined,
    level: 0,
    productCount: 281,
    seoName: 'food',
    status: 'A',
  },
  {
    id: 534,
    name: 'Condiments',
    parentId: 272,
    level: 1,
    productCount: 50,
    seoName: 'condiments',
    status: 'A',
  },
  { id: 574, name: 'Dry', parentId: 272, level: 1, productCount: 30, seoName: 'dry', status: 'A' },
  {
    id: 1,
    name: 'Beverages',
    parentId: undefined,
    level: 0,
    productCount: 500,
    seoName: 'beverages',
    status: 'A',
  },
  {
    id: 2,
    name: 'Clear Beer',
    parentId: 1,
    level: 1,
    productCount: 45,
    seoName: 'clear-beer',
    status: 'A',
  },
  {
    id: 3,
    name: 'Spirits',
    parentId: 1,
    level: 1,
    productCount: 80,
    seoName: 'spirits',
    status: 'A',
  },
  {
    id: 10,
    name: 'Hardware',
    parentId: undefined,
    level: 0,
    productCount: 100,
    seoName: 'hardware',
    status: 'A',
  },
  { id: 11, name: 'DIY', parentId: 10, level: 1, productCount: 40, seoName: 'diy', status: 'A' },
] as CatalogCategory[];

function makeProduct(overrides: Partial<CatalogProduct>): CatalogProduct {
  return {
    cscartProductId: 1,
    name: 'Test Product',
    sku: null,
    currentPrice: 100,
    listPrice: null,
    costPrice: null,
    status: 'ACTIVE',
    categoryIds: [],
    stockLevel: 10,
    mainImageUrl: null,
    mainImageWidth: null,
    mainImageHeight: null,
    vendorId: null,
    weight: null,
    trackingMode: null,
    minQty: null,
    maxQty: null,
    qtyStep: null,
    basePrice: null,
    freeShipping: false,
    botswanaMade: false,
    discount: false,
    sameDayDelivery: false,
    seoName: undefined,
    seoPath: undefined,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  } as CatalogProduct;
}

describe('buildStorefrontUrl', () => {
  it('returns null when seoName is missing', () => {
    const product = makeProduct({ seoName: undefined });
    expect(buildStorefrontUrl(product, CATEGORIES)).toBeNull();
  });

  it('uses seoPath (main category) not categoryIds[0]', () => {
    // This is the exact bug scenario: Acesulfame-K has categoryIds [534, 574, 272]
    // but seoPath is "272" (Food), not "534" (Condiments)
    const product = makeProduct({
      seoName: 'acesulfame-k-jinda-25kg',
      seoPath: '272',
      categoryIds: [534, 574, 272],
    });
    expect(buildStorefrontUrl(product, CATEGORIES)).toBe(
      `${STOREFRONT_BASE}/food/acesulfame-k-jinda-25kg/`,
    );
  });

  it('builds nested category path from single-segment seoPath', () => {
    const product = makeProduct({
      seoName: 'castle-lager-340ml-x-24',
      seoPath: '2',
      categoryIds: [2, 1],
    });
    expect(buildStorefrontUrl(product, CATEGORIES)).toBe(
      `${STOREFRONT_BASE}/beverages/clear-beer/castle-lager-340ml-x-24/`,
    );
  });

  it('handles multi-segment seoPath (root/leaf)', () => {
    // African Mask: seo_path "275/335" — real CS-Cart format
    // 275=Home Decor (root), 335=African Art (child of 275)
    const categories = [
      ...CATEGORIES,
      {
        id: 275,
        name: 'Home Decor',
        parentId: undefined,
        level: 0,
        productCount: 50,
        seoName: 'home-decor',
        status: 'A',
      },
      {
        id: 335,
        name: 'African Art',
        parentId: 275,
        level: 1,
        productCount: 10,
        seoName: 'african-art',
        status: 'A',
      },
    ] as CatalogCategory[];
    const product = makeProduct({
      seoName: 'african-mask-an91',
      seoPath: '275/335',
      categoryIds: [335],
    });
    expect(buildStorefrontUrl(product, categories)).toBe(
      `${STOREFRONT_BASE}/home-decor/african-art/african-mask-an91/`,
    );
  });

  it('handles 3-segment seoPath', () => {
    // seo_path "513/313/510" — 3 levels deep
    const categories = [
      ...CATEGORIES,
      {
        id: 513,
        name: 'Fashion',
        parentId: undefined,
        level: 0,
        productCount: 100,
        seoName: 'fashion',
        status: 'A',
      },
      {
        id: 313,
        name: 'Shoes',
        parentId: 513,
        level: 1,
        productCount: 50,
        seoName: 'shoes',
        status: 'A',
      },
      {
        id: 510,
        name: 'Sneakers',
        parentId: 313,
        level: 2,
        productCount: 20,
        seoName: 'sneakers',
        status: 'A',
      },
    ] as CatalogCategory[];
    const product = makeProduct({
      seoName: 'adidas-sneakers',
      seoPath: '513/313/510',
      categoryIds: [510],
    });
    expect(buildStorefrontUrl(product, categories)).toBe(
      `${STOREFRONT_BASE}/fashion/shoes/sneakers/adidas-sneakers/`,
    );
  });

  it('builds deeply nested path (3 levels) with multi-segment seoPath', () => {
    const deepCategories = [
      ...CATEGORIES,
      {
        id: 50,
        name: 'Craft',
        parentId: 2,
        level: 2,
        productCount: 10,
        seoName: 'craft',
        status: 'A',
      },
    ] as CatalogCategory[];
    const product = makeProduct({
      seoName: 'craft-ipa',
      seoPath: '1/2/50',
      categoryIds: [50],
    });
    expect(buildStorefrontUrl(product, deepCategories)).toBe(
      `${STOREFRONT_BASE}/beverages/clear-beer/craft/craft-ipa/`,
    );
  });

  it('handles root-level category (no parent)', () => {
    const product = makeProduct({
      seoName: 'boro-brandy',
      seoPath: '1',
      categoryIds: [3, 1],
    });
    expect(buildStorefrontUrl(product, CATEGORIES)).toBe(
      `${STOREFRONT_BASE}/beverages/boro-brandy/`,
    );
  });

  it('falls back to bare seoName when seoPath is missing', () => {
    const product = makeProduct({
      seoName: 'some-product',
      seoPath: undefined,
      categoryIds: [534],
    });
    expect(buildStorefrontUrl(product, CATEGORIES)).toBe(`${STOREFRONT_BASE}/some-product/`);
  });

  it('falls back to bare seoName when seoPath category not found', () => {
    const product = makeProduct({
      seoName: 'orphan-product',
      seoPath: '9999',
      categoryIds: [9999],
    });
    expect(buildStorefrontUrl(product, CATEGORIES)).toBe(`${STOREFRONT_BASE}/orphan-product/`);
  });

  it('handles seoPath pointing to category without seoName', () => {
    const catsMissingSeo = [
      ...CATEGORIES,
      {
        id: 99,
        name: 'Unnamed',
        parentId: undefined,
        level: 0,
        productCount: 5,
        seoName: undefined,
        status: 'A',
      },
    ] as CatalogCategory[];
    const product = makeProduct({
      seoName: 'test-product',
      seoPath: '99',
      categoryIds: [99],
    });
    expect(buildStorefrontUrl(product, catsMissingSeo)).toBe(`${STOREFRONT_BASE}/test-product/`);
  });

  it('categoryIds[0] differs from seoPath — seoPath wins', () => {
    // Product in Condiments (534) and Dry (574), but main category is Hardware > DIY (11)
    const product = makeProduct({
      seoName: 'weird-product',
      seoPath: '11',
      categoryIds: [534, 574, 11],
    });
    expect(buildStorefrontUrl(product, CATEGORIES)).toBe(
      `${STOREFRONT_BASE}/hardware/diy/weird-product/`,
    );
  });
});
