import type { CatalogProduct } from '@/types';

// --- Issue Type System ---

export type QualityIssue =
  // Data Quality
  | 'NO_CATEGORY'
  | 'DUPLICATE_SKU'
  | 'NO_IMAGE'
  | 'NO_COST'
  | 'NO_SKU'
  | 'ZERO_WEIGHT'
  // Pricing
  | 'BELOW_COST'
  | 'PRICE_EQUALS_COST'
  | 'LIST_BELOW_CURRENT'
  | 'PRICE_OUTLIER_LOW'
  | 'PRICE_OUTLIER_HIGH'
  | 'NO_LIST_PRICE'
  // Freshness / Stock
  | 'OOS_ACTIVE'
  | 'STALE';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export type IssueGroup = 'data-quality' | 'pricing' | 'freshness';

export interface IssueConfig {
  label: string;
  shortLabel: string;
  severity: IssueSeverity;
  group: IssueGroup;
  impact: string;
}

export const ISSUE_REGISTRY: Record<QualityIssue, IssueConfig> = {
  NO_CATEGORY: {
    label: 'No Category',
    shortLabel: 'No Cat',
    severity: 'critical',
    group: 'data-quality',
    impact: 'Product invisible on storefront — not listed in any category page',
  },
  DUPLICATE_SKU: {
    label: 'Duplicate SKU',
    shortLabel: 'Dup SKU',
    severity: 'critical',
    group: 'data-quality',
    impact: 'SKU shared with another product — pricing automation will update the wrong one',
  },
  NO_IMAGE: {
    label: 'No Image',
    shortLabel: 'No Img',
    severity: 'warning',
    group: 'data-quality',
    impact: 'No product image — listing looks broken in search and category pages',
  },
  NO_COST: {
    label: 'No Cost',
    shortLabel: 'No Cost',
    severity: 'warning',
    group: 'data-quality',
    impact: 'Cost unknown — margin cannot be calculated, pricing proposals will skip',
  },
  NO_SKU: {
    label: 'No SKU',
    shortLabel: 'No SKU',
    severity: 'info',
    group: 'data-quality',
    impact: 'No SKU code — product cannot be matched in supplier price lists',
  },
  ZERO_WEIGHT: {
    label: 'No Weight',
    shortLabel: '0 wt',
    severity: 'info',
    group: 'data-quality',
    impact: 'Weight is zero or missing — shipping cost calculation unreliable',
  },
  BELOW_COST: {
    label: 'Below Cost',
    shortLabel: 'Loss',
    severity: 'critical',
    group: 'pricing',
    impact: 'Selling below cost — every sale loses money',
  },
  PRICE_EQUALS_COST: {
    label: 'Zero Margin',
    shortLabel: '0%',
    severity: 'warning',
    group: 'pricing',
    impact: 'Price equals cost — zero profit margin',
  },
  LIST_BELOW_CURRENT: {
    label: 'List < Price',
    shortLabel: 'List<$',
    severity: 'warning',
    group: 'pricing',
    impact: 'List price lower than selling price — shows a negative discount on storefront',
  },
  PRICE_OUTLIER_LOW: {
    label: 'Price Outlier (Low)',
    shortLabel: '$Low',
    severity: 'warning',
    group: 'pricing',
    impact: 'Price suspiciously low compared to similar products in this category',
  },
  PRICE_OUTLIER_HIGH: {
    label: 'Price Outlier (High)',
    shortLabel: '$High',
    severity: 'warning',
    group: 'pricing',
    impact: 'Price suspiciously high compared to similar products in this category',
  },
  NO_LIST_PRICE: {
    label: 'No List Price',
    shortLabel: 'No LP',
    severity: 'info',
    group: 'pricing',
    impact: 'No list price set — storefront cannot show a "was/now" comparison',
  },
  OOS_ACTIVE: {
    label: 'OOS + Active',
    shortLabel: 'OOS',
    severity: 'critical',
    group: 'freshness',
    impact: 'Out of stock but listing is active — customers see the product but cannot buy',
  },
  STALE: {
    label: 'Stale',
    shortLabel: 'Stale',
    severity: 'info',
    group: 'freshness',
    impact: 'Not updated in over 90 days — price or availability may be outdated',
  },
};

// --- Storefront Status (from backend) ---

