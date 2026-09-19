import type { CatalogProduct, CatalogCategory } from '@/types';

export const STOREFRONT_BASE = 'https://dev.yourmart.co.bw';

export function buildStorefrontUrl(
  product: CatalogProduct,
  categories: CatalogCategory[],
): string | null {
  if (!product.seoName) return null;

  // CS-Cart's seoPath is a slash-separated list of category IDs from root to main category
  // (e.g. "275/335" or just "272"). The last segment is the main category.
  const seoPathSegments = product.seoPath?.split('/') ?? [];
  const lastSegment = seoPathSegments[seoPathSegments.length - 1];
  const mainCategoryId = lastSegment ? parseInt(lastSegment, 10) : undefined;
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const pathSegments: string[] = [];

  if (mainCategoryId !== undefined && !isNaN(mainCategoryId)) {
    const cat = categoryMap.get(mainCategoryId);
    if (cat?.seoName) {
      const chain: string[] = [];
      let current: CatalogCategory | undefined = cat;
      while (current) {
        if (current.seoName) chain.unshift(current.seoName);
        current = current.parentId != null ? categoryMap.get(current.parentId) : undefined;
      }
      pathSegments.push(...chain);
    }
  }

  if (pathSegments.length > 0) {
    return `${STOREFRONT_BASE}/${pathSegments.join('/')}/${product.seoName}/`;
  }
  return `${STOREFRONT_BASE}/${product.seoName}/`;
}
