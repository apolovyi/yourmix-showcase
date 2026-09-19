import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMultiSupplierProducts } from '@/hooks/queries';
import { Skeleton, ErrorBanner } from '@/components/ui';
import type { MultiSupplierProduct } from '@/types';

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return `R ${value.toFixed(2)}`;
}

function getCheapestSupplier(product: MultiSupplierProduct): string | null {
  if (product.quotes.length === 0) return null;
  return product.quotes.reduce((min, q) => (q.costPrice < min.costPrice ? q : min)).supplierName;
}

export function SupplierComparison(): ReactElement {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useMultiSupplierProducts(page);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBanner
        title="Failed to load comparison data"
        message={error?.message ?? 'Could not retrieve multi-supplier products.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const products = data?.content ?? [];

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <Package size={40} className="text-slate-700 mb-3" />
        <p className="text-slate-400 font-medium">No multi-supplier products</p>
        <p className="text-sm text-slate-500 mt-1">
          Products quoted by multiple suppliers will appear here for comparison
        </p>
      </div>
    );
  }

  const supplierNames = [
    ...new Set(products.flatMap((p) => p.quotes.map((q) => q.supplierName))),
  ].sort();

  return (
    <div>
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/80">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Product
              </th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Current Price
              </th>
              {supplierNames.map((name) => (
                <th
                  key={name}
                  className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {products.map((product) => {
              const cheapest = getCheapestSupplier(product);
              return (
                <tr
                  key={product.cscartProductId}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-200 font-medium">
                    {product.productName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 text-right">
                    {formatCurrency(product.currentPrice)}
                  </td>
                  {supplierNames.map((supplierName) => {
                    const quote = product.quotes.find((q) => q.supplierName === supplierName);
                    const isCheapest = quote && supplierName === cheapest;
                    return (
                      <td
                        key={supplierName}
                        className={`px-4 py-3 text-sm text-right ${
                          isCheapest
                            ? 'bg-emerald-900/20 text-emerald-300 font-semibold'
                            : 'text-slate-300'
                        }`}
                      >
                        {quote ? (
                          <button
                            type="button"
                            className="hover:underline cursor-pointer"
                            onClick={() => navigate(`/pricing/proposals/${quote.proposalId}`)}
                          >
                            {formatCurrency(quote.costPrice)}
                          </button>
                        ) : (
                          <span className="text-slate-600">{'\u2014'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page + 1} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
