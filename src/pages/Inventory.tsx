import { useState, useMemo, useCallback, useEffect, type ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { createColumnHelper, type ColumnDef, type SortingState } from '@tanstack/react-table';
import type {
  CatalogProduct,
  CatalogCategory,
  CatalogVendor,
  InventoryFilter,
  ProductSortField,
} from '@/types';
import { Search, Package, ChevronRight, X } from 'lucide-react';
import {
  useProductSummary,
  useServerProducts,
  useCatalogCategories,
  useCatalogVendors,
} from '@/hooks/queries';
import { DataTable, Skeleton, SearchableCombobox } from '@/components/ui';
import { IssueChips } from '@/pages/inventory/IssueChips';
import { AvailabilityChips } from '@/pages/inventory/AvailabilityChips';
import { ProductHealthReport } from '@/pages/inventory/ProductHealthReport';
import { PaginationBar } from '@/pages/inventory/PaginationBar';
import {
  computeMarginPercent,
  computeProductIssues,
  formatRelativeTime,
  isStale,
  ISSUE_REGISTRY,
  STOREFRONT_STATUS_CONFIG,
  type QualityIssue,
  type IssueDetectionContext,
} from '@/utils/catalog';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function getMarginColor(margin: number | null): string {
  if (margin === null) return 'text-slate-500';
  if (margin < 0) return 'text-red-400';
  if (margin < 10) return 'text-amber-400';
  return 'text-emerald-400';
}

function buildColumns(
  categories: CatalogCategory[],
  vendors: CatalogVendor[],
  expandedProductId: number | null,
  onToggleExpand: (id: number) => void,
  issuePrevalence: Map<QualityIssue, number>,
  issueContext: IssueDetectionContext,
): ColumnDef<CatalogProduct, unknown>[] {
  const columnHelper = createColumnHelper<CatalogProduct>();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return [
    // Expand chevron
    columnHelper.display({
      id: 'expand',
      header: '',
      size: 36,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      cell: (info) => {
        const isExpanded = info.row.original.cscartProductId === expandedProductId;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(info.row.original.cscartProductId);
            }}
            className="p-0.5 rounded hover:bg-slate-700 transition-colors"
            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
          >
            <ChevronRight
              size={14}
              className={`text-slate-500 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        );
      },
    }),

    // Image (smaller: 32px) — only show placeholder if product has an image
    columnHelper.display({
      id: 'image',
      header: '',
      size: 48,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      cell: (info) => {
        const url = info.row.original.mainImageUrl;
        if (url) {
          return (
            <img
              src={url}
              alt={info.row.original.name}
              className="w-8 h-8 rounded object-cover bg-slate-700"
              loading="lazy"
            />
          );
        }
        return <div className="w-8 h-8" />;
      },
    }),

    // Product (name + SKU on one line)
    columnHelper.accessor('name', {
      header: 'Product',
      enableHiding: false,
      cell: (info) => {
        const name = info.getValue() as string;
        const sku = info.row.original.sku;
        const showSku = sku && sku.toLowerCase().trim() !== name.toLowerCase().trim();
        return (
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-medium text-slate-200 truncate" title={name}>
              {name}
            </span>
            {showSku && (
              <span className="text-slate-500 text-xs font-mono shrink-0">&middot; {sku}</span>
            )}
          </div>
        );
      },
    }),

    // Price (current + list if different)
    columnHelper.accessor('currentPrice', {
      header: 'Price',
      size: 90,
      meta: { align: 'right' },
      cell: (info) => {
        const price = info.getValue();
        const list = info.row.original.listPrice;
        const showList = list !== undefined && list !== null && list !== price;
        return (
          <div className="text-right whitespace-nowrap">
            <span className="font-medium text-slate-200">P{price.toFixed(2)}</span>
            {showList && (
              <span className="text-xs text-slate-500 line-through ml-1">P{list.toFixed(2)}</span>
            )}
          </div>
        );
      },
    }),

    // Margin % (with cost on hover via title) — sortable
    columnHelper.accessor((row) => computeMarginPercent(row.currentPrice, row.costPrice), {
      id: 'margin',
      header: 'Margin',
      size: 80,
      meta: { align: 'right' },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as number | null;
        const b = rowB.getValue(columnId) as number | null;
        if (a === null && b === null) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        return a - b;
      },
      cell: (info) => {
        const margin = info.getValue();
        const cost = info.row.original.costPrice;
        const costLabel =
          cost !== undefined && cost !== null ? `Cost: P${cost.toFixed(2)}` : 'No cost data';
        return (
          <span
            className={`font-medium text-right block ${getMarginColor(margin)}`}
            title={costLabel}
          >
            {margin !== null ? (
              `${margin.toFixed(1)}%`
            ) : (
              <span className="text-slate-600 text-[10px] font-normal italic">no cost</span>
            )}
          </span>
        );
      },
    }),

    // Stock
    columnHelper.accessor('stockLevel', {
      header: 'Stock',
      size: 70,
      meta: { align: 'right' },
      cell: (info) => {
        const stock = info.getValue();
        if (stock === undefined || stock === null)
          return <span className="text-slate-500 text-right block">{'\u2014'}</span>;
        const threshold = info.row.original.minQty ?? 10;
        const isLow = stock <= threshold;
        return (
          <span
            className={`font-bold text-right block ${isLow ? 'text-red-400' : 'text-emerald-400'}`}
          >
            {stock}
          </span>
        );
      },
    }),

    // Status — storefront availability
    columnHelper.accessor('storefrontStatus', {
      header: 'Status',
      size: 100,
      cell: (info) => {
        const sfStatus = info.getValue();
        const config = sfStatus
          ? STOREFRONT_STATUS_CONFIG[sfStatus]
          : STOREFRONT_STATUS_CONFIG.DISABLED;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label.toLowerCase()}
            </span>
          </div>
        );
      },
    }),

    // Quality — issue chips + availability chips, sortable by total issue count
    columnHelper.display({
      id: 'quality',
      header: 'Issues',
      size: 140,
      enableSorting: false,
      cell: (info) => {
        const product = info.row.original;
        const qualityIssues = computeProductIssues(product, issueContext);
        const availIssues = product.availabilityIssues ?? [];
        return (
          <div className="flex flex-wrap items-center gap-0.5 overflow-hidden max-h-[40px]">
            {availIssues.length > 0 && <AvailabilityChips issues={availIssues} product={product} />}
            <IssueChips issues={qualityIssues} prevalence={issuePrevalence} />
          </div>
        );
      },
    }),

    // --- Hidden by default ---

    // Vendor (with status indicator)
    columnHelper.display({
      id: 'vendor',
      header: 'Vendor',
      size: 140,
      cell: (info) => {
        const product = info.row.original;
        const name =
          product.vendorName ??
          (product.vendorId !== undefined ? `#${product.vendorId}` : '\u2014');
        const status = product.vendorStatus;
        const isDisabled = status === 'D';
        const isPending = status === 'P';
        return (
          <div className="flex items-center gap-1.5">
            {(isDisabled || isPending) && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDisabled ? 'bg-red-400' : 'bg-amber-400'}`}
              />
            )}
            <span className={`text-slate-400 text-sm ${isDisabled ? 'line-through' : ''}`}>
              {name}
            </span>
          </div>
        );
      },
    }),

    // Category
    columnHelper.display({
      id: 'category',
      header: 'Category',
      size: 140,
      cell: (info) => {
        const ids = info.row.original.categoryIds;
        const name = ids.length > 0 ? (categoryMap.get(ids[0]) ?? '\u2014') : '\u2014';
        return <span className="text-slate-400 text-sm">{name}</span>;
      },
    }),

    // Cost
    columnHelper.accessor('costPrice', {
      header: 'Cost',
      size: 90,
      meta: { align: 'right' },
      cell: (info) => {
        const cost = info.getValue();
        if (cost === undefined || cost === null)
          return <span className="text-slate-500 text-right block">{'\u2014'}</span>;
        return <span className="text-slate-300 text-right block">P{cost.toFixed(2)}</span>;
      },
    }),

    // Updated (relative time)
    columnHelper.display({
      id: 'updated',
      header: 'Updated',
      size: 90,
      meta: { align: 'right' },
      cell: (info) => {
        const updatedAt = info.row.original.updatedAt;
        if (!updatedAt) return <span className="text-slate-500 text-right block">{'\u2014'}</span>;
        const staleFlag = isStale(updatedAt, 90);
        return (
          <span
            className={`text-right block text-sm ${staleFlag ? 'text-red-400' : 'text-slate-400'}`}
          >
            {formatRelativeTime(updatedAt)}
          </span>
        );
      },
    }),

    // Other hidden columns
    columnHelper.accessor('listPrice', {
      header: 'List Price',
      size: 90,
      meta: { align: 'right' },
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className="text-slate-300 text-right block">
            {v !== undefined && v !== null ? `P${v.toFixed(2)}` : '\u2014'}
          </span>
        );
      },
    }),

    columnHelper.accessor('basePrice', {
      header: 'Base Price',
      size: 90,
      meta: { align: 'right' },
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className="text-slate-300 text-right block">
            {v !== undefined && v !== null ? `P${v.toFixed(2)}` : '\u2014'}
          </span>
        );
      },
    }),

    columnHelper.accessor('weight', {
      header: 'Weight',
      size: 80,
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className="text-slate-300">
            {v !== undefined && v !== null ? `${v} kg` : '\u2014'}
          </span>
        );
      },
    }),

    columnHelper.accessor('minQty', {
      header: 'Min Qty',
      size: 70,
      cell: (info) => <span className="text-slate-300">{info.getValue() ?? '\u2014'}</span>,
    }),

    columnHelper.accessor('trackingMode', {
      header: 'Tracking',
      size: 80,
      cell: (info) => <span className="text-slate-300">{info.getValue() ?? '\u2014'}</span>,
    }),

    columnHelper.display({
      id: 'botswanaMade',
      header: 'Botswana Made',
      size: 100,
      cell: (info) => (
        <span className="text-slate-300">{info.row.original.botswanaMade ? 'Yes' : 'No'}</span>
      ),
    }),

    columnHelper.display({
      id: 'sameDayDelivery',
      header: 'Same-Day',
      size: 80,
      cell: (info) => (
        <span className="text-slate-300">{info.row.original.sameDayDelivery ? 'Yes' : 'No'}</span>
      ),
    }),

    columnHelper.display({
      id: 'createdAt',
      header: 'Created',
      size: 100,
      cell: (info) => {
        const v = info.row.original.createdAt;
        return (
          <span className="text-slate-400 text-sm">{v ? formatRelativeTime(v) : '\u2014'}</span>
        );
      },
    }),
  ] as ColumnDef<CatalogProduct, unknown>[];
}

// Hidden-by-default column IDs
const HIDDEN_COLUMNS: Record<string, boolean> = {
  vendor: false,
  category: false,
  costPrice: false,
  updated: false,
  listPrice: false,
  basePrice: false,
  weight: false,
  minQty: false,
  trackingMode: false,
  botswanaMade: false,
  sameDayDelivery: false,
  createdAt: false,
};

const STOREFRONT_STATUS_OPTIONS = [
  { value: 'REACHABLE', label: 'Live' },
  { value: 'UNREACHABLE', label: 'Unreachable' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'DISABLED', label: 'Disabled' },
];

const VALID_ISSUES = new Set<string>([
  'BELOW_COST',
  'OOS_ACTIVE',
  'LOW_STOCK',
  'NO_IMAGE',
  'NO_CATEGORY',
  'DUPLICATE_SKU',
  'NO_COST',
  'STALE',
]);

const DEFAULT_FILTER: InventoryFilter = {
  page: 1,
  pageSize: 50,
  search: '',
  storefrontStatus: 'REACHABLE',
  category: '',
  vendor: '',
  issue: '',
  sortBy: 'NAME',
  sortDir: 'ASC',
};

export function Inventory(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilterRaw] = useState<InventoryFilter>(() => {
    const issueParam = searchParams.get('issue');
    const statusParam = searchParams.get('status');
    // When deep-linking with ?issue but no ?status, show all storefront statuses
    // so the issue filter isn't silently masked by the default REACHABLE filter
    const storefrontStatus = statusParam ?? (issueParam ? '' : DEFAULT_FILTER.storefrontStatus);
    return {
      ...DEFAULT_FILTER,
      search: searchParams.get('search') ?? DEFAULT_FILTER.search,
      storefrontStatus,
      category: searchParams.get('category')
        ? Number(searchParams.get('category'))
        : DEFAULT_FILTER.category,
      vendor: searchParams.get('vendor')
        ? Number(searchParams.get('vendor'))
        : DEFAULT_FILTER.vendor,
      issue: (issueParam && VALID_ISSUES.has(issueParam)
        ? issueParam
        : DEFAULT_FILTER.issue) as InventoryFilter['issue'],
    };
  });
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  function setFilter(updates: Partial<InventoryFilter>): void {
    setFilterRaw((prev) => {
      const next = { ...prev, ...updates };
      if (!('page' in updates)) next.page = 1;
      return next;
    });
  }

  useEffect(() => {
    setFilter({ search: debouncedSearch });
  }, [debouncedSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.search) params.set('search', filter.search);
    if (filter.storefrontStatus !== DEFAULT_FILTER.storefrontStatus)
      params.set('status', filter.storefrontStatus);
    if (filter.category) params.set('category', String(filter.category));
    if (filter.vendor) params.set('vendor', String(filter.vendor));
    if (filter.issue) params.set('issue', filter.issue);
    setSearchParams(params, { replace: true });
  }, [
    filter.search,
    filter.storefrontStatus,
    filter.category,
    filter.vendor,
    filter.issue,
    setSearchParams,
  ]);

  const { data: summary, isLoading: summaryLoading } = useProductSummary();
  const {
    data: productPage,
    isLoading: productsLoading,
    isFetching,
    dataUpdatedAt,
  } = useServerProducts(filter);

  const products = useMemo(() => productPage?.products ?? [], [productPage?.products]);
  const totalItems = productPage?.totalItems ?? 0;

  const { data: categories = [] } = useCatalogCategories();
  const { data: vendors = [] } = useCatalogVendors();

  const syncedAgo =
    dataUpdatedAt > 0 ? formatRelativeTime(new Date(dataUpdatedAt).toISOString()) : null;

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedProductId((prev) => (prev === id ? null : id));
  }, []);

  const issueContext: IssueDetectionContext = useMemo(() => {
    if (!summary) return { duplicateSkus: new Set<string>(), categoryMedianPrices: new Map() };

    const duplicateSkus = new Set<string>();
    const normalizedDuplicateSkus = summary.duplicateSkus
      .map((sku) => sku?.trim().toUpperCase() || null)
      .filter((sku): sku is string => Boolean(sku));

    for (const sku of normalizedDuplicateSkus) {
      duplicateSkus.add(sku);
    }

    for (const product of products) {
      const productSku = product.sku?.trim().toUpperCase() || null;
      if (productSku && duplicateSkus.has(productSku) && product.sku) {
        duplicateSkus.add(product.sku);
      }
    }

    return {
      duplicateSkus,
      categoryMedianPrices: new Map(
        Object.entries(summary.categoryMedianPrices).map(([k, v]) => [Number(k), v]),
      ),
    };
  }, [products, summary]);

  const issuePrevalence = useMemo(() => {
    const map = new Map<QualityIssue, number>();
    if (summary && summary.totalProducts > 0) {
      for (const [issue, count] of Object.entries(summary.issueCounts)) {
        map.set(issue as QualityIssue, count / summary.totalProducts);
      }
    }
    return map;
  }, [summary]);

  const columns = useMemo(
    () =>
      buildColumns(
        categories,
        vendors,
        expandedProductId,
        handleToggleExpand,
        issuePrevalence,
        issueContext,
      ),
    [categories, vendors, expandedProductId, handleToggleExpand, issuePrevalence, issueContext],
  );

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.name.trim() !== '')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: String(c.id), label: c.name })),
    [categories],
  );

  const vendorOptions = useMemo(
    () =>
      vendors
        .filter((v) => v.name.trim() !== '')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((v) => ({ value: String(v.id), label: v.name })),
    [vendors],
  );

  function handleSortingChange(sorting: SortingState): void {
    if (sorting.length === 0) {
      setFilter({ sortBy: 'NAME', sortDir: 'ASC' });
      return;
    }
    const { id, desc } = sorting[0];
    const sortFieldMap: Record<string, ProductSortField> = {
      name: 'NAME',
      currentPrice: 'PRICE',
      margin: 'MARGIN',
      stockLevel: 'STOCK',
      updated: 'UPDATED',
    };
    const sortBy = sortFieldMap[id];
    if (sortBy) {
      setFilter({ sortBy, sortDir: desc ? 'DESC' : 'ASC' });
    }
  }

  function clearAllFilters(): void {
    setFilterRaw(DEFAULT_FILTER);
    setSearchInput('');
  }

  const hasActiveFilters =
    filter.search !== DEFAULT_FILTER.search ||
    filter.storefrontStatus !== DEFAULT_FILTER.storefrontStatus ||
    filter.category !== DEFAULT_FILTER.category ||
    filter.vendor !== DEFAULT_FILTER.vendor ||
    filter.issue !== DEFAULT_FILTER.issue;

  function getRowClassName(product: CatalogProduct): string {
    if (product.cscartProductId === expandedProductId) {
      return 'bg-slate-700/20 border-l-2 border-l-blue-500';
    }
    if (product.storefrontStatus === 'UNREACHABLE') {
      return 'bg-red-900/10 border-l-2 border-l-red-500';
    }
    const margin = computeMarginPercent(product.currentPrice, product.costPrice);
    if (margin !== null && margin < 0) {
      return 'bg-red-900/10 border-l-2 border-l-red-500';
    }
    const issues = computeProductIssues(product, issueContext);
    if (issues.length > 0) {
      return 'border-l-2 border-l-amber-500/50';
    }
    return '';
  }

  if ((productsLoading || summaryLoading) && !productPage) {
    return (
      <div className="space-y-3 h-full flex flex-col animate-pulse">
        <Skeleton className="h-5 w-72 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex-1">
          <div className="h-8 bg-slate-900 border-b border-slate-700" />
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 border-t border-slate-700/30">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filterUI = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 pl-8 pr-3 py-1.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <SearchableCombobox
          options={STOREFRONT_STATUS_OPTIONS}
          value={filter.storefrontStatus}
          onChange={(v) => setFilter({ storefrontStatus: v })}
          placeholder="All Statuses"
        />

        <SearchableCombobox
          options={categoryOptions}
          value={filter.category ? String(filter.category) : ''}
          onChange={(v) => setFilter({ category: v ? Number(v) : '' })}
          placeholder="All Categories"
        />

        <SearchableCombobox
          options={vendorOptions}
          value={filter.vendor ? String(filter.vendor) : ''}
          onChange={(v) => setFilter({ vendor: v ? Number(v) : '' })}
          placeholder="All Vendors"
        />

        <span className="text-xs text-slate-500">{totalItems.toLocaleString()} products</span>

        {hasActiveFilters && (
          <button
            type="button"
            className="ml-auto flex items-center gap-1 bg-slate-700 text-slate-300 border border-slate-600 rounded-lg px-2.5 py-1 text-xs hover:bg-slate-600 transition-colors"
            onClick={clearAllFilters}
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {filter.issue && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter({ issue: '' })}
            className="flex items-center gap-1 bg-amber-900/20 text-amber-300 border border-amber-800/50 rounded-full px-2 py-0.5 text-xs hover:bg-amber-900/40 transition-colors"
          >
            {ISSUE_REGISTRY[filter.issue as QualityIssue]?.label ?? filter.issue}
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  );

  const emptyContent = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Package size={48} className="text-slate-700 mb-2" />
      <p className="text-lg font-medium text-slate-400">No products found</p>
      <p className="text-sm text-slate-500">
        {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No products available.'}
      </p>
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="mt-2 text-amber-400 hover:text-amber-300 text-sm font-medium hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>{summary?.totalProducts?.toLocaleString() ?? '—'} products</span>
        {syncedAgo && (
          <>
            <span className="text-slate-600">&middot;</span>
            <span>Last synced {syncedAgo}</span>
          </>
        )}
      </div>

      <div
        className={`flex-1 min-h-0 flex flex-col transition-opacity duration-150 ${
          isFetching && !productsLoading ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <DataTable
          columns={columns}
          data={products}
          pageSize={Infinity}
          dense
          manualSorting
          onSortingChange={handleSortingChange}
          onRowClick={(p) => handleToggleExpand(p.cscartProductId)}
          enableColumnResizing
          enableColumnVisibility={true}
          filterComponent={filterUI}
          emptyIcon={emptyContent}
          emptyMessage=""
          getRowClassName={getRowClassName}
          isRowExpanded={(p) => p.cscartProductId === expandedProductId}
          getRowKey={(p) => p.cscartProductId}
          renderExpandedRow={(product) => (
            <ProductHealthReport
              product={product}
              categories={categories}
              vendors={vendors}
              issueContext={issueContext}
            />
          )}
          initialColumnVisibility={HIDDEN_COLUMNS}
          stickyColumns={3}
          columnSizingStorageKey="inventory-columns"
        />
      </div>

      {totalItems > 0 && (
        <PaginationBar
          page={filter.page}
          pageSize={filter.pageSize}
          totalItems={totalItems}
          isFetching={isFetching}
          onPageChange={(page) => setFilter({ page })}
          onPageSizeChange={(pageSize) => setFilter({ pageSize, page: 1 })}
        />
      )}
    </div>
  );
}
