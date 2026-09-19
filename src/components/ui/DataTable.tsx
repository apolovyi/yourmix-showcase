import {
  Fragment,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
  type Key,
} from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
  type ColumnSizingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  pageSize?: number;
  enableSorting?: boolean;
  manualSorting?: boolean;
  onSortingChange?: (sorting: SortingState) => void;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: T[]) => void;
  onRowClick?: (row: T) => void;
  renderExpandedRow?: (row: T) => ReactNode;
  isRowExpanded?: (row: T) => boolean;
  getRowKey?: (row: T) => Key;
  filterComponent?: ReactNode;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  getRowClassName?: (row: T) => string;
  initialColumnVisibility?: VisibilityState;
  dense?: boolean;
  pageSizeOptions?: number[];
  enableColumnResizing?: boolean;
  stickyColumns?: number;
  columnSizingStorageKey?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages: (number | 'ellipsis')[] = [];
  const showStart = [0, 1];
  const showEnd = [totalPages - 2, totalPages - 1];
  const showMiddle = [currentPage - 1, currentPage, currentPage + 1];

  const all = new Set(
    [...showStart, ...showMiddle, ...showEnd].filter((p) => p >= 0 && p < totalPages),
  );
  const sorted = [...all].sort((a, b) => a - b);

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      pages.push('ellipsis');
    }
    pages.push(sorted[i]);
  }

  return pages;
}

