import type { ReactElement } from 'react';

export function Skeleton({ className = '' }: { className?: string }): ReactElement {
  return (
    <div
      className={`animate-pulse bg-slate-700 rounded ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}

export function SkeletonCard(): ReactElement {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
