import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { createColumnHelper, type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { useSearchParams } from 'react-router';
import type { CatalogProduct, ProductFilter } from '@/types';
import { Search, Package, X } from 'lucide-react';
import { useCatalogProducts } from '@/hooks/queries/useCatalogProducts';
import { useCatalogCategories } from '@/hooks/queries';
import { DataTable, Badge, LoadingSpinner, ErrorBanner } from '@/components/ui';
import { buildStorefrontUrl } from '@/utils/storefront-url';

type ProductStatus = 'ACTIVE' | 'HIDDEN' | 'DISABLED';
type IdentityStatus = 'MATCHED' | 'AMBIGUOUS' | 'UNMAPPED';

function StatusBadge({ status }: { status: ProductStatus }): ReactElement {
  const colorMap: Record<ProductStatus, 'green' | 'amber' | 'red'> = {
    ACTIVE: 'green',
    HIDDEN: 'amber',
    DISABLED: 'red',
  };
  return <Badge color={colorMap[status]}>{status}</Badge>;
}

function IdentityBadge({ status }: { status?: string | null }): ReactElement {
  const config: Record<string, { label: string; color: 'green' | 'amber' | 'slate' }> = {
    MATCHED: { label: 'Matched', color: 'green' },
    AMBIGUOUS: { label: 'Ambiguous', color: 'amber' },
    UNMAPPED: { label: 'Unmapped', color: 'slate' },
  };
  const c = config[status ?? ''] ?? config.UNMAPPED;
  return <Badge color={c.color}>{c.label}</Badge>;
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}yr ago`;
}

const columnHelper = createColumnHelper<CatalogProduct>();

const columns = [
  columnHelper.display({
    id: 'product',
    header: 'Product',
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.mainImageUrl ? (
          <img src={row.original.mainImageUrl} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 rounded bg-slate-700 flex items-center justify-center">
            <Package size={16} className="text-slate-500" />
          </div>
        )}
        <span className="font-medium text-slate-200 line-clamp-1">{row.original.name}</span>
      </div>
    ),
  }),
  columnHelper.accessor('sku', {
    header: 'SKU',
    cell: (info) => (
      <span className="text-slate-400 font-mono text-sm">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('identityStatus', {
    header: 'Identity',
    cell: (info) => <IdentityBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('currentPrice', {
    header: 'Price',
    cell: (info) => (
      <span className="font-medium text-slate-200 text-right block">
        P{info.getValue().toFixed(2)}
      </span>
    ),
  }),
  columnHelper.accessor('vendorName', {
    header: 'Vendor',
    cell: (info) => <span className="text-slate-300">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('costPrice', {
    header: 'Cost',
    cell: (info) => {
      const cost = info.getValue();
      return (
        <span className="text-slate-400 text-right block">
          {cost != null ? `P${cost.toFixed(2)}` : '—'}
        </span>
      );
    },
  }),
  columnHelper.accessor('storefrontStatus', {
    header: 'Storefront',
    cell: (info) => {
      const s = info.getValue();
      const colorMap: Record<string, 'green' | 'red' | 'amber' | 'slate'> = {
        REACHABLE: 'green',
        UNREACHABLE: 'red',
        HIDDEN: 'amber',
        DISABLED: 'slate',
      };
      return <Badge color={colorMap[s ?? ''] ?? 'slate'}>{s ?? '—'}</Badge>;
    },
  }),
  columnHelper.accessor('mainCategoryName', {
    header: 'Category',
    cell: (info) => <span className="text-slate-300">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: (info) => (
      <span className="text-slate-400 text-sm">{formatRelativeTime(info.getValue())}</span>
    ),
  }),
];

const INITIAL_COLUMN_VISIBILITY: VisibilityState = {
  costPrice: false,
  storefrontStatus: false,
  mainCategoryName: false,
  updatedAt: false,
};

export function Catalog(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearchTerm = searchParams.get('search') ?? '';
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);
  const [filterStatus, setFilterStatus] = useState<ProductStatus | ''>('ACTIVE');
  const [filterIdentityStatus, setFilterIdentityStatus] = useState<IdentityStatus | ''>('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearchTerm(urlSearchTerm);
    setPage(1);
  }, [urlSearchTerm]);

  function updateSearchParam(value: string): void {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value) {
      nextSearchParams.set('search', value);
    } else {
      nextSearchParams.delete('search');
    }
    setSearchParams(nextSearchParams, { replace: true });
  }

  const filter: ProductFilter = {
    page,
    pageSize: 20,
    ...(searchTerm && { search: searchTerm }),
    ...(filterStatus && { status: filterStatus }),
    ...(filterIdentityStatus && { identityStatus: filterIdentityStatus }),
    ...(priceMin && { priceMin: parseFloat(priceMin) }),
    ...(priceMax && { priceMax: parseFloat(priceMax) }),
  };

  const { data, isLoading, isError, error, refetch } = useCatalogProducts(filter);
  const { data: categories = [] } = useCatalogCategories();

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const totalItems = data?.totalItems ?? 0;
  const totalPages = data ? Math.ceil(data.totalItems / data.pageSize) : 0;

  const handleRowClick = (product: CatalogProduct): void => {
    const url = buildStorefrontUrl(product, categories);
    if (url) window.open(url, '_blank');
  };

  const getRowClassName = (product: CatalogProduct): string => {
    const url = buildStorefrontUrl(product, categories);
    return url ? '' : '!cursor-default';
  };

  const hasActiveFilters =
    searchTerm || filterStatus !== 'ACTIVE' || filterIdentityStatus || priceMin || priceMax;

  const filterUI = (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-100">Product Catalog</h2>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
            value={searchTerm}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchTerm(nextValue);
              setPage(1);
              updateSearchParam(nextValue);
            }}
          />
        </div>
        <select
          className="bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as ProductStatus | '');
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="HIDDEN">Hidden</option>
          <option value="DISABLED">Disabled</option>
        </select>
        <select
          className="bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          value={filterIdentityStatus}
          onChange={(e) => {
            setFilterIdentityStatus(e.target.value as IdentityStatus | '');
            setPage(1);
          }}
        >
          <option value="">All Identity</option>
          <option value="MATCHED">Matched</option>
          <option value="AMBIGUOUS">Ambiguous</option>
          <option value="UNMAPPED">Unmapped</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min Price"
            min="0"
            step="0.01"
            className="w-28 bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
            value={priceMin}
            onChange={(e) => {
              setPriceMin(e.target.value);
              setPage(1);
            }}
          />
          <span className="text-slate-500">—</span>
          <input
            type="number"
            placeholder="Max Price"
            min="0"
            step="0.01"
            className="w-28 bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
            value={priceMax}
            onChange={(e) => {
              setPriceMax(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('ACTIVE');
              setFilterIdentityStatus('');
              setPriceMin('');
              setPriceMax('');
              setPage(1);
              updateSearchParam('');
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {filterUI}
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {filterUI}
        <ErrorBanner
          message={error?.message ?? 'Failed to load products'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const emptyContent = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Package size={48} className="text-slate-700 mb-2" />
      <p className="text-lg font-medium text-slate-400">No products found</p>
      <p className="text-sm text-slate-500">
        {hasActiveFilters
          ? 'Try adjusting your search or filters.'
          : 'No catalog products available.'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <DataTable
        columns={columns as ColumnDef<CatalogProduct, unknown>[]}
        data={products}
        pageSize={Infinity}
        enableColumnVisibility={true}
        initialColumnVisibility={INITIAL_COLUMN_VISIBILITY}
        filterComponent={filterUI}
        onRowClick={handleRowClick}
        getRowClassName={getRowClassName}
        emptyIcon={emptyContent}
        emptyMessage=""
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} ({totalItems} products)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
