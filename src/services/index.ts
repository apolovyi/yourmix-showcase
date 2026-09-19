// Auth
export { login, logout, refreshAuth, getAccessToken, clearTokens } from './bff/auth';
export type { AuthUser } from './bff/auth';

// Catalog
export {
  getCatalogProducts,
  getCatalogProduct,
  getCatalogIdentity,
  getCatalogIdentitySummary,
  searchProductBySku,
  getCatalogCategories,
  getCatalogVendors,
} from './bff/catalog';

// Pricing
export {
  calculateMargin,
  updatePrice,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getMarginRules,
  createMarginRule,
  updateMarginRule,
  deleteMarginRule,
  getAuditLog,
  revertProposal,
  getProductPriceHistory,
  getCategories,
  getUnmatchedCategories,
  getFailureSummary,
  getMultiSupplierProducts,
  getPricingFeedSummary,
} from './bff/pricing';

// Proposals
export {
  getProposals,
  getProposal,
  getProposalItems,
  uploadSupplierFile,
  getFileStatus,
  approveProposal,
  rejectProposal,
  approveItem,
  rejectItem,
  overrideItemPrice,
  mapUnmatchedItem,
  retryFile,
  getRecentUploads,
} from './bff/proposals';

// Generated API client (openapi-fetch)
export { api } from './api-client';

// Error hierarchy
export {
  ApiError,
  AuthError,
  NetworkError,
  ServerError,
  NotFoundError,
  isApiError,
} from './errors';
