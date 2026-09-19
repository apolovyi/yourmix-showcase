import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactElement,
  type DragEvent,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router';
import { PricingConfiguration } from '@/pages/pricing/PricingConfiguration';
import { SupplierComparison } from '@/pages/pricing/SupplierComparison';
import { PricingTierSummaryPanel } from '@/pages/pricing/PricingTierSummaryPanel';
import {
  Upload,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  ClipboardList,
  Link2,
  Flag,
  ShieldAlert,
} from 'lucide-react';
import type { Proposal, ProposalStatus, FileStatusResponse, FailureSummaryResponse } from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';
import {
  useProposals,
  useUploadFile,
  useFileStatus,
  useRecentUploads,
  useRetryFile,
  useFailureSummary,
} from '@/hooks/queries';
import { Card, Badge, LoadingSpinner, ErrorBanner } from '@/components/ui';
import { validateFile, formatFileSize } from '@/utils/fileValidation';

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

const ACTIVE_STATUSES: ProposalStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'APPLYING'];
const HISTORY_STATUSES: ProposalStatus[] = [
  'APPLIED',
  'PARTIALLY_APPLIED',
  'REJECTED',
  'REVERTED',
  'PARTIALLY_REVERTED',
];

function StatusIcon({ status }: { status: ProposalStatus }): ReactElement {
  switch (status) {
    case 'APPLIED':
      return <CheckCircle2 size={14} className="text-emerald-400" />;
    case 'PARTIALLY_APPLIED':
      return <AlertTriangle size={14} className="text-orange-400" />;
    case 'REJECTED':
      return <XCircle size={14} className="text-red-400" />;
    default:
      return <Clock size={14} className="text-slate-400" />;
  }
}