function loadColumnSizing(key: string | undefined): ColumnSizingState {
  if (!key) return {};
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as ColumnSizingState) : {};
  } catch {
    return {};
  }
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 10,
  enableSorting = true,
  manualSorting = false,
  onSortingChange: onSortingChangeCallback,
  enableColumnVisibility = false,
  enableRowSelection = false,
  onRowSelectionChange,
  onRowClick,
  renderExpandedRow,
  isRowExpanded,
  getRowKey,
  filterComponent,
  emptyIcon,
  emptyMessage = 'No data',
  getRowClassName,
  initialColumnVisibility,
  dense = false,
  pageSizeOptions,
  enableColumnResizing = false,
  stickyColumns = 0,
  columnSizingStorageKey,
}: DataTableProps<T>): ReactElement {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility ?? {},
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadColumnSizing(columnSizingStorageKey),
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const noPagination = !isFinite(pageSize);

  // Auto-add checkbox column when row selection is enabled
  const allColumns = useMemo(() => {
    if (!enableRowSelection) return columns;
    const selectCol: ColumnDef<T, unknown> = {
      id: '_select',
      size: 36,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      header: ({ table: t }) => (
        <input
          type="checkbox"
          checked={t.getIsAllPageRowsSelected()}
          onChange={t.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800"
        />
      ),
    };
    return [selectCol, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnSizing,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      onSortingChangeCallback?.(newSorting);
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting && !manualSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: noPagination ? undefined : getPaginationRowModel(),
    enableRowSelection,
    enableSorting,
    manualSorting,
    enableColumnResizing,
    columnResizeMode: 'onChange' as const,
    initialState: {
      pagination: {
        pageSize: noPagination ? data.length : currentPageSize,
      },
    },
  });

  // Notify parent when selection changes
  useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, onRowSelectionChange, table]);

  useEffect(() => {
    if (!noPagination) {
      table.setPageSize(currentPageSize);
    }
  }, [currentPageSize, noPagination, table]);

  // Persist column sizing to localStorage
  useEffect(() => {
    if (!columnSizingStorageKey || Object.keys(columnSizing).length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(columnSizingStorageKey, JSON.stringify(columnSizing));
    }, 300);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columnSizing, columnSizingStorageKey]);

  // Track horizontal scroll for sticky shadow
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollLeft > 0);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || stickyColumns === 0) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [stickyColumns, handleScroll]);

  const rows = noPagination ? table.getRowModel().rows : table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;

  // Calculate sticky left offsets
  function getStickyStyle(
    colIndex: number,
    headers: { getSize: () => number }[],
  ): React.CSSProperties | undefined {
    if (stickyColumns === 0 || colIndex >= stickyColumns) return undefined;
    let left = 0;
    for (let i = 0; i < colIndex; i++) {
      left += headers[i].getSize();
    }
    return {
      position: 'sticky',
      left,
      zIndex: 5,
    };
  }

  function getStickyCellClass(colIndex: number): string {
    if (stickyColumns === 0 || colIndex >= stickyColumns) return '';
    const isLast = colIndex === stickyColumns - 1;
    return `bg-inherit ${isLast && isScrolled ? 'shadow-[2px_0_8px_-2px_rgba(0,0,0,0.3)]' : ''}`;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Toolbar */}
      {(filterComponent || enableColumnVisibility) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1">{filterComponent}</div>
          {enableColumnVisibility && (
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu((v) => !v)}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                title="Toggle columns"
              >
                <SlidersHorizontal size={18} />
              </button>
              {showColumnMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowColumnMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-30 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 min-w-[180px]">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Columns
                    </p>
                    {table.getAllLeafColumns().map((column) => {
                      if (!column.getCanHide()) return null;
                      return (
                        <label
                          key={column.id}
                          className="flex items-center gap-2 py-1.5 px-1 text-sm text-slate-300 hover:text-slate-100 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                            className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800"
                          />
                          {typeof column.columnDef.header === 'string'
                            ? column.columnDef.header
                            : column.id}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex-1 min-h-0 shadow-lg flex flex-col">
        <div ref={scrollContainerRef} className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 sticky top-0 z-10 text-xs uppercase text-slate-400 font-semibold tracking-wider">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, colIdx) => (
                    <th
                      key={header.id}
                      className={`${dense ? 'px-3 py-2' : 'p-4'} border-b border-slate-700 relative ${
                        header.column.getCanSort()
                          ? 'cursor-pointer select-none hover:text-slate-200 transition-colors'
                          : ''
                      } ${getStickyCellClass(colIdx)} bg-slate-900`}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                        ...getStickyStyle(colIdx, headerGroup.headers),
                      }}
                    >
                      <div
                        className={`flex items-center gap-1.5 ${
                          (header.column.columnDef.meta as Record<string, unknown>)?.align ===
                          'right'
                            ? 'justify-end'
                            : ''
                        }`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && (
                          <ChevronUp size={14} className="text-amber-500" />
                        )}
                        {header.column.getIsSorted() === 'desc' && (
                          <ChevronDown size={14} className="text-amber-500" />
                        )}
                      </div>
                      {enableColumnResizing && header.column.getCanResize() && (
                        <div
                          data-resize-handle
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${
                            header.column.getIsResizing()
                              ? 'bg-amber-500/50'
                              : 'bg-transparent hover:bg-slate-600'
                          }`}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rows.length > 0 ? (
                rows.map((row) => {
                  const expanded = isRowExpanded?.(row.original) ?? false;
                  const rowKey = getRowKey ? getRowKey(row.original) : row.id;
                  return (
                    <Fragment key={rowKey}>
                      <tr
                        className={`hover:bg-slate-700/30 transition-colors ${
                          onRowClick ? 'cursor-pointer' : ''
                        } ${getRowClassName ? getRowClassName(row.original) : ''}`}
                        onClick={() => onRowClick?.(row.original)}
                      >
                        {row.getVisibleCells().map((cell, colIdx) => (
                          <td
                            key={cell.id}
                            className={`${dense ? 'px-3 py-1.5' : 'p-4'} ${getStickyCellClass(colIdx)} bg-slate-800`}
                            style={getStickyStyle(
                              colIdx,
                              row
                                .getVisibleCells()
                                .map((c) => ({ getSize: () => c.column.getSize() })),
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {renderExpandedRow && (
                        <tr>
                          <td colSpan={row.getVisibleCells().length} className="p-0">
                            <div
                              className="grid transition-[grid-template-rows] duration-150 ease-out"
                              style={{
                                gridTemplateRows: expanded ? '1fr' : '0fr',
                              }}
                            >
                              <div className="overflow-hidden">
                                {expanded && renderExpandedRow(row.original)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="p-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      {emptyIcon}
                      <p className="text-lg font-medium text-slate-400">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!noPagination && totalRows > currentPageSize && (
          <div className="p-3 border-t border-slate-700 bg-slate-900/30 text-xs text-slate-500 flex justify-between items-center">
            <span>
              Showing {table.getState().pagination.pageIndex * currentPageSize + 1}–
              {Math.min((table.getState().pagination.pageIndex + 1) * currentPageSize, totalRows)}{' '}
              of {totalRows} results
              {pageSizeOptions && (
                <select
                  value={currentPageSize}
                  onChange={(e) => setCurrentPageSize(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded px-1.5 py-0.5 ml-2 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              )}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {getPageNumbers(table.getState().pagination.pageIndex, table.getPageCount()).map(
                (page, idx) =>
                  page === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-600">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => table.setPageIndex(page)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                        table.getState().pagination.pageIndex === page
                          ? 'bg-amber-600 text-white'
                          : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {page + 1}
                    </button>
                  ),
              )}
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