export type StorefrontStatus = 'REACHABLE' | 'UNREACHABLE' | 'HIDDEN' | 'DISABLED';

export const STOREFRONT_STATUS_CONFIG: Record<
  StorefrontStatus,
  { label: string; color: string; dot: string }
> = {
  REACHABLE: { label: 'Live', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  UNREACHABLE: { label: 'Unreachable', color: 'text-red-400', dot: 'bg-red-400' },
  HIDDEN: { label: 'Hidden', color: 'text-amber-400', dot: 'bg-amber-400' },
  DISABLED: { label: 'Disabled', color: 'text-slate-400', dot: 'bg-slate-400' },
};

// --- Availability Issues (from backend) ---

export type AvailabilityIssue =
  | 'VENDOR_INACTIVE'
  | 'CATEGORY_DISABLED'
  | 'ORPHAN_VARIATION'
  | 'ZERO_PRICE'
  | 'VIEW_ONLY'
  | 'OOS_BLOCKED';

export type AvailabilitySeverity = 'critical' | 'high';

export interface AvailabilityIssueConfig {
  label: string;
  severity: AvailabilitySeverity;
  tooltip: (product: CatalogProduct) => string;
}

export const AVAILABILITY_ISSUE_CONFIG: Record<AvailabilityIssue, AvailabilityIssueConfig> = {
  VENDOR_INACTIVE: {
    label: 'Vendor inactive',
    severity: 'critical',
    tooltip: (p: CatalogProduct): string =>
      `Vendor ${p.vendorName ?? 'unknown'} is ${p.vendorStatus === 'D' ? 'disabled' : 'pending'}`,
  },
  CATEGORY_DISABLED: {
    label: 'Category disabled',
    severity: 'critical',
    tooltip: (p: CatalogProduct): string =>
      `Category ${p.mainCategoryName ?? 'unknown'} is disabled`,
  },
  ORPHAN_VARIATION: {
    label: 'Orphan variation',
    severity: 'critical',
    tooltip: (): string => 'Parent product is missing or inactive',
  },
  ZERO_PRICE: {
    label: 'Zero price',
    severity: 'critical',
    tooltip: (): string => 'Product has zero price — not purchasable',
  },
  VIEW_ONLY: {
    label: 'View only',
    severity: 'high',
    tooltip: (): string => 'Product is marked view-only in CS-Cart',
  },
  OOS_BLOCKED: {
    label: 'OOS blocked',
    severity: 'high',
    tooltip: (): string => 'Out of stock, add-to-cart blocked',
  },
};

const OOS_ACTION_LABELS: Record<string, string> = {
  N: 'Block add-to-cart',
  S: 'Sign up for notification',
  B: 'Allow backorder',
};

export function getIssueValue(issue: QualityIssue, product: CatalogProduct): string {
  switch (issue) {
    case 'NO_CATEGORY':
      return 'categoryIds: []';
    case 'DUPLICATE_SKU':
      return `sku: "${product.sku}"`;
    case 'NO_IMAGE':
      return 'mainImageUrl: null';
    case 'NO_COST':
      return 'costPrice: null';
    case 'NO_SKU':
      return `sku: ${product.sku === undefined || product.sku === null ? 'null' : `"${product.sku}"`}`;
    case 'ZERO_WEIGHT':
      return `weight: ${product.weight ?? 'null'}`;
    case 'BELOW_COST':
      return `price: P${product.currentPrice.toFixed(2)} < cost: P${product.costPrice!.toFixed(2)}`;
    case 'PRICE_EQUALS_COST':
      return `price = cost = P${product.currentPrice.toFixed(2)}`;
    case 'LIST_BELOW_CURRENT':
      return `list: P${product.listPrice!.toFixed(2)} < price: P${product.currentPrice.toFixed(2)}`;
    case 'PRICE_OUTLIER_LOW':
    case 'PRICE_OUTLIER_HIGH':
      return `price: P${product.currentPrice.toFixed(2)}`;
    case 'NO_LIST_PRICE':
      return 'listPrice: null';
    case 'OOS_ACTIVE': {
      const action = product.outOfStockActions
        ? (OOS_ACTION_LABELS[product.outOfStockActions] ?? product.outOfStockActions)
        : 'unknown';
      return `stock: ${product.stockLevel}, status: ${product.status}, OOS action: ${action}`;
    }
    case 'STALE':
      return `updatedAt: ${product.updatedAt ?? 'null'}`;
  }
}

const SEVERITY_ORDER: Record<IssueSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function compareIssueSeverity(a: QualityIssue, b: QualityIssue): number {
  return SEVERITY_ORDER[ISSUE_REGISTRY[a].severity] - SEVERITY_ORDER[ISSUE_REGISTRY[b].severity];
}

// --- Issue Detection Context ---

export interface IssueDetectionContext {
  duplicateSkus: Set<string>;
  categoryMedianPrices: Map<number, number>;
}

const MIN_CATEGORY_SIZE_FOR_OUTLIER = 3;

function computeMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function buildIssueContext(products: CatalogProduct[]): IssueDetectionContext {
  // Duplicate SKUs
  const skuCounts = new Map<string, number>();
  for (const p of products) {
    if (p.sku) {
      skuCounts.set(p.sku, (skuCounts.get(p.sku) ?? 0) + 1);
    }
  }
  const duplicateSkus = new Set<string>();
  for (const [sku, count] of skuCounts) {
    if (count >= 2) duplicateSkus.add(sku);
  }

  // Category median prices (primary category = first in categoryIds)
  const categoryPrices = new Map<number, number[]>();
  for (const p of products) {
    const primaryCat = p.categoryIds[0];
    if (primaryCat !== undefined) {
      const prices = categoryPrices.get(primaryCat) ?? [];
      prices.push(p.currentPrice);
      categoryPrices.set(primaryCat, prices);
    }
  }
  const categoryMedianPrices = new Map<number, number>();
  for (const [catId, prices] of categoryPrices) {
    if (prices.length >= MIN_CATEGORY_SIZE_FOR_OUTLIER) {
      prices.sort((a, b) => a - b);
      categoryMedianPrices.set(catId, computeMedian(prices));
    }
  }

  return { duplicateSkus, categoryMedianPrices };
}

// --- Per-Product Issue Detection ---

const STALE_THRESHOLD_DAYS = 90;
const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const OUTLIER_LOW_THRESHOLD = 0.5;
const OUTLIER_HIGH_THRESHOLD = 3.0;

export function computeMarginPercent(
  price: number | null | undefined,
  cost: number | null | undefined,
): number | null {
  if (price == null || price === 0 || cost == null) return null;
  return ((price - cost) / price) * 100;
}

export function computeProductIssues(
  product: CatalogProduct,
  context: IssueDetectionContext,
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // --- Data Quality ---
  if (product.categoryIds.length === 0) issues.push('NO_CATEGORY');
  if (product.sku && context.duplicateSkus.has(product.sku)) issues.push('DUPLICATE_SKU');
  if (!product.mainImageUrl) issues.push('NO_IMAGE');
  if (product.costPrice === undefined || product.costPrice === null) issues.push('NO_COST');
  if (!product.sku) issues.push('NO_SKU');
  if (product.weight === undefined || product.weight === null || product.weight === 0) {
    issues.push('ZERO_WEIGHT');
  }

  // --- Pricing ---
  const hasCost = product.costPrice !== undefined && product.costPrice !== null;
  if (hasCost) {
    if (product.currentPrice < product.costPrice!) {
      issues.push('BELOW_COST');
    } else if (product.currentPrice === product.costPrice) {
      issues.push('PRICE_EQUALS_COST');
    }
  }

  const hasList = product.listPrice !== undefined && product.listPrice !== null;
  if (hasList && product.listPrice! < product.currentPrice) {
    issues.push('LIST_BELOW_CURRENT');
  }

  const primaryCat = product.categoryIds[0];
  if (primaryCat !== undefined) {
    const median = context.categoryMedianPrices.get(primaryCat);
    if (median !== undefined) {
      if (product.currentPrice < median * OUTLIER_LOW_THRESHOLD) {
        issues.push('PRICE_OUTLIER_LOW');
      } else if (product.currentPrice > median * OUTLIER_HIGH_THRESHOLD) {
        issues.push('PRICE_OUTLIER_HIGH');
      }
    }
  }

  if (!hasList) issues.push('NO_LIST_PRICE');

  // --- Freshness / Stock ---
  if (product.status === 'ACTIVE' && product.stockLevel !== undefined && product.stockLevel === 0) {
    issues.push('OOS_ACTIVE');
  }
  if (isStale(product.updatedAt, STALE_THRESHOLD_DAYS)) {
    issues.push('STALE');
  }

  return issues;
}

// --- Catalog Health ---

export interface CatalogHealth {
  totalProducts: number;
  activeProducts: number;
  hiddenCount: number;
  disabledCount: number;
  avgMarginPct: number | null;
  oosActiveCount: number;
  lowStockCount: number;
  unreachableCount: number;
  mostRecentUpdate: string | null;
  issueCounts: Record<QualityIssue, number>;
  groupCounts: Record<IssueGroup, { critical: number; warning: number; info: number }>;
}

const ALL_ISSUES: QualityIssue[] = Object.keys(ISSUE_REGISTRY) as QualityIssue[];
const ALL_GROUPS: IssueGroup[] = ['data-quality', 'pricing', 'freshness'];

function emptyIssueCounts(): Record<QualityIssue, number> {
  const counts = {} as Record<QualityIssue, number>;
  for (const issue of ALL_ISSUES) counts[issue] = 0;
  return counts;
}

function emptyGroupCounts(): Record<
  IssueGroup,
  { critical: number; warning: number; info: number }
> {
  const counts = {} as Record<IssueGroup, { critical: number; warning: number; info: number }>;
  for (const group of ALL_GROUPS) counts[group] = { critical: 0, warning: 0, info: 0 };
  return counts;
}

export function computeCatalogHealth(
  products: CatalogProduct[],
  context: IssueDetectionContext,
): CatalogHealth {
  const issueCounts = emptyIssueCounts();
  const groupCounts = emptyGroupCounts();

  if (products.length === 0) {
    return {
      totalProducts: 0,
      activeProducts: 0,
      hiddenCount: 0,
      disabledCount: 0,
      avgMarginPct: null,
      oosActiveCount: 0,
      lowStockCount: 0,
      unreachableCount: 0,
      mostRecentUpdate: null,
      issueCounts,
      groupCounts,
    };
  }

  let activeProducts = 0;
  let hiddenCount = 0;
  let disabledCount = 0;
  let oosActiveCount = 0;
  let lowStockCount = 0;
  let unreachableCount = 0;
  const margins: number[] = [];
  let mostRecentUpdate: string | null = null;

  for (const product of products) {
    if (product.status === 'ACTIVE') activeProducts++;
    else if (product.status === 'HIDDEN') hiddenCount++;
    else if (product.status === 'DISABLED') disabledCount++;

    if (product.storefrontStatus === 'UNREACHABLE') unreachableCount++;

    const margin = computeMarginPercent(product.currentPrice, product.costPrice);
    if (margin !== null) margins.push(margin);

    if (product.status === 'ACTIVE' && product.stockLevel != null) {
      if (product.stockLevel === 0) {
        oosActiveCount++;
      } else {
        const threshold = product.minQty ?? DEFAULT_LOW_STOCK_THRESHOLD;
        if (product.stockLevel <= threshold) lowStockCount++;
      }
    }

    if (product.updatedAt) {
      if (!mostRecentUpdate || product.updatedAt > mostRecentUpdate) {
        mostRecentUpdate = product.updatedAt;
      }
    }

    const issues = computeProductIssues(product, context);
    for (const issue of issues) {
      issueCounts[issue]++;
      const config = ISSUE_REGISTRY[issue];
      groupCounts[config.group][config.severity]++;
    }
  }

  const avgMarginPct =
    margins.length > 0 ? margins.reduce((sum, m) => sum + m, 0) / margins.length : null;

  return {
    totalProducts: products.length,
    activeProducts,
    hiddenCount,
    disabledCount,
    avgMarginPct,
    oosActiveCount,
    lowStockCount,
    unreachableCount,
    mostRecentUpdate,
    issueCounts,
    groupCounts,
  };
}

// --- Utilities ---

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return 'just now';
  if (hours < 1) return `${minutes}m ago`;
  if (days < 1) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

export function isStale(iso: string | null | undefined, thresholdDays: number): boolean {
  if (!iso) return false;
  const ageMs = Date.now() - new Date(iso).getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}
