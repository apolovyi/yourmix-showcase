import { useEffect, useState, useMemo, type ReactElement } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeft,
  AlertTriangle,
  Link2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  DollarSign,
  Package,
  CheckCircle2,
  Flag,
  Unlink,
  XCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import type { ProposalItem, ProposalStatus, ReviewReason, OverrideReason } from '@/types';
import {
  useProposal,
  useProposalItems,
  useApproveProposal,
  useRejectProposal,
  useApproveItem,
  useRejectItem,
  useOverridePrice,
  useMapItem,
  useRevertProposal,
} from '@/hooks/queries';
import { DataTable, Badge, LoadingSpinner, ErrorBanner } from '@/components/ui';
import { ConfirmDialog } from '@/pages/pricing/ConfirmDialog';
import { formatDate } from '@/utils/date';

type BadgeColor = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'orange';

const STATUS_BADGE: Record<ProposalStatus, { color: BadgeColor; label: string }> = {
  DRAFT: { color: 'slate', label: 'Draft' },
  PENDING_REVIEW: { color: 'amber', label: 'Pending Review' },
  APPROVED: { color: 'blue', label: 'Approved' },
  APPLYING: { color: 'blue', label: 'Applying' },
  APPLIED: { color: 'green', label: 'Applied' },
  PARTIALLY_APPLIED: { color: 'orange', label: 'Partial' },
  REJECTED: { color: 'red', label: 'Rejected' },
  REVERTED: { color: 'slate', label: 'Reverted' },
  PARTIALLY_REVERTED: { color: 'orange', label: 'Partially Reverted' },
};

type UpdateStatusBadgeType =
  | 'PENDING'
  | 'SENT'
  | 'APPLIED'
  | 'FAILED'
  | 'REVERTED'
  | 'REVERT_FAILED';

const UPDATE_STATUS_BADGE: Record<UpdateStatusBadgeType, { color: BadgeColor; label: string }> = {
  PENDING: { color: 'slate', label: 'Pending' },
  SENT: { color: 'blue', label: 'Sent' },
  APPLIED: { color: 'green', label: 'Applied' },
  FAILED: { color: 'red', label: 'Failed' },
  REVERTED: { color: 'slate', label: 'Reverted' },
  REVERT_FAILED: { color: 'red', label: 'Revert Failed' },
};

const REVIEW_REASON_LABEL: Record<ReviewReason, { label: string; icon: ReactElement }> = {
  UNMATCHED: { label: 'Unmatched Product', icon: <Unlink size={14} className="text-red-400" /> },
  LARGE_INCREASE: {
    label: 'Large Price Increase',
    icon: <TrendingUp size={14} className="text-amber-400" />,
  },
  LARGE_DECREASE: {
    label: 'Large Price Decrease',
    icon: <TrendingDown size={14} className="text-blue-400" />,
  },
  NEGATIVE_MARGIN: {
    label: 'Negative Margin',
    icon: <AlertTriangle size={14} className="text-red-400" />,
  },
  MISSING_COST: {
    label: 'Missing Cost',
    icon: <AlertTriangle size={14} className="text-slate-400" />,
  },
};

const OVERRIDE_OPTIONS: { value: OverrideReason; label: string }[] = [
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'COMPETITOR_MATCH', label: 'Competitor Match' },
  { value: 'CLEARANCE', label: 'Clearance' },
  { value: 'SPECIAL_DEAL', label: 'Special Deal' },
  { value: 'CORRECTION', label: 'Correction' },
];

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `P${amount.toFixed(2)}`;
}

// --- Needs Attention: Unmatched Item Card ---

