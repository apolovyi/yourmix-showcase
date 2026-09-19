import { api } from '@/services/api-client';
import { getAccessToken } from './auth';
import { ApiError, AuthError, NetworkError, ServerError } from '@/services/errors';
import type {
  MarginCalculationRequest,
  MarginCalculationResult,
  PriceUpdateResult,
  PricingSupplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  MarginRule,
  CreateMarginRuleRequest,
  UpdateMarginRuleRequest,
  AuditPage,
  RevertResponse,
  PriceHistoryPage,
  UnmatchedCategoryResponse,
  FailureSummaryResponse,
  PageResult,
  MultiSupplierProduct,
  PricingFeedCustomer,
  PricingFeedSummary,
  PricingTierSummaryGroup,
} from '@/types';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function unwrapValue(value: unknown): unknown {
  if (isRecord(value) && 'value' in value) {
    return unwrapValue(value.value);
  }
  return value;
}

function getString(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = unwrapValue(record[key]);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getNumber(record: JsonRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = unwrapValue(record[key]);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function normalizeTier(value: string | undefined): string {
  return value?.trim() || 'UNASSIGNED';
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function getSampleCustomers(value: unknown): PricingTierSummaryGroup['sampleCustomers'] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((entry) => {
      const customerId = getString(entry, ['customerId', 'CustomerID', 'id']);
      const customerName =
        getString(entry, ['customerName', 'CustomerName', 'name', 'displayName']) ?? customerId;

      if (!customerName) return null;

      return {
        customerId: customerId ?? customerName,
        customerName,
      };
    })
    .filter((entry): entry is PricingTierSummaryGroup['sampleCustomers'][number] => entry !== null)
    .slice(0, 3);
}

function sortTierGroups(groups: PricingTierSummaryGroup[]): PricingTierSummaryGroup[] {
  return [...groups].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    if (left.tier === 'UNASSIGNED') return 1;
    if (right.tier === 'UNASSIGNED') return -1;
    return left.tier.localeCompare(right.tier);
  });
}

function summarizeCustomers(customers: PricingFeedCustomer[]): PricingFeedSummary {
  const groups = new Map<string, PricingTierSummaryGroup>();

  for (const customer of customers) {
    const tier = normalizeTier(customer.effectiveTier);
    const existing = groups.get(tier);
    if (existing) {
      existing.count += 1;
      if (existing.sampleCustomers.length < 3) {
        existing.sampleCustomers.push({
          customerId: customer.customerId,
          customerName: customer.customerName,
        });
      }
      continue;
    }

    groups.set(tier, {
      tier,
      count: 1,
      sampleCustomers: [
        {
          customerId: customer.customerId,
          customerName: customer.customerName,
        },
      ],
    });
  }

  const tiers = sortTierGroups(Array.from(groups.values()));
  return {
    totalCustomers: customers.length,
    tiers,
  };
}

function extractTierSummary(payload: unknown): PricingFeedSummary | null {
  if (!isRecord(payload)) return null;

  const tierCountMap = ['tierCounts', 'countsByTier'].map((key) => payload[key]).find(isRecord);

  if (tierCountMap) {
    const tiers = Object.entries(tierCountMap)
      .map<PricingTierSummaryGroup | null>(([tier, rawCount]) => {
        const count = typeof rawCount === 'number' ? rawCount : Number(unwrapValue(rawCount));
        if (!Number.isFinite(count) || count <= 0) return null;

        return {
          tier: normalizeTier(tier),
          count,
          sampleCustomers: [],
        };
      })
      .filter(isDefined);

    if (tiers.length > 0) {
      return {
        totalCustomers: tiers.reduce((sum, tier) => sum + tier.count, 0),
        tiers: sortTierGroups(tiers),
      };
    }
  }

  for (const key of ['tiers', 'groups']) {
    const value = payload[key];
    if (!Array.isArray(value)) continue;

    const tiers = value
      .filter(isRecord)
      .map<PricingTierSummaryGroup | null>((entry) => {
        const tier = normalizeTier(getString(entry, ['tier', 'effectiveTier', 'name', 'label']));
        const sampleCustomers = getSampleCustomers(entry.customers);
        const count =
          getNumber(entry, ['count', 'customerCount', 'total']) ??
          (sampleCustomers.length > 0 ? sampleCustomers.length : undefined);

        if (!count || count <= 0) return null;

        return {
          tier,
          count,
          sampleCustomers,
        };
      })
      .filter(isDefined);

    if (tiers.length > 0) {
      return {
        totalCustomers: tiers.reduce((sum, tier) => sum + tier.count, 0),
        tiers: sortTierGroups(tiers),
      };
    }
  }

  return null;
}

function extractCustomerRows(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) return [];

  for (const key of ['customers', 'items', 'content', 'feed', 'data', 'results']) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function normalizeCustomerRow(row: JsonRecord): PricingFeedCustomer {
  const priceClassId = getString(row, [
    'priceClassId',
    'priceClassID',
    'PriceClassID',
    'priceClass',
  ]);
  const customerClass = getString(row, ['customerClass', 'CustomerClass', 'class']);
  const effectiveTier = normalizeTier(
    getString(row, ['effectiveTier', 'effectivePricingTier', 'pricingTier', 'tier']) ??
      priceClassId ??
      customerClass ??
      'UNASSIGNED',
  );
  const customerId = getString(row, ['customerId', 'CustomerID', 'id', 'accountId']);
  const customerName =
    getString(row, ['customerName', 'CustomerName', 'name', 'displayName']) ??
    customerId ??
    'Unknown customer';

  return {
    customerId: customerId ?? customerName,
    customerName,
    effectiveTier,
    priceClassId: priceClassId ?? null,
    customerClass: customerClass ?? null,
  };
}

