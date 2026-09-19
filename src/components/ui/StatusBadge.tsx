import type { ReactElement } from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'in-transit' | 'delivered' | 'cancelled';
  size?: 'sm' | 'md';
}

const statusColors = {
  pending: 'bg-yellow-400 text-slate-900',
  processing: 'bg-blue-400 text-slate-900',
  'in-transit': 'bg-blue-400 text-slate-900',
  delivered: 'bg-emerald-400 text-slate-900',
  cancelled: 'bg-rose-400 text-white',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps): ReactElement {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`${statusColors[status]} ${sizeClasses} rounded-full font-medium`}>
      {status.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
}
