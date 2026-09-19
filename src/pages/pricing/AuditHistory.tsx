import { useState, type ReactElement } from 'react';
import { Skeleton } from '@/components/ui';
import { useAuditLog } from '@/hooks/queries';
import { formatDateTime } from '@/utils/date';

interface AuditHistoryProps {
  entityType: string;
  entityId: string;
}

function formatChanges(
  oldValue: Record<string, unknown> | null | undefined,
  newValue: Record<string, unknown> | null | undefined,
): string[] {
  if (!oldValue || !newValue) return [];
  const changes: string[] = [];
  for (const key of Object.keys(newValue)) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
      changes.push(`${key}: ${String(oldValue[key] ?? '—')} → ${String(newValue[key] ?? '—')}`);
    }
  }
  return changes;
}

export function AuditHistory({ entityType, entityId }: AuditHistoryProps): ReactElement {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useAuditLog(entityType, entityId, page);

  if (isLoading) {
    return (
      <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4 space-y-2">
        <Skeleton className="h-4 rounded w-full" />
        <Skeleton className="h-4 rounded w-3/4" />
        <Skeleton className="h-4 rounded w-1/2" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
        <p className="text-red-400 text-sm">Failed to load audit log</p>
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
        <p className="text-slate-500 italic text-sm">No changes recorded</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
      <ul className="space-y-2">
        {data.content.map((entry) => {
          const changes = formatChanges(entry.oldValue, entry.newValue);
          return (
            <li key={entry.id} className="text-xs text-slate-300">
              {formatDateTime(entry.createdAt)} · {entry.action} · {entry.userId ?? 'system'}
              {changes.map((change, i) => (
                <span key={i} className="text-slate-500 ml-4 block">
                  {change}
                </span>
              ))}
            </li>
          );
        })}
      </ul>
      {data.totalPages > page + 1 && (
        <button
          type="button"
          className="text-xs text-amber-400 hover:text-amber-300 mt-2"
          onClick={() => setPage((p) => p + 1)}
        >
          Load more
        </button>
      )}
    </div>
  );
}
