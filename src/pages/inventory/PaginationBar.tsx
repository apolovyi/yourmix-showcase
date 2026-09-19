import { type ReactElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  totalItems: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [];
  const show = new Set(
    [1, 2, currentPage - 1, currentPage, currentPage + 1, totalPages - 1, totalPages].filter(
      (p) => p >= 1 && p <= totalPages,
    ),
  );
  const sorted = [...show].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push('ellipsis');
    pages.push(sorted[i]);
  }
  return pages;
}

export function PaginationBar({
  page,
  pageSize,
  totalItems,
  isFetching,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps): ReactElement {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="p-3 border-t border-slate-700 bg-slate-900/30 text-xs text-slate-500 flex justify-between items-center rounded-b-xl">
      {/* Left: result range + page size */}
      <div className="flex items-center gap-2">
        <span>
          Showing {start.toLocaleString()}–{end.toLocaleString()} of {totalItems.toLocaleString()}{' '}
          products
        </span>
        <select
          value={pageSize}
          onChange={(e): void => onPageSizeChange(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Center: loading indicator */}
      {isFetching && <span className="text-xs text-amber-400 animate-pulse">Loading…</span>}

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={(): void => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>
        {getPageNumbers(page, totalPages).map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-slate-600">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={(): void => onPageChange(p)}
              className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                page === p
                  ? 'bg-amber-600 text-white'
                  : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={(): void => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