function UnmatchedItemCard({
  item,
  proposalId,
}: {
  item: ProposalItem;
  proposalId: string;
}): ReactElement {
  const [productIdInput, setProductIdInput] = useState('');
  const mapMutation = useMapItem();
  const rejectMutation = useRejectItem();

  const handleMap = (): void => {
    const id = parseInt(productIdInput, 10);
    if (isNaN(id) || id <= 0) return;
    mapMutation.mutate({ proposalId, itemId: item.id, cscartProductId: id });
  };

  const handleSkip = (): void => {
    rejectMutation.mutate({ proposalId, itemId: item.id });
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200">{item.supplierProductName}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="font-mono">{item.supplierCode}</span>
            {item.packing && <span>{item.packing}</span>}
            {item.category && <span>{item.category}</span>}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Cost: {formatCurrency(item.costPrice)} &rarr; Proposed:{' '}
            {formatCurrency(item.proposedPrice)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          type="number"
          placeholder="CS-Cart Product ID"
          value={productIdInput}
          onChange={(e) => setProductIdInput(e.target.value)}
          className="w-48 bg-slate-800 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
        <button
          onClick={handleMap}
          disabled={!productIdInput || mapMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Link2 size={12} />
          {mapMutation.isPending ? 'Mapping...' : 'Map'}
        </button>
        <button
          onClick={handleSkip}
          disabled={rejectMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-600 disabled:opacity-40"
        >
          <X size={12} />
          Skip
        </button>
      </div>
      {mapMutation.isError && (
        <p className="text-xs text-red-400 mt-2">{mapMutation.error.message}</p>
      )}
    </div>
  );
}

// --- Needs Attention: Flagged Item Card ---

function FlaggedItemCard({
  item,
  proposalId,
}: {
  item: ProposalItem;
  proposalId: string;
}): ReactElement {
  const [showOverride, setShowOverride] = useState(false);
  const [overridePrice, setOverridePrice] = useState('');
  const [overrideReason, setOverrideReason] = useState<OverrideReason | ''>('');

  const approveMutation = useApproveItem();
  const rejectMutation = useRejectItem();
  const overrideMutation = useOverridePrice();

  const handleApprove = (): void => {
    approveMutation.mutate({ proposalId, itemId: item.id });
  };

  const handleReject = (): void => {
    rejectMutation.mutate({ proposalId, itemId: item.id });
  };

  const handleOverride = (): void => {
    const price = parseFloat(overridePrice);
    if (isNaN(price) || price <= 0 || !overrideReason) return;
    overrideMutation.mutate(
      { proposalId, itemId: item.id, price, reason: overrideReason },
      {
        onSuccess: () => {
          setShowOverride(false);
        },
      },
    );
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-200">{item.supplierProductName}</p>
            {item.cscartProductName && item.cscartProductName !== item.supplierProductName && (
              <span className="text-xs text-slate-500">({item.cscartProductName})</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="font-mono">{item.supplierCode}</span>
            {item.category && <span>{item.category}</span>}
          </div>
        </div>
      </div>

      {/* Price comparison */}
      <div className="flex items-center gap-6 mt-3 text-sm">
        <div>
          <span className="text-slate-500 text-xs">Current</span>
          <p className="text-slate-300 font-medium">{formatCurrency(item.currentPrice)}</p>
        </div>
        <span className="text-slate-600">&rarr;</span>
        <div>
          <span className="text-slate-500 text-xs">Proposed</span>
          <p className="text-slate-200 font-medium">{formatCurrency(item.proposedPrice)}</p>
        </div>
        {item.changePct != null && (
          <div>
            <span className="text-slate-500 text-xs">Change</span>
            <p className={`font-bold ${item.changePct > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
              {item.changePct > 0 ? '+' : ''}
              {item.changePct.toFixed(1)}%
            </p>
          </div>
        )}
        {item.marginPct != null && (
          <div>
            <span className="text-slate-500 text-xs">Margin</span>
            <p className="text-slate-300">{item.marginPct}%</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleApprove}
          disabled={approveMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
        >
          <Check size={12} />
          Accept
        </button>
        <button
          onClick={() => setShowOverride(!showOverride)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-medium transition-colors"
        >
          <DollarSign size={12} />
          Override
        </button>
        <button
          onClick={handleReject}
          disabled={rejectMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-600 disabled:opacity-40"
        >
          <X size={12} />
          Reject
        </button>
      </div>

      {/* Override form */}
      {showOverride && (
        <div className="mt-3 p-3 bg-slate-800 border border-slate-600 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Custom Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                className="w-32 bg-slate-900 border border-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason</label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value as OverrideReason | '')}
                className="bg-slate-900 border border-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">Select reason...</option>
                {OVERRIDE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOverride}
              disabled={!overridePrice || !overrideReason || overrideMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={12} />
              {overrideMutation.isPending ? 'Saving...' : 'Save Override'}
            </button>
            <button
              onClick={() => setShowOverride(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
          {overrideMutation.isError && (
            <p className="text-xs text-red-400">{overrideMutation.error.message}</p>
          )}
        </div>
      )}

      {(approveMutation.isError || rejectMutation.isError) && (
        <p className="text-xs text-red-400 mt-2">
          {approveMutation.error?.message ?? rejectMutation.error?.message}
        </p>
      )}
    </div>
  );
}

// --- Main Component ---

export function ProposalReview(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAttention, setShowAttention] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedReason, setFocusedReason] = useState<ReviewReason | null>(null);
  const [focusedSupplier, setFocusedSupplier] = useState<string | null>(null);

  const { data: proposal, isLoading: proposalLoading, isError: proposalError } = useProposal(id);
  const { data: items = [], isLoading: itemsLoading, isError: itemsError } = useProposalItems(id);

  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();
  const revertMutation = useRevertProposal();
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  const needsAttention = useMemo(() => items.filter((i) => i.requiresReview), [items]);
  const readyItems = useMemo(() => items.filter((i) => !i.requiresReview), [items]);

  const filteredReadyItems = useMemo(() => {
    if (!searchTerm.trim()) return readyItems;
    const term = searchTerm.toLowerCase();
    return readyItems.filter(
      (i) =>
        (i.supplierProductName?.toLowerCase().includes(term) ?? false) ||
        i.supplierCode.toLowerCase().includes(term) ||
        (i.cscartProductName?.toLowerCase().includes(term) ?? false) ||
        (i.category?.toLowerCase().includes(term) ?? false),
    );
  }, [readyItems, searchTerm]);

  // Group needs-attention items by reason
  const grouped = useMemo(() => {
    const groups: Record<string, ProposalItem[]> = {};
    for (const item of needsAttention) {
      const key = item.reviewReason ?? 'OTHER';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [needsAttention]);

  const reasonCounts = useMemo((): { reason: ReviewReason; count: number }[] => {
    const entries = Object.entries(grouped) as [ReviewReason, ProposalItem[]][];
    return entries.map(([reason, items]) => ({ reason, count: items.length }));
  }, [grouped]);

  const reasonFilteredItems = useMemo(
    () => (focusedReason ? (grouped[focusedReason] ?? []) : needsAttention),
    [focusedReason, grouped, needsAttention],
  );

  const supplierCounts = useMemo((): { supplier: string; count: number }[] => {
    const counts: Record<string, number> = {};
    for (const item of reasonFilteredItems) {
      const name = item.supplierName ?? 'Unknown supplier';
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([supplier, count]) => ({ supplier, count }))
      .sort((a, b) => b.count - a.count || a.supplier.localeCompare(b.supplier));
  }, [reasonFilteredItems]);

  useEffect(() => {
    if (focusedSupplier && !supplierCounts.some(({ supplier }) => supplier === focusedSupplier)) {
      setFocusedSupplier(null);
    }
  }, [focusedSupplier, supplierCounts]);

  const unmatchedAttentionCount = grouped.UNMATCHED?.length ?? 0;

  const filteredGrouped = useMemo(() => {
    let result = grouped;
    if (focusedReason) {
      const reasonItems = grouped[focusedReason];
      result = reasonItems ? { [focusedReason]: reasonItems } : {};
    }
    if (!focusedSupplier) return result;
    const filtered: Record<string, ProposalItem[]> = {};
    for (const [reason, grpItems] of Object.entries(result)) {
      const matching = grpItems.filter(
        (i) => (i.supplierName ?? 'Unknown supplier') === focusedSupplier,
      );
      if (matching.length > 0) filtered[reason] = matching;
    }
    return filtered;
  }, [grouped, focusedReason, focusedSupplier]);

  const largestAttentionChange = useMemo(() => {
    return needsAttention.reduce<ProposalItem | null>((largest, item) => {
      if (item.changePct == null) return largest;
      if (!largest || Math.abs(item.changePct) > Math.abs(largest.changePct ?? 0)) {
        return item;
      }
      return largest;
    }, null);
  }, [needsAttention]);

  const totalPriceImpact = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.currentPrice != null) {
        return sum + (item.proposedPrice - item.currentPrice);
      }
      return sum;
    }, 0);
  }, [items]);

  const autoApprovedCount = items.filter((i) => i.approvalStatus === 'AUTO_APPROVED').length;

  const hasAnyCurrentPrice = useMemo(
    () => readyItems.some((i) => i.currentPrice != null),
    [readyItems],
  );

  const readyColumns = useMemo((): ColumnDef<ProposalItem, unknown>[] => {
    const helper = createColumnHelper<ProposalItem>();
    const cols: ColumnDef<ProposalItem, unknown>[] = [
      helper.accessor('cscartProductName', {
        header: 'Product',
        cell: (info) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {info.getValue() ?? info.row.original.supplierProductName}
            </p>
            <p className="text-xs text-slate-500 font-mono">{info.row.original.supplierCode}</p>
          </div>
        ),
      }) as ColumnDef<ProposalItem, unknown>,
    ];

    if (hasAnyCurrentPrice) {
      cols.push(
        helper.accessor('currentPrice', {
          header: 'Current',
          meta: { align: 'right' },
          cell: (info) => (
            <span className="text-slate-400 text-sm text-right block">
              {formatCurrency(info.getValue())}
            </span>
          ),
        }) as ColumnDef<ProposalItem, unknown>,
      );
    }

    cols.push(
      helper.accessor('costPrice', {
        header: 'Cost',
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-slate-500 text-sm text-right block">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }) as ColumnDef<ProposalItem, unknown>,
      helper.accessor('proposedPrice', {
        header: 'Proposed',
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-slate-200 font-medium text-sm text-right block">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }) as ColumnDef<ProposalItem, unknown>,
    );

    if (hasAnyCurrentPrice) {
      cols.push(
        helper.accessor('changePct', {
          header: 'Change',
          meta: { align: 'right' },
          cell: (info) => {
            const val = info.getValue();
            if (val == null) return <span className="text-slate-500 text-sm">—</span>;
            return (
              <span
                className={`text-sm font-medium text-right block ${val > 0 ? 'text-amber-400' : 'text-blue-400'}`}
              >
                {val > 0 ? '+' : ''}
                {val.toFixed(1)}%
              </span>
            );
          },
        }) as ColumnDef<ProposalItem, unknown>,
      );
    }

    cols.push(
      helper.accessor('updateStatus', {
        header: 'Update',
        cell: (info) => {
          const status = info.getValue();
          if (!status) return <span className="text-slate-600 text-xs">&mdash;</span>;
          const ubadge = UPDATE_STATUS_BADGE[status as UpdateStatusBadgeType];
          if (!ubadge) return <span className="text-slate-500 text-xs">{status}</span>;
          return (
            <div className="space-y-0.5">
              <Badge color={ubadge.color}>{ubadge.label}</Badge>
              {info.row.original.errorMessage && (
                <p
                  className="text-red-400 text-xs truncate max-w-[120px]"
                  title={info.row.original.errorMessage}
                >
                  {info.row.original.errorMessage}
                </p>
              )}
              {info.row.original.appliedAt && (
                <p className="text-slate-500 text-xs">{formatDate(info.row.original.appliedAt)}</p>
              )}
            </div>
          );
        },
      }) as ColumnDef<ProposalItem, unknown>,
      helper.display({
        id: 'expand',
        header: '',
        enableSorting: false,
        cell: (info) => (
          <div className="text-right">
            {expandedItemId === info.row.original.id ? (
              <ChevronUp size={16} className="text-blue-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-500" />
            )}
          </div>
        ),
      }),
    );

    return cols;
  }, [hasAnyCurrentPrice, expandedItemId]);

  if (proposalLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (proposalError || itemsError || !proposal) {
    return <ErrorBanner message="Failed to load proposal" />;
  }

  const badge = STATUS_BADGE[proposal.status];
  const manualReviewShare = Math.round(
    (needsAttention.length / Math.max(proposal.totalItems ?? items.length, 1)) * 100,
  );
  const focusedReasonLabel = focusedReason
    ? (REVIEW_REASON_LABEL[focusedReason]?.label ?? focusedReason)
    : 'All reasons';

  const handleApprove = (): void => {
    approveMutation.mutate(proposal.id, {
      onSuccess: () => navigate('/pricing'),
    });
  };

  const handleReject = (): void => {
    rejectMutation.mutate(proposal.id, {
      onSuccess: () => navigate('/pricing'),
    });
  };

  const handleRevert = (): void => {
    revertMutation.mutate(proposal.id, {
      onSuccess: () => setShowRevertConfirm(false),
    });
  };

  const handleRowClick = (item: ProposalItem): void => {
    setExpandedItemId(expandedItemId === item.id ? null : item.id);
  };

  const searchFilter = (
    <div className="relative w-full md:w-96">
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
        size={18}
      />
      <input
        type="text"
        placeholder="Search products..."
        className="w-full bg-slate-800 border border-slate-700 text-slate-100 pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Pricing
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-100">
              {proposal.supplierFileName?.trim() ||
                proposal.supplierName?.trim() ||
                'Untitled Proposal'}
            </h2>
            <Badge color={badge.color}>{badge.label}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            {proposal.supplierName?.trim() &&
              proposal.supplierName.trim() !== (proposal.supplierFileName?.trim() || '') && (
                <span>{proposal.supplierName}</span>
              )}
            <span>{formatDate(proposal.createdAt)}</span>
            {proposal.reviewedBy && <span>Reviewed by {proposal.reviewedBy}</span>}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {(() => {
        const isTerminal = [
          'APPLIED',
          'PARTIALLY_APPLIED',
          'REVERTED',
          'PARTIALLY_REVERTED',
        ].includes(proposal.status);
        return (
          <div
            className={`grid grid-cols-2 ${isTerminal ? 'md:grid-cols-6' : 'md:grid-cols-4'} gap-4`}
          >
            <StatCard
              label="Total Items"
              value={proposal.totalItems ?? 0}
              icon={<Package size={16} />}
              color="text-slate-400"
            />
            <StatCard
              label="Matched"
              value={proposal.matchedCount}
              icon={<CheckCircle2 size={16} />}
              color="text-emerald-400"
            />
            <StatCard
              label="Flagged"
              value={proposal.flaggedCount}
              icon={<Flag size={16} />}
              color="text-amber-400"
            />
            <StatCard
              label="Unmatched"
              value={proposal.unmatchedCount}
              icon={<Unlink size={16} />}
              color="text-red-400"
            />
            {isTerminal && (
              <>
                <StatCard
                  label="Applied"
                  value={proposal.appliedCount ?? 0}
                  icon={<CheckCircle2 size={16} />}
                  color="text-emerald-400"
                />
                {(proposal.failedCount ?? 0) > 0 && (
                  <StatCard
                    label="Failed"
                    value={proposal.failedCount ?? 0}
                    icon={<XCircle size={16} />}
                    color="text-red-400"
                  />
                )}
              </>
            )}
          </div>
        );
      })()}

      {needsAttention.length > 0 && (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-amber-800/30 bg-slate-800/80 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <AlertTriangle size={14} />
              Manual review queue
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100">{needsAttention.length} items</p>
            <p className="mt-1 text-sm text-slate-400">
              {manualReviewShare}% of this proposal still needs manual review before approval.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
              <Unlink size={14} />
              Mapping required
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100">
              {unmatchedAttentionCount} items
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Unmatched supplier rows still need a manual product mapping.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              <TrendingUp size={14} />
              Review focus
            </div>
            <p className="mt-2 text-lg font-bold text-slate-100">{focusedReasonLabel}</p>
            <p className="mt-1 text-sm text-slate-400">
              {largestAttentionChange?.changePct != null
                ? `${largestAttentionChange.changePct > 0 ? '+' : ''}${largestAttentionChange.changePct.toFixed(1)}% is the largest supplier-file move still waiting on manual review.`
                : 'Use the reason filters below to work through the manual review queue.'}
            </p>
          </div>
        </section>
      )}

      {/* Needs Attention Section */}
      {needsAttention.length > 0 && (
        <section className="bg-slate-800 rounded-xl border border-amber-800/30 overflow-hidden">
          <button
            onClick={() => setShowAttention(!showAttention)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-sm font-bold text-slate-200">
                Needs Attention ({needsAttention.length})
              </span>
            </div>
            {showAttention ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </button>

          {showAttention && (
            <div className="px-5 pb-5 space-y-4">
              {/* Manual review guidance */}
              <p className="text-xs text-slate-500">
                These items require manual review before the proposal can be applied. Counts are
                based on supplier file data only — no live store verification has been performed.
              </p>

              {/* Reason filter chips */}
              {reasonCounts.length > 1 && (
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Filter by review reason"
                >
                  <button
                    onClick={() => setFocusedReason(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      focusedReason === null
                        ? 'bg-amber-600 text-slate-900'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    aria-pressed={focusedReason === null}
                  >
                    All ({needsAttention.length})
                  </button>
                  {reasonCounts.map(({ reason, count }) => {
                    const info = REVIEW_REASON_LABEL[reason];
                    return (
                      <button
                        key={reason}
                        onClick={() => setFocusedReason(focusedReason === reason ? null : reason)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          focusedReason === reason
                            ? 'bg-amber-600 text-slate-900'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                        aria-pressed={focusedReason === reason}
                      >
                        {info?.icon}
                        {info?.label ?? reason} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Supplier filter chips */}
              {supplierCounts.length > 1 && (
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Filter manual review by supplier"
                >
                  <span className="text-xs text-slate-500 mr-1">Supplier:</span>
                  <button
                    onClick={() => setFocusedSupplier(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      focusedSupplier === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    aria-pressed={focusedSupplier === null}
                  >
                    All suppliers ({reasonFilteredItems.length})
                  </button>
                  {supplierCounts.map(({ supplier, count }) => (
                    <button
                      key={supplier}
                      onClick={() =>
                        setFocusedSupplier(focusedSupplier === supplier ? null : supplier)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        focusedSupplier === supplier
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      aria-pressed={focusedSupplier === supplier}
                    >
                      {supplier} ({count})
                    </button>
                  ))}
                </div>
              )}

              {/* Grouped items */}
              <div className="space-y-6">
                {Object.entries(filteredGrouped).map(([reason, groupItems]) => {
                  const reasonInfo = REVIEW_REASON_LABEL[reason as ReviewReason];
                  return (
                    <div key={reason}>
                      <div className="flex items-center gap-2 mb-3">
                        {reasonInfo?.icon}
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {reasonInfo?.label ?? reason} ({groupItems.length})
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {groupItems.map((item) =>
                          reason === 'UNMATCHED' ? (
                            <UnmatchedItemCard key={item.id} item={item} proposalId={proposal.id} />
                          ) : (
                            <FlaggedItemCard key={item.id} item={item} proposalId={proposal.id} />
                          ),
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Ready to Apply Table */}
      {readyItems.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Ready to Apply ({readyItems.length})
          </h3>
          <DataTable
            columns={readyColumns}
            data={filteredReadyItems}
            pageSize={20}
            enableSorting={true}
            enableColumnVisibility={true}
            filterComponent={searchFilter}
            emptyMessage="No products match your search"
            onRowClick={handleRowClick}
            getRowKey={(row) => row.id}
            getRowClassName={(row) =>
              expandedItemId === row.id ? 'bg-slate-700/20 border-l-2 border-l-blue-500' : ''
            }
            isRowExpanded={(row) => expandedItemId === row.id}
            renderExpandedRow={(row) => (
              <div className="px-4 pb-4">
                <ExpandedItemDetail item={row} proposalId={proposal.id} />
              </div>
            )}
          />
        </section>
      )}

      {/* Approval Footer */}
      <footer className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-slate-400">
              <span className="font-semibold text-emerald-400">{autoApprovedCount}</span>{' '}
              auto-approved
            </span>
            <span className="text-slate-400">
              <span className="font-semibold text-amber-400">{proposal.flaggedCount}</span> flagged
            </span>
            <span className="text-slate-400">
              <span className="font-semibold text-red-400">{proposal.unmatchedCount}</span>{' '}
              unmatched
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Price impact:{' '}
              <span
                className={`font-bold ${totalPriceImpact >= 0 ? 'text-amber-400' : 'text-blue-400'}`}
              >
                {totalPriceImpact > 0 ? '+' : totalPriceImpact < 0 ? '-' : ''}P
                {Math.abs(totalPriceImpact).toFixed(2)}
              </span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {['APPLIED', 'PARTIALLY_APPLIED'].includes(proposal.status) ? (
              <button
                onClick={() => setShowRevertConfirm(true)}
                disabled={revertMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              >
                <RotateCcw size={16} />
                {revertMutation.isPending ? 'Reverting...' : 'Revert All Prices'}
              </button>
            ) : ['PENDING_REVIEW', 'DRAFT'].includes(proposal.status) ? (
              <>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-600 disabled:opacity-40"
                >
                  <X size={16} />
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject Proposal'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-900/20 disabled:opacity-40"
                >
                  <Check size={16} />
                  {approveMutation.isPending ? 'Approving...' : 'Approve & Apply'}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {(approveMutation.isError || rejectMutation.isError || revertMutation.isError) && (
          <div className="mt-3">
            <ErrorBanner
              message={
                approveMutation.error?.message ??
                rejectMutation.error?.message ??
                revertMutation.error?.message ??
                'Action failed'
              }
            />
          </div>
        )}
      </footer>

      {showRevertConfirm && (
        <ConfirmDialog
          title="Revert Proposal"
          message={`This will revert ${proposal.appliedCount ?? 0} applied price change${(proposal.appliedCount ?? 0) !== 1 ? 's' : ''} to their original values in CS-Cart. This action cannot be undone.`}
          confirmLabel="Revert Prices"
          confirmVariant="danger"
          isLoading={revertMutation.isPending}
          onConfirm={handleRevert}
          onCancel={() => setShowRevertConfirm(false)}
        />
      )}
    </div>
  );
}

// --- Helper Components ---

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: ReactElement;
  color: string;
}): ReactElement {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function ExpandedItemDetail({
  item,
  proposalId,
}: {
  item: ProposalItem | null;
  proposalId: string;
}): ReactElement | null {
  const [showOverride, setShowOverride] = useState(false);
  const [overridePrice, setOverridePrice] = useState('');
  const [overrideReason, setOverrideReason] = useState<OverrideReason | ''>('');
  const overrideMutation = useOverridePrice();
  const rejectMutation = useRejectItem();

  if (!item) return null;

  const handleOverride = (): void => {
    const price = parseFloat(overridePrice);
    if (isNaN(price) || price <= 0 || !overrideReason) return;
    overrideMutation.mutate(
      { proposalId, itemId: item.id, price, reason: overrideReason },
      { onSuccess: () => setShowOverride(false) },
    );
  };

  const handleReject = (): void => {
    rejectMutation.mutate({ proposalId, itemId: item.id });
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 -mt-1 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ChevronUp size={14} className="text-blue-400" />
        <span className="text-sm font-medium text-slate-300">
          {item.cscartProductName ?? item.supplierProductName}
        </span>
        {item.cscartProductId != null && (
          <span className="text-xs text-slate-500 font-mono">#{item.cscartProductId}</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-xs text-slate-500">Supplier</span>
          <p className="text-slate-300">{item.supplierName ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Category</span>
          <p className="text-slate-300">{item.category ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Packing</span>
          <p className="text-slate-300">{item.packing ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Barcode</span>
          <p className="text-slate-300 font-mono text-xs">{item.barcode ?? '—'}</p>
        </div>
      </div>

      {item.marginPct != null && (
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-sm">
          <span className="text-slate-500">Margin formula: </span>
          <span className="text-slate-300 font-mono text-xs">
            {formatCurrency(item.costPrice)} &times; (1 + {item.marginPct}
            /100) &times; 1.14 = {formatCurrency(item.proposedPrice)}
          </span>
        </div>
      )}

      {/* Failed status details */}
      {item.updateStatus === 'FAILED' && item.errorMessage && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-red-400">Update Failed</p>
          <p className="text-xs text-red-300">{item.errorMessage}</p>
          {item.updateAttempts > 0 && (
            <p className="text-xs text-red-400/70">
              Attempts: {item.updateAttempts}
              {item.lastAttemptAt && ` \u00B7 Last: ${formatDate(item.lastAttemptAt)}`}
            </p>
          )}
        </div>
      )}

      {/* Override details */}
      {item.overridePrice != null && (
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-amber-400">Price Override</p>
          <p className="text-xs text-amber-300">
            Override price: {formatCurrency(item.overridePrice)}
            {item.overrideReason && ` \u00B7 Reason: ${item.overrideReason}`}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => setShowOverride(!showOverride)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-medium transition-colors"
        >
          <DollarSign size={12} />
          Override Price
        </button>
        <button
          onClick={handleReject}
          disabled={rejectMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-600 disabled:opacity-40"
        >
          <X size={12} />
          Reject
        </button>
      </div>

      {showOverride && (
        <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Custom Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                className="w-32 bg-slate-900 border border-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason</label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value as OverrideReason | '')}
                className="bg-slate-900 border border-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">Select reason...</option>
                {OVERRIDE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOverride}
              disabled={!overridePrice || !overrideReason || overrideMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={12} />
              {overrideMutation.isPending ? 'Saving...' : 'Save Override'}
            </button>
            <button
              onClick={() => setShowOverride(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