function normalizePricingFeed(payload: unknown): PricingFeedSummary {
  const tierSummary = extractTierSummary(payload);
  if (tierSummary) {
    return tierSummary;
  }

  const customers = extractCustomerRows(payload).map(normalizeCustomerRow);
  return summarizeCustomers(customers);
}

function getApiPath(path: string): string {
  const apiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!apiUrl) return path;
  return `${apiUrl.replace(/\/api$/, '')}${path}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as {
      message?: string;
      error?: { message?: string };
    };
    return body.message || body.error?.message || `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}

export async function calculateMargin(
  request: MarginCalculationRequest,
): Promise<MarginCalculationResult> {
  const { data } = await api.POST('/api/pricing/margin/calculate', { body: request });
  return data!;
}

export async function updatePrice(
  productId: number,
  newPrice: number,
  confirm: boolean,
): Promise<PriceUpdateResult> {
  const { data } = await api.PUT('/api/pricing/products/{id}/price', {
    params: { path: { id: productId }, query: { confirm } },
    body: { newPrice },
  });
  return data!;
}

export async function getSuppliers(active?: 'all' | 'true' | 'false'): Promise<PricingSupplier[]> {
  const query = active && active !== 'all' ? { active: active } : undefined;
  const { data } = await api.GET('/api/pricing/suppliers', { params: { query } });
  return data!;
}

export async function createSupplier(request: CreateSupplierRequest): Promise<PricingSupplier> {
  const { data } = await api.POST('/api/pricing/suppliers', { body: request });
  return data!;
}

export async function updateSupplier(
  id: string,
  request: UpdateSupplierRequest,
): Promise<PricingSupplier> {
  const { data } = await api.PUT('/api/pricing/suppliers/{id}', {
    params: { path: { id } },
    body: request,
  });
  return data!;
}

export async function deleteSupplier(id: string): Promise<void> {
  await api.DELETE('/api/pricing/suppliers/{id}', { params: { path: { id } } });
}

export async function getMarginRules(): Promise<MarginRule[]> {
  const { data } = await api.GET('/api/pricing/margins');
  return data!;
}

export async function createMarginRule(request: CreateMarginRuleRequest): Promise<MarginRule> {
  const { data } = await api.POST('/api/pricing/margins', { body: request });
  return data!;
}

export async function updateMarginRule(
  id: string,
  request: UpdateMarginRuleRequest,
): Promise<MarginRule> {
  const { data } = await api.PUT('/api/pricing/margins/{id}', {
    params: { path: { id } },
    body: request,
  });
  return data!;
}

export async function deleteMarginRule(id: string): Promise<void> {
  await api.DELETE('/api/pricing/margins/{id}', { params: { path: { id } } });
}

export async function getAuditLog(
  entityType: string,
  entityId: string,
  page: number = 0,
  size: number = 10,
): Promise<AuditPage> {
  const { data } = await api.GET('/api/audit', {
    params: { query: { entityType, entityId, page, size } },
  });
  return data!;
}

export async function revertProposal(id: string): Promise<RevertResponse> {
  const { data } = await api.POST('/api/pricing/proposals/{id}/revert', {
    params: { path: { id } },
  });
  return data!;
}

export async function getProductPriceHistory(
  cscartProductId: number,
  page: number = 0,
  size: number = 20,
): Promise<PriceHistoryPage> {
  const { data } = await api.GET('/api/pricing/products/{cscartId}/history', {
    params: { path: { cscartId: cscartProductId }, query: { page, size } },
  });
  return data!;
}

export async function getCategories(): Promise<string[]> {
  const { data } = await api.GET('/api/pricing/categories');
  return data?.categories ?? [];
}

export async function getUnmatchedCategories(): Promise<UnmatchedCategoryResponse> {
  const { data } = await api.GET('/api/pricing/categories/unmatched');
  return data!;
}

export async function getFailureSummary(): Promise<FailureSummaryResponse> {
  const { data } = await api.GET('/api/pricing/failures/summary');
  return data!;
}

export async function getMultiSupplierProducts(
  page: number = 0,
  size: number = 20,
): Promise<PageResult<MultiSupplierProduct>> {
  const { data } = await api.GET('/api/pricing/products/multi-supplier', {
    params: { query: { page, size } },
  });
  return data as unknown as PageResult<MultiSupplierProduct>;
}

export async function getPricingFeedSummary(): Promise<PricingFeedSummary> {
  const headers = new Headers({ Accept: 'application/json' });
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(getApiPath('/api/logistics/pricing-feed'), { headers });
  } catch (error) {
    throw new NetworkError(
      error instanceof Error ? error.message : 'Could not reach the pricing feed',
      error,
    );
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 401) {
      throw new AuthError(message);
    }
    if (response.status >= 500) {
      throw new ServerError(message, response.status);
    }
    throw new ApiError(message, response.status, 'CLIENT_ERROR');
  }

  const payload = (await response.json()) as unknown;
  return normalizePricingFeed(payload);
}
