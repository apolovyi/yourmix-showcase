import type { ReactElement } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'orange';
  className?: string;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-900/30 text-blue-300 border-blue-800',
  green: 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
  amber: 'bg-amber-900/30 text-amber-300 border-amber-800',
  red: 'bg-red-900/30 text-red-300 border-red-800',
  slate: 'bg-slate-700 text-slate-300 border-slate-600',
  orange: 'bg-orange-900/50 text-orange-300 border-orange-800',
};

export function Badge({ children, color = 'blue', className = '' }: BadgeProps): ReactElement {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}
