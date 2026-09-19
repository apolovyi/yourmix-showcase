import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  getSuppliers,
  calculateMargin,
  updatePrice,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getMarginRules,
  createMarginRule,
  updateMarginRule,
  deleteMarginRule,
  getAuditLog,
  getProductPriceHistory,
  getCategories,
  getUnmatchedCategories,
  getFailureSummary,
  getMultiSupplierProducts,
  getPricingFeedSummary,
} from '@/services';
import type {
  PricingSupplier,
  MarginCalculationRequest,
  MarginCalculationResult,
  PriceUpdateResult,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  MarginRule,
  CreateMarginRuleRequest,
  UpdateMarginRuleRequest,
  AuditPage,
  PriceHistoryPage,
  UnmatchedCategoryResponse,
  FailureSummaryResponse,
  MultiSupplierProduct,
  PageResult,
  PricingFeedSummary,
} from '@/types';

export function useSuppliers(
  active?: 'all' | 'true' | 'false',
): UseQueryResult<PricingSupplier[], Error> {
  return useQuery({
    queryKey: ['pricing-suppliers', active ?? 'all'],
    queryFn: () => getSuppliers(active),
    staleTime: 30 * 1000,
  });
}

export function useCalculateMargin(): UseMutationResult<
  MarginCalculationResult,
  Error,
  MarginCalculationRequest
> {
  return useMutation({
    mutationFn: calculateMargin,
  });
}

export function useUpdatePrice(): UseMutationResult<
  PriceUpdateResult,
  Error,
  { productId: number; newPrice: number; confirm: boolean }
> {
  return useMutation({
    mutationFn: ({ productId, newPrice, confirm }) => updatePrice(productId, newPrice, confirm),
  });
}

export function useCreateSupplier(): UseMutationResult<
  PricingSupplier,
  Error,
  CreateSupplierRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-suppliers'] });
    },
  });
}

export function useUpdateSupplier(): UseMutationResult<
  PricingSupplier,
  Error,
  { id: string; data: UpdateSupplierRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-suppliers'] });
    },
  });
}

export function useDeleteSupplier(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-suppliers'] });
    },
  });
}

export function useMarginRules(): UseQueryResult<MarginRule[], Error> {
  return useQuery({
    queryKey: ['margin-rules'],
    queryFn: getMarginRules,
    staleTime: 30 * 1000,
  });
}

export function useCreateMarginRule(): UseMutationResult<
  MarginRule,
  Error,
  CreateMarginRuleRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMarginRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin-rules'] });
      queryClient.invalidateQueries({ queryKey: ['unmatched-categories'] });
    },
  });
}

export function useUpdateMarginRule(): UseMutationResult<
  MarginRule,
  Error,
  { id: string; data: UpdateMarginRuleRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateMarginRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin-rules'] });
    },
  });
}

export function useDeleteMarginRule(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMarginRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin-rules'] });
      queryClient.invalidateQueries({ queryKey: ['unmatched-categories'] });
    },
  });
}

export function useAuditLog(
  entityType: string | null,
  entityId: string | null,
  page: number = 0,
): UseQueryResult<AuditPage, Error> {
  return useQuery({
    queryKey: ['audit', entityType, entityId, page],
    queryFn: () => getAuditLog(entityType!, entityId!, page),
    enabled: !!entityType && !!entityId,
    staleTime: 30 * 1000,
  });
}

export function useProductPriceHistory(
  cscartProductId: number | null,
  page: number = 0,
): UseQueryResult<PriceHistoryPage, Error> {
  return useQuery({
    queryKey: ['product-price-history', cscartProductId, page],
    queryFn: () => getProductPriceHistory(cscartProductId!, page),
    enabled: !!cscartProductId,
    staleTime: 30 * 1000,
  });
}

export function useCategories(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: ['pricing-categories'],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnmatchedCategories(): UseQueryResult<UnmatchedCategoryResponse, Error> {
  return useQuery({
    queryKey: ['unmatched-categories'],
    queryFn: getUnmatchedCategories,
    staleTime: 30 * 1000,
  });
}

export function useFailureSummary(): UseQueryResult<FailureSummaryResponse, Error> {
  return useQuery({
    queryKey: ['failure-summary'],
    queryFn: getFailureSummary,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 0,
  });
}

export function useMultiSupplierProducts(
  page: number = 0,
): UseQueryResult<PageResult<MultiSupplierProduct>, Error> {
  return useQuery({
    queryKey: ['multi-supplier-products', page],
    queryFn: () => getMultiSupplierProducts(page),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePricingFeedSummary(): UseQueryResult<PricingFeedSummary, Error> {
  return useQuery({
    queryKey: ['pricing-feed-summary'],
    queryFn: getPricingFeedSummary,
    staleTime: 60 * 1000,
    retry: 0,
  });
}
