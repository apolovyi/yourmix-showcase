import type { ReactElement } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps): ReactElement {
  const hoverClass = hover
    ? 'hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200'
    : '';

  return (
    <div
      className={`bg-slate-800 rounded-xl border border-slate-700/50 ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}