function FailedItemBlock({
  proposal,
  expanded,
  onToggle,
}: {
  proposal: Proposal;
  expanded: boolean;
  onToggle: () => void;
}): ReactElement | null {
  if (proposal.status !== 'PARTIALLY_APPLIED' || !proposal.failedItems?.length) return null;

  return (
    <div
      className="bg-red-900/20 border border-red-800/30 rounded-lg p-2.5 mt-2"
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onToggle} className="flex items-center gap-2 text-xs text-red-400 w-full">
        <AlertTriangle size={12} />
        <span>{proposal.failedItems.length} item(s) failed</span>
        {expanded ? (
          <ChevronUp size={12} className="ml-auto" />
        ) : (
          <ChevronDown size={12} className="ml-auto" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {proposal.failedItems.map((item) => (
            <div key={item.itemId}>
              <p className="text-xs text-slate-300">{item.productName ?? item.supplierCode}</p>
              {item.errorMessage && (
                <p className="text-xs text-red-400/70 truncate">{item.errorMessage}</p>
              )}
              <p className="text-xs text-slate-500">
                {item.updateAttempts} attempt{item.updateAttempts !== 1 ? 's' : ''}
                {item.lastAttemptAt && ` · Last: ${formatDate(item.lastAttemptAt)}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface WorkflowSnapshot {
  activeCount: number;
  matchCoveragePct: number;
  flaggedItemsTotal: number;
  failedItemsTotal: number;
}

function computeWorkflowSnapshot(
  proposals: Proposal[],
  failureSummary: FailureSummaryResponse | undefined,
): WorkflowSnapshot {
  const active = proposals.filter((p) => ACTIVE_STATUSES.includes(p.status));
  const activeCount = active.length;

  const allWithItems = proposals.filter((p) => (p.totalItems ?? 0) > 0);
  const matchCoveragePct =
    allWithItems.length > 0
      ? Math.round(
          (allWithItems.reduce((sum, p) => sum + p.matchedCount, 0) /
            allWithItems.reduce((sum, p) => sum + (p.totalItems ?? 0), 0)) *
            100,
        )
      : 0;

  const flaggedItemsTotal = active.reduce((sum, p) => sum + p.flaggedCount, 0);
  const failedItemsTotal = failureSummary?.totalFailedItems ?? 0;

  return { activeCount, matchCoveragePct, flaggedItemsTotal, failedItemsTotal };
}

function SnapshotCard({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: ReactElement;
  label: string;
  value: string;
  detail: string;
  accent: 'amber' | 'emerald' | 'red' | 'slate';
}): ReactElement {
  const accentMap = {
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    slate: 'text-slate-400',
  };

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-lg px-4 py-3 flex items-start gap-3 min-w-0">
      <div className={`mt-0.5 shrink-0 ${accentMap[accent]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold ${accentMap[accent]}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{detail}</p>
      </div>
    </div>
  );
}

function ProposalWorkflowSnapshot({
  proposals,
  failureSummary,
}: {
  proposals: Proposal[];
  failureSummary: FailureSummaryResponse | undefined;
}): ReactElement {
  const snapshot = computeWorkflowSnapshot(proposals, failureSummary);

  return (
    <section aria-label="Proposal workflow snapshot">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Proposal Workflow Snapshot
      </h3>
      <p className="text-xs text-slate-600 mb-3">
        Derived from loaded proposals — not a live ERP or storefront sync
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SnapshotCard
          icon={<ClipboardList size={16} />}
          label="Active"
          value={String(snapshot.activeCount)}
          detail={
            snapshot.activeCount === 1
              ? '1 proposal in progress'
              : `${snapshot.activeCount} proposals in progress`
          }
          accent="amber"
        />
        <SnapshotCard
          icon={<Link2 size={16} />}
          label="Match Coverage"
          value={`${snapshot.matchCoveragePct}%`}
          detail="Items matched to catalog across all proposals"
          accent="emerald"
        />
        <SnapshotCard
          icon={<Flag size={16} />}
          label="Review Exposure"
          value={String(snapshot.flaggedItemsTotal)}
          detail={
            snapshot.flaggedItemsTotal === 1
              ? '1 flagged item needing review'
              : `${snapshot.flaggedItemsTotal} flagged items needing review`
          }
          accent={snapshot.flaggedItemsTotal > 0 ? 'amber' : 'slate'}
        />
        <SnapshotCard
          icon={<ShieldAlert size={16} />}
          label="Apply Exceptions"
          value={String(snapshot.failedItemsTotal)}
          detail={
            snapshot.failedItemsTotal === 0
              ? 'No failed apply attempts'
              : `${snapshot.failedItemsTotal} item${snapshot.failedItemsTotal !== 1 ? 's' : ''} failed to apply`
          }
          accent={snapshot.failedItemsTotal > 0 ? 'red' : 'slate'}
        />
      </div>
    </section>
  );
}

export function PricingDashboard(): ReactElement {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedFailedId, setExpandedFailedId] = useState<string | null>(null);
  const [dismissedFileIds, setDismissedFileIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: failureSummary } = useFailureSummary();
  const historyRef = useRef<HTMLElement>(null);

  const {
    data: proposals,
    isLoading,
    isError,
    error,
    refetch,
  } = useProposals(debouncedSearch || undefined);

  const activeProposals = (proposals ?? []).filter((p) => ACTIVE_STATUSES.includes(p.status));
  const historyProposals = (proposals ?? []).filter((p) => HISTORY_STATUSES.includes(p.status));

  const { data: recentUploads } = useRecentUploads();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBanner
        message={error?.message ?? 'Failed to load proposals'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Pricing</h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload supplier files, review proposals, apply price changes
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-900/20"
        >
          <Upload size={16} />
          Upload File
        </button>
      </div>

      <ProposalWorkflowSnapshot proposals={proposals ?? []} failureSummary={failureSummary} />

      <PricingTierSummaryPanel />

      {/* Failure Alert */}
      {failureSummary && failureSummary.proposalsWithFailures > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">
            {failureSummary.totalFailedItems} item
            {failureSummary.totalFailedItems !== 1 ? 's' : ''} failed across{' '}
            {failureSummary.proposalsWithFailures} proposal
            {failureSummary.proposalsWithFailures !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            className="text-sm font-medium text-red-400 hover:text-red-300 ml-auto transition-colors"
            onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            View in History
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search by product name, supplier code..."
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 pl-10 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Recent Uploads */}
      {recentUploads && recentUploads.filter((f) => !dismissedFileIds.has(f.fileId)).length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Recent Uploads
          </h3>
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50">
            {recentUploads
              .filter((f) => !dismissedFileIds.has(f.fileId))
              .map((file) => (
                <RecentUploadRow
                  key={file.fileId}
                  file={file}
                  onDismiss={() => setDismissedFileIds((prev) => new Set([...prev, file.fileId]))}
                />
              ))}
          </div>
        </section>
      )}

      {/* Active Proposals */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Active Proposals
        </h3>
        {activeProposals.length === 0 ? (
          <Card hover={false} className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <FileSpreadsheet size={40} className="text-slate-700 mb-3" />
              <p className="text-slate-400 font-medium">No active proposals</p>
              <p className="text-sm text-slate-500 mt-1">
                Upload a supplier file to create a new proposal
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProposals.map((proposal) => {
              const badge = STATUS_BADGE[proposal.status];
              return (
                <Card key={proposal.id} className="p-5 cursor-pointer group" hover={true}>
                  <div
                    onClick={() => navigate(`/pricing/proposals/${proposal.id}`)}
                    className="space-y-3"
                  >
                    {/* Top row: status badge + date */}
                    <div className="flex items-center justify-between">
                      <Badge color={badge.color}>{badge.label}</Badge>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(proposal.createdAt)}
                      </span>
                    </div>

                    {/* File name */}
                    <div className="flex items-start gap-2.5">
                      <FileSpreadsheet size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {proposal.supplierFileName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{proposal.supplierName}</p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50">
                      <span className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">{proposal.totalItems}</span>{' '}
                        items
                      </span>
                      <span className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {proposal.matchedCount}
                        </span>{' '}
                        matched
                      </span>
                      {proposal.flaggedCount > 0 && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {proposal.flaggedCount} flagged
                        </span>
                      )}
                      {proposal.unmatchedCount > 0 && (
                        <span className="text-xs text-red-400">
                          {proposal.unmatchedCount} unmatched
                        </span>
                      )}
                    </div>

                    {/* Failed item summary */}
                    <FailedItemBlock
                      proposal={proposal}
                      expanded={expandedFailedId === proposal.id}
                      onToggle={() =>
                        setExpandedFailedId((prev) => (prev === proposal.id ? null : proposal.id))
                      }
                    />

                    {/* Arrow indicator */}
                    <div className="flex justify-end">
                      <ChevronRight
                        size={16}
                        className="text-slate-600 group-hover:text-slate-400 transition-colors"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      {historyProposals.length > 0 && (
        <section ref={historyRef}>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            History
          </h3>
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50">
            {historyProposals.map((proposal) => {
              const badge = STATUS_BADGE[proposal.status];
              return (
                <div
                  key={proposal.id}
                  onClick={() => navigate(`/pricing/proposals/${proposal.id}`)}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon status={proposal.status} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-300 truncate">{proposal.supplierFileName}</p>
                      <p className="text-xs text-slate-500">
                        {proposal.supplierName} &middot; {formatDateTime(proposal.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {proposal.status === 'APPLIED' && (
                      <span className="text-xs text-slate-500">
                        {proposal.appliedCount}/{proposal.totalItems} applied
                      </span>
                    )}
                    {proposal.status === 'PARTIALLY_APPLIED' && (
                      <span className="text-xs text-orange-400">
                        {proposal.appliedCount}/{proposal.totalItems} applied
                        {proposal.failedCount > 0 && ` · ${proposal.failedCount} failed`}
                      </span>
                    )}
                    {proposal.status === 'PARTIALLY_APPLIED' && proposal.failedItems?.length ? (
                      <FailedItemBlock
                        proposal={proposal}
                        expanded={expandedFailedId === proposal.id}
                        onToggle={() =>
                          setExpandedFailedId((prev) => (prev === proposal.id ? null : proposal.id))
                        }
                      />
                    ) : null}
                    <Badge color={badge.color}>{badge.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upload Modal */}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}

function friendlyError(raw: string | null | undefined): string {
  if (!raw) return 'Processing failed';
  if (raw.includes('timed out')) return 'File processing took too long';
  if (raw.includes('Unsupported supplier format')) return 'Unrecognized file format';
  return 'Processing failed';
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return 'yesterday';
}

function RecentUploadRow({
  file,
  onDismiss,
}: {
  file: FileStatusResponse;
  onDismiss: () => void;
}): ReactElement {
  const retryMutation = useRetryFile();
  const isFailed = file.parseStatus === 'FAILED';
  const isRetrying = retryMutation.isPending;

  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        {isFailed && !isRetrying ? (
          <XCircle size={16} className="text-red-400 shrink-0" />
        ) : (
          <Loader2 size={16} className="text-amber-500 animate-spin shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm text-slate-300 truncate">{file.filename}</p>
          {isRetrying ? (
            <p className="text-xs text-slate-500">Retrying...</p>
          ) : isFailed ? (
            <p className="text-xs text-red-400 truncate" title={file.parseError ?? undefined}>
              {friendlyError(file.parseError)}
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              {file.parseStatus === 'PARSING'
                ? 'Parsing price list...'
                : 'Detecting supplier format...'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-xs text-slate-500">{timeAgo(file.uploadedAt)}</span>
        {isFailed && !isRetrying && (
          <>
            <button
              onClick={() => retryMutation.mutate(file.fileId)}
              className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onDismiss}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type UploadPhase = 'select' | 'uploading' | 'processing' | 'success' | 'error';

function UploadModal({ onClose }: { onClose: () => void }): ReactElement {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>('select');
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [processingElapsed, setProcessingElapsed] = useState(0);

  const uploadMutation = useUploadFile();
  const fileStatus = useFileStatus(phase === 'processing' ? uploadedFileId : null);
  const isTimedOut = processingElapsed > 30;

  // Focus trap: move focus into modal on mount
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Escape key closes modal (blocked only during uploading)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Escape' && phase !== 'uploading') {
        onClose();
      }
    },
    [onClose, phase],
  );

  // Poll file status and transition on terminal states
  useEffect(() => {
    if (!fileStatus.data) return;
    if (fileStatus.data.parseStatus === 'PARSED' && fileStatus.data.proposalId) {
      setProposalId(fileStatus.data.proposalId);
      setPhase('success');
    }
    if (fileStatus.data.parseStatus === 'FAILED') {
      setParseError(fileStatus.data.parseError ?? null);
      setPhase('error');
    }
  }, [fileStatus.data]);

  // Track elapsed time during processing
  useEffect(() => {
    if (phase !== 'processing') {
      setProcessingElapsed(0);
      return;
    }
    const interval = setInterval(() => setProcessingElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleFileSelect = useCallback((file: File): void => {
    const error = validateFile(file);
    if (error) {
      setValidationError(error.message);
      setSelectedFile(null);
    } else {
      setValidationError(null);
      setSelectedFile(file);
    }
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = useCallback((): void => {
    if (!selectedFile) return;
    setPhase('uploading');
    uploadMutation.mutate(
      { file: selectedFile },
      {
        onSuccess: (response) => {
          setUploadedFileId(response.fileId);
          setPhase('processing');
        },
        onError: () => {
          setPhase('error');
        },
      },
    );
  }, [selectedFile, uploadMutation]);

  const handleRetry = useCallback((): void => {
    handleUpload();
  }, [handleUpload]);

  const handleTryDifferentFile = useCallback((): void => {
    setSelectedFile(null);
    setValidationError(null);
    setParseError(null);
    setPhase('select');
    uploadMutation.reset();
  }, [uploadMutation]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={phase !== 'uploading' ? onClose : undefined}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Upload supplier file"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-100">Upload Supplier File</h3>
          {phase !== 'uploading' && (
            <button
              onClick={onClose}
              aria-label="Close upload dialog"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Phase: SELECT */}
        {phase === 'select' && (
          <>
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              aria-label="File drop zone. Click or drag Excel file to upload."
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-amber-500 bg-amber-900/10'
                  : selectedFile
                    ? 'border-emerald-600 bg-emerald-900/10'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-900/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet size={32} className="text-emerald-400" />
                  <p className="text-sm font-medium text-slate-200">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={32} className="text-slate-500" />
                  <p className="text-sm text-slate-300">
                    Drop an Excel file here, or click to browse
                  </p>
                  <p className="text-xs text-slate-500">.xlsx or .xls files</p>
                </div>
              )}
            </div>

            {/* Validation error */}
            {validationError && (
              <div role="alert" className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle size={14} />
                {validationError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !!validationError}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
          </>
        )}

        {/* Phase: UPLOADING */}
        {phase === 'uploading' && (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 size={20} className="text-amber-500 animate-spin" />
              <p className="text-sm text-slate-300">Uploading {selectedFile?.name}...</p>
            </div>
            <div
              role="progressbar"
              aria-label="Upload progress"
              className="h-2 bg-slate-700 rounded-full overflow-hidden"
            >
              <div className="h-full bg-amber-500 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Phase: PROCESSING */}
        {phase === 'processing' && (
          <div className="py-4">
            {isTimedOut ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <Clock size={40} className="text-amber-400" />
                <p className="text-sm font-medium text-slate-200">Taking longer than expected</p>
                <p className="text-xs text-slate-500">
                  Your file is still being processed. Check back in a moment.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 size={40} className="text-amber-500 animate-spin" />
                <p className="text-sm font-medium text-slate-200">Processing your file...</p>
                <p className="text-xs text-slate-500">
                  {fileStatus.data?.parseStatus === 'PARSING'
                    ? 'Parsing price list...'
                    : 'Detecting supplier format...'}
                </p>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Phase: SUCCESS */}
        {phase === 'success' && (
          <div className="py-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="text-sm font-medium text-slate-200">File uploaded successfully</p>
              <p className="text-xs text-slate-500">
                Your price list has been parsed successfully.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/pricing/proposals/${proposalId}`);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-900/20"
              >
                View Proposal
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Phase: ERROR */}
        {phase === 'error' && (
          <div className="py-4">
            {parseError !== null ? (
              <>
                <ErrorBanner
                  title="Processing failed"
                  message={parseError || 'An unknown error occurred during parsing.'}
                />
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <ErrorBanner
                  title="Upload failed"
                  message={uploadMutation.error?.message ?? 'Please try again.'}
                  onRetry={handleRetry}
                />
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                  <button
                    onClick={handleTryDifferentFile}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Try Different File
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type PricingTab = 'dashboard' | 'configuration' | 'comparison';

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'text-amber-400 border-b-2 border-amber-400'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

export function PricingPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<PricingTab>('dashboard');

  return (
    <div className="space-y-0">
      <div className="flex gap-1 border-b border-slate-700 mb-6">
        <TabButton
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        />
        <TabButton
          label="Configuration"
          active={activeTab === 'configuration'}
          onClick={() => setActiveTab('configuration')}
        />
        <TabButton
          label="Comparison"
          active={activeTab === 'comparison'}
          onClick={() => setActiveTab('comparison')}
        />
      </div>
      {activeTab === 'dashboard' ? (
        <PricingDashboard />
      ) : activeTab === 'configuration' ? (
        <PricingConfiguration />
      ) : (
        <SupplierComparison />
      )}
    </div>
  );
}
