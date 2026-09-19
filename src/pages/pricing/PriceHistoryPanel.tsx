import { useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { History } from 'lucide-react';
import { Skeleton, Badge } from '@/components/ui';
import { useProductPriceHistory } from '@/hooks/queries';
import type { UpdateStatus } from '@/types';
import { formatDate } from '@/utils/date';

type BadgeColor = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'orange';

const UPDATE_STATUS_BADGE: Record<UpdateStatus, { color: BadgeColor; label: string }> = {
  PENDING: { color: 'slate', label: 'Pending' },
  PROCESSING: { color: 'blue', label: 'Processing' },
  APPLIED: { color: 'green', label: 'Applied' },
  FAILED: { color: 'red', label: 'Failed' },
  SKIPPED: { color: 'slate', label: 'Skipped' },
  REVERTED: { color: 'amber', label: 'Reverted' },
  REVERT_FAILED: { color: 'red', label: 'Revert Failed' },
};

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return `P${value.toFixed(2)}`;
}

function formatPct(value: number | null | undefined): ReactElement | null {
  if (value == null) return <span className="text-slate-500">{'\u2014'}</span>;
  const color = value > 0 ? 'text-amber-400' : value < 0 ? 'text-blue-400' : 'text-slate-400';
  return (
    <span className={color}>
      {value > 0 ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

interface PriceHistoryPanelProps {
  cscartProductId: number;
  productName: string;
}

export function PriceHistoryPanel({
  cscartProductId,
  productName,
}: PriceHistoryPanelProps): ReactElement {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useProductPriceHistory(cscartProductId, page);

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 -mt-1 space-y-2">
        <Skeleton className="h-4 rounded w-full" />
        <Skeleton className="h-4 rounded w-3/4" />
        <Skeleton className="h-4 rounded w-1/2" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 -mt-1">
        <p className="text-red-400 text-sm">Failed to load price history</p>
      </div>
    );
  }

  if (!data || !data.content?.length) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 -mt-1">
        <p className="text-slate-500 italic text-sm">No price history for this product</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 -mt-1">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">{productName}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 uppercase border-b border-slate-700/50">
              <th className="text-left py-2 pr-3 font-medium">Date</th>
              <th className="text-left py-2 pr-3 font-medium">Supplier</th>
              <th className="text-right py-2 pr-3 font-medium">Old Price</th>
              <th className="text-right py-2 pr-3 font-medium">New Price</th>
              <th className="text-right py-2 pr-3 font-medium">Change</th>
              <th className="text-right py-2 pr-3 font-medium">Margin</th>
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Approved By</th>
            </tr>
          </thead>
          <tbody>
            {(data.content ?? []).map((entry) => {
              const statusBadge = UPDATE_STATUS_BADGE[entry.updateStatus];
              return (
                <tr
                  key={`${entry.proposalId}-${entry.proposalDate}`}
                  className="text-xs text-slate-300 hover:bg-slate-800/50 border-b border-slate-700/30 last:border-0"
                >
                  <td className="py-2 pr-3">
                    <Link
                      to={`/pricing/proposals/${entry.proposalId}`}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      {formatDate(entry.proposalDate)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{entry.supplierName ?? '\u2014'}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(entry.previousPrice)}</td>
                  <td className="py-2 pr-3 text-right font-medium">
                    {formatCurrency(entry.newPrice)}
                  </td>
                  <td className="py-2 pr-3 text-right">{formatPct(entry.changePct)}</td>
                  <td className="py-2 pr-3 text-right">
                    {entry.marginPct != null ? `${entry.marginPct.toFixed(1)}%` : '\u2014'}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
                  </td>
                  <td className="py-2 text-slate-400">{'\u2014'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(data.totalPages ?? 0) > page + 1 && (
        <button
          type="button"
          className="text-xs text-amber-400 hover:text-amber-300 mt-3"
          onClick={() => setPage((p) => p + 1)}
        >
          Load more
        </button>
      )}
    </div>
  );
}
