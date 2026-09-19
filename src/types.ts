import type { components } from '@/generated/api';

// ─── Backend DTO aliases (generated from OpenAPI spec) ──────────────────────
// These replace hand-written types that previously mirrored backend DTOs.
// The aliases preserve existing type names so consumers don't change.

type Schemas = components['schemas'];

// Catalog
export type CatalogProduct = Schemas['ProductResponse'];
export type ProductPage = Schemas['ProductListResponse'];
export type CatalogCategory = Schemas['CategoryResponse'];
export type CategoryList = Schemas['CategoryListResponse'];
export type CatalogVendor = Schemas['VendorResponse'];
export type VendorList = Schemas['VendorListResponse'];
export type ProductSummary = Schemas['ProductSummaryResponse'];

export interface CatalogIdentityProjection {
  cscartProductId: number;
  productName: string;
  catalogSku: string;
  provisionalAcumaticaInventoryId: string;
  productStatus: CatalogProduct['status'];
  mappingRule: 'SKU_EQUALS_ACUMATICA_INVENTORY_ID';
  verificationStatus: 'PROVISIONAL';
  catalogSkuOccurrenceCount: number;
  ambiguous: boolean;
  catalogUpdatedAt?: string | null;
}

export interface CatalogIdentityProjectionSummary {
  totalProjectedRows: number;
  provisionalRows: number;
  ambiguousRows: number;
  distinctCatalogSkus: number;
  productStatusCounts: Partial<Record<CatalogProduct['status'], number>>;
}

// Pricing
export type PricingSupplier = Schemas['SupplierResponse'];
export type MarginCalculationResult = Schemas['MarginCalculationResponse'];
export type PriceUpdateResult = Schemas['PriceUpdateResponse'];
export type UploadResponse = Schemas['UploadResponse'];
export type FileStatusResponse = Schemas['FileStatusResponse'];
export type CreateSupplierRequest = Schemas['CreateSupplierRequest'];
export type UpdateSupplierRequest = Schemas['UpdateSupplierRequest'];
export type MarginCalculationRequest = Schemas['MarginCalculationRequest'];

// Margin Rules
export type MarginRule = Schemas['MarginRuleResponse'];
export type CreateMarginRuleRequest = Schemas['CreateMarginRuleRequest'];
export type UpdateMarginRuleRequest = Schemas['UpdateMarginRuleRequest'];

// Proposals
export type Proposal = Schemas['ProposalResponse'];
export type ProposalItem = Schemas['ProposalItemResponse'];
export type FailedItemSummary = Schemas['FailedItemSummary'];
export type RevertResponse = Schemas['RevertResponse'];
export type OverrideRequest = Schemas['OverrideRequest'];
export type MapRequest = Schemas['MapRequest'];

// Price History
export type PriceHistoryEntry = Schemas['PriceHistoryEntry'];
export type PriceHistoryPage = Schemas['PageResultPriceHistoryEntry'];

// Multi-supplier
export type MultiSupplierProduct = Schemas['MultiSupplierProduct'];
export type SupplierQuote = Schemas['SupplierQuote'];

// Unmatched Categories
export type UnmatchedCategoryResponse = Schemas['UnmatchedCategoriesResult'];
export type UnmatchedCategory = Schemas['CategoryStat'];

// Failures
export type FailureSummaryResponse = Schemas['FailureSummary'];

// Logistics pricing feed
export interface PricingFeedCustomer {
  customerId: string;
  customerName: string;
  effectiveTier: string;
  priceClassId?: string | null;
  customerClass?: string | null;
}

export interface PricingTierSummaryGroup {
  tier: string;
  count: number;
  sampleCustomers: Array<Pick<PricingFeedCustomer, 'customerId' | 'customerName'>>;
}

export interface PricingFeedSummary {
  totalCustomers: number;
  tiers: PricingTierSummaryGroup[];
}

// Audit
export type AuditLogEntry = Schemas['AuditLogResponse'];
export type AuditPage = Schemas['AuditPageResponse'];

// Categories
export type CategorySuggestionsResponse = Schemas['CategorySuggestionsResponse'];

// ─── Frontend-only types (not in backend) ───────────────────────────────────

export type ProductSortField = 'NAME' | 'PRICE' | 'MARGIN' | 'STOCK' | 'UPDATED';
export type SortDirection = 'ASC' | 'DESC';
export type QualityIssueFilter =
  | 'BELOW_COST'
  | 'OOS_ACTIVE'
  | 'LOW_STOCK'
  | 'NO_IMAGE'
  | 'NO_CATEGORY'
  | 'DUPLICATE_SKU'
  | 'NO_COST'
  | 'STALE';

export interface InventoryFilter {
  page: number;
  pageSize: number;
  search: string;
  storefrontStatus: string;
  category: number | '';
  vendor: number | '';
  issue: QualityIssueFilter | '';
  sortBy: ProductSortField;
  sortDir: SortDirection;
}

export interface ProductFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: number;
  status?: 'ACTIVE' | 'HIDDEN' | 'DISABLED';
  identityStatus?: 'MATCHED' | 'AMBIGUOUS' | 'UNMAPPED';
  priceMin?: number;
  priceMax?: number;
}

// Upload status union (matches generated ParseStatus enum)
export type UploadStatus = 'PENDING' | 'PARSING' | 'PARSED' | 'FAILED';

// Proposal workflow unions (kept for explicit type annotations in components)
export type ProposalStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'APPLYING'
  | 'APPLIED'
  | 'PARTIALLY_APPLIED'
  | 'REJECTED'
  | 'REVERTED'
  | 'PARTIALLY_REVERTED';

export type ApprovalStatus =
  | 'AUTO_APPROVED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'BLOCKED';

export type UpdateStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPLIED'
  | 'FAILED'
  | 'SKIPPED'
  | 'REVERTED'
  | 'REVERT_FAILED';

export type ReviewReason =
  | 'UNMATCHED'
  | 'LARGE_INCREASE'
  | 'LARGE_DECREASE'
  | 'NEGATIVE_MARGIN'
  | 'MISSING_COST';

export type OverrideReason =
  | 'PROMOTION'
  | 'COMPETITOR_MATCH'
  | 'CLEARANCE'
  | 'SPECIAL_DEAL'
  | 'CORRECTION';

// Generic pagination (used by frontend for non-generated page types)
export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
